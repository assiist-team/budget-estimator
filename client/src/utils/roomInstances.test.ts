import { describe, it, expect } from 'vitest';
import type { RoomInstance, RoomWithItems } from '../types';
import {
  expandRoomQuantities,
  summarizeRoomInstances,
  normalizeToRoomInstances,
  isLegacyRoom,
  hasLegacyRooms,
  convertEstimateRoomsToInstances,
} from './roomInstances';

describe('roomInstances utilities', () => {
  describe('isLegacyRoom', () => {
    it('should identify legacy room with quantity > 1', () => {
      const room: RoomWithItems = {
        roomType: 'single_bedroom',
        roomSize: 'medium',
        quantity: 3,
        displayName: 'Medium Single Bedroom',
        items: [],
      };
      expect(isLegacyRoom(room)).toBe(true);
    });

    it('should identify legacy room with quantity 1 but no instanceId', () => {
      const room: RoomWithItems = {
        roomType: 'living_room',
        roomSize: 'large',
        quantity: 1,
        displayName: 'Large Living Room',
        items: [],
      };
      expect(isLegacyRoom(room)).toBe(true);
    });

    it('should identify instance room with instanceId', () => {
      const room: RoomInstance = {
        instanceId: 'single_bedroom_1',
        roomType: 'single_bedroom',
        roomSize: 'medium',
        displayName: 'Medium Single Bedroom',
        items: [],
        quantity: 1,
      };
      expect(isLegacyRoom(room)).toBe(false);
    });
  });

  describe('expandRoomQuantities', () => {
    it('should expand room with quantity 3 into 3 instances', () => {
      const room: RoomWithItems = {
        roomType: 'single_bedroom',
        roomSize: 'medium',
        quantity: 3,
        displayName: 'Medium Single Bedroom',
        items: [
          { itemId: 'item1', quantity: 2 },
          { itemId: 'item2', quantity: 1 },
        ],
      };

      const instances = expandRoomQuantities(room);

      expect(instances).toHaveLength(3);
      expect(instances[0]).toMatchObject({
        instanceId: 'single_bedroom_1',
        roomType: 'single_bedroom',
        roomSize: 'medium',
        displayName: 'Medium Single Bedroom 1',
        quantity: 1,
        items: room.items,
        position: 0,
      });
      expect(instances[1]).toMatchObject({
        instanceId: 'single_bedroom_2',
        displayName: 'Medium Single Bedroom 2',
        position: 1,
      });
      expect(instances[2]).toMatchObject({
        instanceId: 'single_bedroom_3',
        displayName: 'Medium Single Bedroom 3',
        position: 2,
      });
    });

    it('should handle room with quantity 1', () => {
      const room: RoomWithItems = {
        roomType: 'living_room',
        roomSize: 'large',
        quantity: 1,
        displayName: 'Large Living Room',
        items: [],
      };

      const instances = expandRoomQuantities(room);

      expect(instances).toHaveLength(1);
      expect(instances[0]).toMatchObject({
        instanceId: 'living_room_1',
        displayName: 'Large Living Room', // No number suffix for single instance
        quantity: 1,
      });
    });

    it('should preserve existing instanceId if quantity is 1', () => {
      const room: RoomWithItems = {
        roomType: 'kitchen',
        roomSize: 'large',
        quantity: 1,
        displayName: 'Large Kitchen',
        items: [],
        instanceId: 'custom_kitchen_id',
      };

      const instances = expandRoomQuantities(room);

      expect(instances).toHaveLength(1);
      expect(instances[0].instanceId).toBe('custom_kitchen_id');
    });
  });

  describe('normalizeToRoomInstances', () => {
    it('should convert legacy rooms to instances', () => {
      const rooms: RoomWithItems[] = [
        {
          roomType: 'single_bedroom',
          roomSize: 'medium',
          quantity: 2,
          displayName: 'Medium Single Bedroom',
          items: [],
        },
        {
          roomType: 'living_room',
          roomSize: 'large',
          quantity: 1,
          displayName: 'Large Living Room',
          items: [],
        },
      ];

      const instances = normalizeToRoomInstances(rooms);

      expect(instances).toHaveLength(3); // 2 bedrooms + 1 living room
      expect(instances[0].instanceId).toBe('single_bedroom_1');
      expect(instances[1].instanceId).toBe('single_bedroom_2');
      expect(instances[2].instanceId).toBe('living_room_1');
    });

    it('should handle mixed legacy and instance rooms', () => {
      const rooms: (RoomWithItems | RoomInstance)[] = [
        {
          roomType: 'single_bedroom',
          roomSize: 'medium',
          quantity: 2,
          displayName: 'Medium Single Bedroom',
          items: [],
        },
        {
          instanceId: 'living_room_1',
          roomType: 'living_room',
          roomSize: 'large',
          displayName: 'Large Living Room',
          items: [],
          quantity: 1,
        },
      ];

      const instances = normalizeToRoomInstances(rooms);

      expect(instances).toHaveLength(3);
      expect(instances[0].instanceId).toBe('single_bedroom_1');
      expect(instances[1].instanceId).toBe('single_bedroom_2');
      expect(instances[2].instanceId).toBe('living_room_1');
    });

    it('should ensure all instances have quantity 1', () => {
      const rooms: RoomInstance[] = [
        {
          instanceId: 'room_1',
          roomType: 'bedroom',
          roomSize: 'medium',
          displayName: 'Bedroom',
          items: [],
          quantity: 5, // Should be normalized to 1
        },
      ];

      const instances = normalizeToRoomInstances(rooms);

      expect(instances[0].quantity).toBe(1);
    });
  });

  describe('summarizeRoomInstances', () => {
    it('should group instances by roomType and roomSize', () => {
      const instances: RoomInstance[] = [
        {
          instanceId: 'single_bedroom_1',
          roomType: 'single_bedroom',
          roomSize: 'medium',
          displayName: 'Medium Single Bedroom 1',
          items: [{ itemId: 'item1', quantity: 1 }],
          quantity: 1,
        },
        {
          instanceId: 'single_bedroom_2',
          roomType: 'single_bedroom',
          roomSize: 'medium',
          displayName: 'Medium Single Bedroom 2',
          items: [{ itemId: 'item1', quantity: 1 }],
          quantity: 1,
        },
        {
          instanceId: 'single_bedroom_3',
          roomType: 'single_bedroom',
          roomSize: 'large',
          displayName: 'Large Single Bedroom 1',
          items: [{ itemId: 'item2', quantity: 2 }],
          quantity: 1,
        },
        {
          instanceId: 'living_room_1',
          roomType: 'living_room',
          roomSize: 'large',
          displayName: 'Large Living Room',
          items: [],
          quantity: 1,
        },
      ];

      const summarized = summarizeRoomInstances(instances);

      expect(summarized).toHaveLength(3);
      
      // Check medium single bedrooms (quantity 2)
      const mediumBedrooms = summarized.find(
        r => r.roomType === 'single_bedroom' && r.roomSize === 'medium'
      );
      expect(mediumBedrooms?.quantity).toBe(2);
      
      // Check large single bedroom (quantity 1)
      const largeBedroom = summarized.find(
        r => r.roomType === 'single_bedroom' && r.roomSize === 'large'
      );
      expect(largeBedroom?.quantity).toBe(1);
      
      // Check living room (quantity 1)
      const livingRoom = summarized.find(
        r => r.roomType === 'living_room'
      );
      expect(livingRoom?.quantity).toBe(1);
    });

    it('should handle empty array', () => {
      const summarized = summarizeRoomInstances([]);
      expect(summarized).toHaveLength(0);
    });

    it('should preserve items from first instance in group', () => {
      const instances: RoomInstance[] = [
        {
          instanceId: 'bedroom_1',
          roomType: 'bedroom',
          roomSize: 'medium',
          displayName: 'Bedroom 1',
          items: [{ itemId: 'item1', quantity: 1 }],
          quantity: 1,
        },
        {
          instanceId: 'bedroom_2',
          roomType: 'bedroom',
          roomSize: 'medium',
          displayName: 'Bedroom 2',
          items: [{ itemId: 'item2', quantity: 2 }], // Different items
          quantity: 1,
        },
      ];

      const summarized = summarizeRoomInstances(instances);
      const bedroom = summarized.find(r => r.roomType === 'bedroom');
      
      // Should use first instance's items
      expect(bedroom?.items).toEqual([{ itemId: 'item1', quantity: 1 }]);
    });
  });

  describe('hasLegacyRooms', () => {
    it('should detect legacy rooms with quantity > 1', () => {
      const rooms: RoomWithItems[] = [
        {
          roomType: 'bedroom',
          roomSize: 'medium',
          quantity: 3,
          displayName: 'Bedroom',
          items: [],
        },
      ];
      expect(hasLegacyRooms(rooms)).toBe(true);
    });

    it('should detect legacy rooms without instanceId', () => {
      const rooms: RoomWithItems[] = [
        {
          roomType: 'bedroom',
          roomSize: 'medium',
          quantity: 1,
          displayName: 'Bedroom',
          items: [],
        },
      ];
      expect(hasLegacyRooms(rooms)).toBe(true);
    });

    it('should return false for instance rooms', () => {
      const rooms: RoomInstance[] = [
        {
          instanceId: 'bedroom_1',
          roomType: 'bedroom',
          roomSize: 'medium',
          displayName: 'Bedroom',
          items: [],
          quantity: 1,
        },
      ];
      expect(hasLegacyRooms(rooms)).toBe(false);
    });

    it('should return false for empty array', () => {
      expect(hasLegacyRooms([])).toBe(false);
    });
  });

  describe('convertEstimateRoomsToInstances', () => {
    it('should convert legacy rooms to instances', () => {
      const rooms: RoomWithItems[] = [
        {
          roomType: 'bedroom',
          roomSize: 'medium',
          quantity: 2,
          displayName: 'Bedroom',
          items: [],
        },
      ];

      const instances = convertEstimateRoomsToInstances(rooms);
      expect(instances).toHaveLength(2);
      expect(instances[0].instanceId).toBe('bedroom_1');
      expect(instances[1].instanceId).toBe('bedroom_2');
    });

    it('should pass through instance rooms unchanged', () => {
      const rooms: RoomInstance[] = [
        {
          instanceId: 'bedroom_1',
          roomType: 'bedroom',
          roomSize: 'medium',
          displayName: 'Bedroom',
          items: [],
          quantity: 1,
        },
      ];

      const instances = convertEstimateRoomsToInstances(rooms);
      expect(instances).toHaveLength(1);
      expect(instances[0].instanceId).toBe('bedroom_1');
    });
  });

  describe('round-trip conversion', () => {
    it('should preserve totals when expanding and summarizing', () => {
      const originalRooms: RoomWithItems[] = [
        {
          roomType: 'single_bedroom',
          roomSize: 'medium',
          quantity: 3,
          displayName: 'Medium Single Bedroom',
          items: [{ itemId: 'item1', quantity: 2 }],
        },
        {
          roomType: 'living_room',
          roomSize: 'large',
          quantity: 1,
          displayName: 'Large Living Room',
          items: [{ itemId: 'item2', quantity: 1 }],
        },
      ];

      // Expand to instances
      const instances = normalizeToRoomInstances(originalRooms);
      expect(instances).toHaveLength(4);

      // Summarize back
      const summarized = summarizeRoomInstances(instances);
      
      // Should have same room types and sizes
      expect(summarized).toHaveLength(2);
      
      const bedrooms = summarized.find(r => r.roomType === 'single_bedroom');
      expect(bedrooms?.quantity).toBe(3);
      
      const livingRoom = summarized.find(r => r.roomType === 'living_room');
      expect(livingRoom?.quantity).toBe(1);
    });
  });
});

