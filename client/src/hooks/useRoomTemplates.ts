// Hook to fetch room templates from Firestore database
import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { RoomTemplate, Item, RoomSize } from '../types';


// Function to calculate room totals from items
function calculateRoomTotals(items: Map<string, Item>, roomSize: RoomSize): RoomSize {
  const totals = { budget: 0, mid: 0, midHigh: 0, high: 0 };

  roomSize.items.forEach((roomItem) => {
    const item = items.get(roomItem.itemId);
    if (item) {
      totals.budget += item.budgetPrice * roomItem.quantity;
      totals.mid += item.midPrice * roomItem.quantity;
      totals.midHigh += item.midHighPrice * roomItem.quantity;
      totals.high += item.highPrice * roomItem.quantity;
    } else {
      console.warn(`Item ${roomItem.itemId} not found in items collection`);
    }
  });

  return {
    ...roomSize,
    totals,
  };
}

// Function to load room templates from Firestore database
async function loadRoomTemplatesFromFirestore(): Promise<Map<string, RoomTemplate>> {
  try {
    // Load both room templates and items in parallel
    const [templatesSnapshot, itemsSnapshot] = await Promise.all([
      getDocs(query(collection(db, 'roomTemplates'), orderBy('sortOrder'))),
      getDocs(query(collection(db, 'items')))
    ]);

    const items = new Map<string, Item>();
    itemsSnapshot.forEach((doc) => {
      const docData = doc.data();
      items.set(doc.id, {
        id: doc.id,
        name: docData.name,
        category: docData.category,
        subcategory: docData.subcategory,
        budgetPrice: docData.budgetPrice,
        midPrice: docData.midPrice,
        midHighPrice: docData.midHighPrice,
        highPrice: docData.highPrice,
        unit: docData.unit,
        notes: docData.notes,
        createdAt: docData.createdAt?.toDate ? docData.createdAt.toDate() : docData.createdAt,
        updatedAt: docData.updatedAt?.toDate ? docData.updatedAt.toDate() : docData.updatedAt,
      } as Item);
    });

    const templates = new Map<string, RoomTemplate>();

    templatesSnapshot.forEach((doc) => {
      const docData = doc.data();

      // Calculate totals for each room size based on items
      const sizes = {} as any;
      Object.keys(docData.sizes).forEach((sizeKey) => {
        sizes[sizeKey] = calculateRoomTotals(items, docData.sizes[sizeKey]);
      });

      templates.set(doc.id, {
        id: doc.id,
        name: docData.name,
        displayName: docData.displayName,
        description: docData.description,
        category: docData.category,
        icon: docData.icon,
        sortOrder: docData.sortOrder,
        sizes,
        createdAt: docData.createdAt?.toDate ? docData.createdAt.toDate() : docData.createdAt,
        updatedAt: docData.updatedAt?.toDate ? docData.updatedAt.toDate() : docData.updatedAt,
      } as RoomTemplate);
    });

    return templates;
  } catch (error) {
    console.error('Error loading room templates from Firestore:', error);
    throw error;
  }
}

export function useRoomTemplates() {
  const [roomTemplates, setRoomTemplates] = useState<Map<string, RoomTemplate>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchRoomTemplates() {
      try {
        // Load from Firestore database
        const templates = await loadRoomTemplatesFromFirestore();
        setRoomTemplates(templates);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching room templates:', err);
        setError(err as Error);
        setLoading(false);
      }
    }

    fetchRoomTemplates();
  }, []);

  return { roomTemplates, loading, error };
}