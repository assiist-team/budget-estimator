// Hook to fetch room templates from local JSON file (for development/testing)
import { useState, useEffect } from 'react';
import type { RoomTemplate } from '../types';

// Temporary function to load room templates from local JSON file
async function loadRoomTemplatesFromFile(): Promise<Map<string, RoomTemplate>> {
  try {
    const response = await fetch('/roomTemplates.json');
    const templatesArray = await response.json();
    const templates = new Map<string, RoomTemplate>();

    templatesArray.forEach((template: any) => {
      templates.set(template.id, {
        id: template.id,
        name: template.name,
        displayName: template.displayName,
        description: template.description,
        category: template.category,
        icon: template.icon,
        sortOrder: template.sortOrder,
        sizes: template.sizes,
        createdAt: new Date(template.createdAt),
        updatedAt: new Date(template.updatedAt),
      } as RoomTemplate);
    });

    return templates;
  } catch (error) {
    console.error('Error loading room templates from file:', error);
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
        // Load from local JSON file for development/testing
        const templates = await loadRoomTemplatesFromFile();
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