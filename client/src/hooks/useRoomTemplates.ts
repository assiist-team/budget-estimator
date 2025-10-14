// Hook to fetch room templates from Firestore database
import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { RoomTemplate } from '../types';

// Function to load room templates from Firestore database
async function loadRoomTemplatesFromFirestore(): Promise<Map<string, RoomTemplate>> {
  try {
    const templatesQuery = query(collection(db, 'roomTemplates'), orderBy('sortOrder'));
    const templatesSnapshot = await getDocs(templatesQuery);
    const templates = new Map<string, RoomTemplate>();

    templatesSnapshot.forEach((doc) => {
      const docData = doc.data();
      templates.set(doc.id, {
        id: doc.id,
        name: docData.name,
        displayName: docData.displayName,
        description: docData.description,
        category: docData.category,
        icon: docData.icon,
        sortOrder: docData.sortOrder,
        sizes: docData.sizes,
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