// Hook for estimate editing functionality
import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, updateDoc, setDoc, query, orderBy, limit, serverTimestamp, where, QueryConstraint } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useRoomTemplates } from './useRoomTemplates';
import type { Estimate, RoomWithItems, RoomInstance, EditHistoryEntry } from '../types';
import { calculateEstimate, createOutdoorSpaceRoom } from '../utils/calculations';
import { convertEstimateRoomsToInstances } from '../utils/roomInstances';
import { useAuth } from '../context/AuthContext';

/**
 * Hook for loading and managing estimates with complete item mappings
 */
export function useEstimateEditing() {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { roomTemplates, items } = useRoomTemplates();
  const { firebaseUser, isAdmin, loading: authLoading } = useAuth();

  // Load estimates from Firestore
  const loadEstimates = useCallback(async () => {
    if (authLoading) {
      return;
    }

    if (!firebaseUser) {
      setEstimates([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const queryConstraints: QueryConstraint[] = [
        where('toolId', '==', 'budget-estimator'),
      ];

      if (!isAdmin) {
        queryConstraints.push(where('ownerUid', '==', firebaseUser.uid));
      }
      
      queryConstraints.push(orderBy('createdAt', 'desc'));
      queryConstraints.push(limit(50));
      
      const estimatesQuery = query(
        collection(db, 'estimates'),
        ...queryConstraints
      );

      const estimatesSnapshot = await getDocs(estimatesQuery);
      const estimatesData: Estimate[] = [];

      estimatesSnapshot.forEach((doc) => {
        const docData = doc.data();

        // Convert room data to RoomWithItems format first (for legacy compatibility)
        let roomsWithItems: RoomWithItems[] = (docData.rooms || []).map((room: any) => {
          // If room already has items, use them
          if (room.items) {
            return room as RoomWithItems;
          }

          // Otherwise, reconstruct items from room template
          const template = roomTemplates.get(room.roomType);
          if (template && room.roomSize && template.sizes[room.roomSize as keyof typeof template.sizes]) {
            return {
              ...room,
              items: template.sizes[room.roomSize as keyof typeof template.sizes].items
            };
          }

          // Fallback: empty items array
          return {
            ...room,
            items: []
          };
        });

        // For project budgets (estimates with propertySpecs), ensure Outdoor Space room exists
        if (docData.propertySpecs) {
          const hasOutdoorSpace = roomsWithItems.some(room => room.roomType === 'outdoor_space');
          if (!hasOutdoorSpace) {
            roomsWithItems.push(createOutdoorSpaceRoom());
          }
        }

        // Normalize to RoomInstance[] format (handles legacy rooms with quantity > 1)
        const rooms: RoomInstance[] = convertEstimateRoomsToInstances(roomsWithItems);

        estimatesData.push({
          id: doc.id,
          ...docData,
          toolId: docData.toolId ?? 'budget-estimator',
          rooms, // Always RoomInstance[]
          createdAt: docData.createdAt?.toDate ? docData.createdAt.toDate() : docData.createdAt,
          updatedAt: docData.updatedAt?.toDate ? docData.updatedAt.toDate() : docData.updatedAt,
          submittedAt: docData.submittedAt?.toDate ? docData.submittedAt.toDate() : docData.submittedAt,
          lastViewedAt: docData.lastViewedAt?.toDate ? docData.lastViewedAt.toDate() : docData.lastViewedAt,
          editHistory: docData.editHistory?.map((entry: any) => ({
            ...entry,
            timestamp: entry.timestamp?.toDate ? entry.timestamp.toDate() : entry.timestamp
          }))
        } as Estimate);
      });

      setEstimates(estimatesData);
    } catch (err) {
      console.error('Error loading estimates:', err);
      setError(err instanceof Error ? err.message : 'Failed to load estimates');
    } finally {
      setLoading(false);
    }
  }, [roomTemplates, firebaseUser, isAdmin, authLoading]);

  // Update estimate in Firestore
  const updateEstimate = useCallback(async (estimateId: string, updates: Partial<Estimate>) => {
    try {
      const estimateRef = doc(db, 'estimates', estimateId);

      // Add edit history entry
      const editHistoryEntry: EditHistoryEntry = {
        timestamp: new Date(),
        action: 'room_items_modified' as const,
        details: { updatedFields: Object.keys(updates) }
      };

      const updateData = {
        ...updates,
        updatedAt: serverTimestamp(),
        lastEditedAt: serverTimestamp(),
        editHistory: [
          ...(updates.editHistory || []),
          editHistoryEntry
        ]
      };

      try {
        // Try to update the document first
        await updateDoc(estimateRef, updateData);
      } catch (updateErr: any) {
        // If the document doesn't exist, create it
        if (updateErr?.message?.includes('No document to update')) {
          console.log('Document does not exist, creating new document');
          await setDoc(estimateRef, updateData);
        } else {
          throw updateErr;
        }
      }

      // Update local state
      setEstimates(prev =>
        prev.map(estimate =>
          estimate.id === estimateId
            ? { ...estimate, ...updates, updatedAt: new Date() }
            : estimate
        )
      );

      return true;
    } catch (err) {
      console.error('Error updating estimate:', err);
      setError(err instanceof Error ? err.message : 'Failed to update estimate');
      return false;
    }
  }, [isAdmin, firebaseUser]);

  useEffect(() => {
    loadEstimates();
  }, [loadEstimates]);

  return {
    estimates,
    loading,
    error,
    loadEstimates,
    updateEstimate,
    roomTemplates,
    items
  };
}

/**
 * Hook for managing a single estimate in editing mode
 */
export function useEstimateEditor(estimateId?: string) {
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [history, setHistory] = useState<Estimate[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const { estimates, updateEstimate, roomTemplates, items } = useEstimateEditing();

  // Load specific estimate for editing
  useEffect(() => {
    if (!estimateId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Find estimate in loaded estimates
    const foundEstimate = estimates.find(e => e.id === estimateId);
    if (foundEstimate) {
      // For project budgets, ensure Outdoor Space room exists
      let processedEstimate = foundEstimate;
      if (foundEstimate.propertySpecs) {
        const hasOutdoorSpace = foundEstimate.rooms.some(room => room.roomType === 'outdoor_space');
        if (!hasOutdoorSpace) {
          const outdoorSpaceRoom = createOutdoorSpaceRoom();
          const outdoorSpaceInstance = convertEstimateRoomsToInstances([outdoorSpaceRoom])[0];
          processedEstimate = {
            ...foundEstimate,
            rooms: [...foundEstimate.rooms, outdoorSpaceInstance]
          };
        }
      }
      
      setEstimate(processedEstimate);
      // Initialize history with the processed estimate
      setHistory([processedEstimate]);
      setHistoryIndex(0);
      setHasUnsavedChanges(false);
      setLoading(false);
    } else {
      setError('Estimate not found');
      setLoading(false);
    }
  }, [estimateId, estimates]);

  // Add change to history
  const addToHistory = useCallback((newEstimate: Estimate) => {
    setHistory(prev => {
      // Remove any history after current index (when undoing)
      const newHistory = prev.slice(0, historyIndex + 1);
      // Add new state
      newHistory.push(newEstimate);
      // Keep only last 10 states for memory management
      return newHistory.slice(-10);
    });
    setHistoryIndex(prev => Math.min(prev + 1, 9));
    setHasUnsavedChanges(true);
  }, [historyIndex]);

  // Update room in estimate
  const updateRoom = useCallback((roomIndex: number, updatedRoom: RoomWithItems) => {
    if (!estimate) return;

    const updatedRooms = [...estimate.rooms];
    // Convert RoomWithItems to RoomInstance if needed
    const roomInstance: RoomInstance = updatedRoom.instanceId 
      ? { ...updatedRoom, instanceId: updatedRoom.instanceId, quantity: 1 }
      : convertEstimateRoomsToInstances([updatedRoom])[0];
    updatedRooms[roomIndex] = roomInstance;

    const updatedEstimate = {
      ...estimate,
      rooms: updatedRooms,
      budget: calculateEstimate(updatedRooms, roomTemplates, items),
      lastEditedAt: new Date(),
      editHistory: [
        ...(estimate.editHistory || []),
        {
          timestamp: new Date(),
          action: 'room_items_modified' as const,
          details: { roomIndex, change: 'room_updated' }
        }
      ]
    };

    setEstimate(updatedEstimate);
    addToHistory(updatedEstimate);
  }, [estimate, roomTemplates, addToHistory]);

  // Add room to estimate
  const addRoom = useCallback((newRoom: RoomWithItems) => {
    if (!estimate) return;

    // Convert RoomWithItems to RoomInstance
    const roomInstance = convertEstimateRoomsToInstances([newRoom])[0];
    const updatedRooms = [...estimate.rooms, roomInstance];
    const updatedEstimate = {
      ...estimate,
      rooms: updatedRooms,
      budget: calculateEstimate(updatedRooms, roomTemplates, items),
      lastEditedAt: new Date(),
      editHistory: [
        ...(estimate.editHistory || []),
        {
          timestamp: new Date(),
          action: 'room_added' as const,
          details: { roomType: newRoom.roomType, roomSize: newRoom.roomSize }
        }
      ]
    };

    setEstimate(updatedEstimate);
    addToHistory(updatedEstimate);
  }, [estimate, roomTemplates, addToHistory]);

  // Remove room from estimate
  const removeRoom = useCallback((roomIndex: number) => {
    if (!estimate) return;

    const updatedRooms = estimate.rooms.filter((_, index) => index !== roomIndex);
    const updatedEstimate = {
      ...estimate,
      rooms: updatedRooms,
      budget: calculateEstimate(updatedRooms, roomTemplates, items),
      lastEditedAt: new Date(),
      editHistory: [
        ...(estimate.editHistory || []),
        {
          timestamp: new Date(),
          action: 'room_removed' as const,
          details: { roomIndex, roomType: estimate.rooms[roomIndex]?.roomType }
        }
      ]
    };

    setEstimate(updatedEstimate);
    addToHistory(updatedEstimate);
  }, [estimate, roomTemplates, addToHistory]);

  // Undo last change
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const previousIndex = historyIndex - 1;
      setHistoryIndex(previousIndex);
      setEstimate(history[previousIndex]);
      setHasUnsavedChanges(true);
    }
  }, [history, historyIndex]);

  // Redo last undone change
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setEstimate(history[nextIndex]);
      setHasUnsavedChanges(true);
    }
  }, [history, historyIndex]);

  // Check if undo/redo are available
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Save changes to Firestore
  const saveChanges = useCallback(async () => {
    if (!estimate || !hasUnsavedChanges) return false;

    const updates: Partial<Estimate> = {
      rooms: estimate.rooms,
      lastEditedAt: new Date(),
      editHistory: estimate.editHistory,
      customRangeEnabled: estimate.customRangeEnabled,
      customRangeLowPercent: estimate.customRangeLowPercent,
      customRangeHighPercent: estimate.customRangeHighPercent
    };

    // Only include customProjectAddOns if it is defined to avoid sending `undefined` to Firestore
    if (estimate.customProjectAddOns !== undefined) {
      updates.customProjectAddOns = estimate.customProjectAddOns;
    }

    const success = await updateEstimate(estimate.id, updates);

    if (success) {
      setHasUnsavedChanges(false);
    }

    return success;
  }, [estimate, hasUnsavedChanges, updateEstimate]);

  // Update estimate settings (like custom range)
  const updateEstimateSettings = useCallback((updates: Partial<Estimate>) => {
    if (!estimate) return;

    const updatedEstimate = {
      ...estimate,
      ...updates,
      lastEditedAt: new Date(),
      editHistory: [
        ...(estimate.editHistory || []),
        {
          timestamp: new Date(),
          action: 'room_items_modified' as const,
          details: { updatedFields: Object.keys(updates) }
        }
      ]
    };

    setEstimate(updatedEstimate);
    addToHistory(updatedEstimate);
  }, [estimate, addToHistory]);

  return {
    estimate,
    loading,
    error,
    hasUnsavedChanges,
    canUndo,
    canRedo,
    updateRoom,
    addRoom,
    removeRoom,
    saveChanges,
    undo,
    redo,
    updateEstimate: updateEstimateSettings
  };
}
