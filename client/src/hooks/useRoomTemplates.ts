// Hook to fetch room templates from Firestore database
import { useState, useEffect } from 'react';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { RoomTemplate, Item, RoomSize } from '../types';


// Function to calculate room totals from items
function calculateRoomTotals(items: Map<string, Item>, roomSize: RoomSize): RoomSize {
  // Calculate totals from individual items (more accurate than using pre-calculated totals)
  const totals = { low: 0, mid: 0, midHigh: 0, high: 0 };

  const roomItems = Array.isArray(roomSize.items) ? roomSize.items : [];

  roomItems.forEach((roomItem) => {
    const item = items.get(roomItem.itemId);
    if (item) {
      totals.low += (item.lowPrice ?? 0) * roomItem.quantity;
      totals.mid += (item.midPrice ?? 0) * roomItem.quantity;
      totals.midHigh += (item.midHighPrice ?? 0) * roomItem.quantity;
      totals.high += (item.highPrice ?? 0) * roomItem.quantity;
    } else {
      console.warn(`Item ${roomItem.itemId} not found in items collection for room calculation`);
    }
  });

  return {
    ...roomSize,
    totals,
  };
}

// Function to load room templates from Firestore database
async function loadRoomTemplatesFromFirestore(): Promise<{ templates: Map<string, RoomTemplate>; items: Map<string, Item> }> {
  try {
    // Load both room templates and items in parallel
    const [templatesSnapshot, itemsSnapshot] = await Promise.all([
      getDocs(query(collection(db, 'roomTemplates'))),
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
        lowPrice: docData.lowPrice ?? 0,
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
      const sizes: Record<string, RoomSize> = {};
      Object.keys(docData.sizes).forEach((sizeKey) => {
        const sizeData = docData.sizes[sizeKey];
        // Use proper tier names: low, mid, midHigh, high
        const mappedTotals = {
          low: sizeData.totals?.low ?? 0,
          mid: sizeData.totals?.mid ?? 0,
          midHigh: sizeData.totals?.midHigh ?? 0,
          high: sizeData.totals?.high ?? 0,
        };
        sizes[sizeKey] = calculateRoomTotals(items, {
          ...sizeData,
          totals: mappedTotals
        });
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

    return { templates, items };
  } catch (error) {
    console.error('Error loading room templates from Firestore:', error);
    throw error;
  }
}

export function useRoomTemplates() {
  const [roomTemplates, setRoomTemplates] = useState<Map<string, RoomTemplate>>(new Map());
  const [items, setItems] = useState<Map<string, Item>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchRoomTemplates() {
      try {
        // Load from Firestore database
        const { templates, items } = await loadRoomTemplatesFromFirestore();
        setRoomTemplates(templates);
        setItems(items);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching room templates:', err);
        setError(err as Error);
        setLoading(false);
      }
    }

    fetchRoomTemplates();
  }, []);

  return { roomTemplates, items, loading, error };
}