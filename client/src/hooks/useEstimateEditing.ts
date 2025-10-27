// Hook for estimate editing functionality
import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, updateDoc, setDoc, query, orderBy, limit, serverTimestamp, where, QueryConstraint } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useRoomTemplates } from './useRoomTemplates';
import type { Estimate, RoomWithItems, EditHistoryEntry } from '../types';
import { calculateEstimate } from '../utils/calculations';
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

        // Convert room data to RoomWithItems format
        const roomsWithItems: RoomWithItems[] = (docData.rooms || []).map((room: any) => {
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

        estimatesData.push({
          id: doc.id,
          ...docData,
          toolId: docData.toolId ?? 'budget-estimator',
          rooms: roomsWithItems,
          createdAt: docData.createdAt?.toDate ? docData.createdAt.toDate() : docData.createdAt,
          updatedAt: docData.updatedAt?.toDate ? docData.updatedAt.toDate() : docData.updatedAt,
          submittedAt: docData.submittedAt?.toDate ? docData.submittedAt.toDate() : docData.submittedAt,
          lastViewedAt: docData.lastViewedAt?.toDate ? docData.lastViewedAt.toDate() : docData.lastViewedAt,
          editHistory: docData.editHistory?.map((entry: any) => ({
            ...entry,
            timestamp: entry.timestamp?.toDate ? entry.timestamp.toDate() : entry.timestamp
          }))
        } as unknown as Estimate);
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
      setEstimate(foundEstimate);
      // Initialize history with the loaded estimate
      setHistory([foundEstimate]);
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
    updatedRooms[roomIndex] = updatedRoom;

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

    const updatedRooms = [...estimate.rooms, newRoom];
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

    const success = await updateEstimate(estimate.id, {
      rooms: estimate.rooms,
      lastEditedAt: new Date(),
      editHistory: estimate.editHistory
    });

    if (success) {
      setHasUnsavedChanges(false);
    }

    return success;
  }, [estimate, hasUnsavedChanges, updateEstimate]);

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
    redo
  };
}
