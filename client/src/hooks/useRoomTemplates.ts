// Hook to fetch room templates from Firestore
import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { RoomTemplate } from '../types';

export function useRoomTemplates() {
  const [roomTemplates, setRoomTemplates] = useState<Map<string, RoomTemplate>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchRoomTemplates() {
      try {
        const q = query(
          collection(db, 'roomTemplates'),
          orderBy('sortOrder')
        );
        
        const querySnapshot = await getDocs(q);
        const templates = new Map<string, RoomTemplate>();
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          templates.set(doc.id, {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
          } as RoomTemplate);
        });
        
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