/**
 * Utilities for working with room instances.
 * 
 * This module provides functions to convert between the legacy room format
 * (RoomWithItems with quantity) and the new instance-based format (RoomInstance[]).
 */

import type { RoomInstance, RoomWithItems } from '../types';

/**
 * Generate a deterministic instance ID for a room.
 * Format: {roomType}_{index} (e.g., "single_bedroom_1", "single_bedroom_2")
 */
function generateInstanceId(roomType: string, index: number): string {
  return `${roomType}_${index}`;
}

/**
 * Generate a display name for a room instance.
 * For the first instance, uses the original displayName.
 * For subsequent instances, appends the instance number.
 */
function generateInstanceDisplayName(displayName: string, index: number, total: number): string {
  if (total === 1) {
    return displayName;
  }
  // Extract base name (remove any existing number suffix)
  const baseName = displayName.replace(/\s+\d+$/, '');
  return `${baseName} ${index + 1}`;
}

/**
 * Check if a room is in legacy format (quantity > 1 or missing instanceId).
 */
export function isLegacyRoom(room: RoomWithItems | RoomInstance): boolean {
  // If it has instanceId, it's already an instance
  if ('instanceId' in room && room.instanceId) {
    return false;
  }
  
  // If quantity > 1, it's legacy
  if ('quantity' in room && room.quantity > 1) {
    return true;
  }
  
  // If quantity is 1 but no instanceId, it's legacy (needs conversion)
  return !('instanceId' in room);
}

/**
 * Expand a room with quantity > 1 into multiple RoomInstance objects.
 * Each instance will have quantity: 1 and a unique instanceId.
 * 
 * @param room - Room to expand
 * @returns Array of RoomInstance objects
 */
export function expandRoomQuantities(room: RoomWithItems): RoomInstance[] {
  const quantity = room.quantity || 1;
  const instances: RoomInstance[] = [];

  for (let i = 0; i < quantity; i++) {
    const instanceId = room.instanceId && quantity === 1 
      ? room.instanceId 
      : generateInstanceId(room.roomType, i + 1);
    
      instances.push({
        instanceId,
        roomType: room.roomType,
        roomSize: room.roomSize,
        items: room.items || [],
        displayName: generateInstanceDisplayName(room.displayName, i, quantity),
        position: i,
        quantity: 1 as const, // Always 1 for instances
      });
  }

  return instances;
}

/**
 * Convert an array of rooms (legacy or instances) to RoomInstance[].
 * Legacy rooms with quantity > 1 will be expanded.
 * 
 * @param rooms - Array of rooms (can be mixed legacy and instances)
 * @returns Array of RoomInstance objects
 */
export function normalizeToRoomInstances(
  rooms: (RoomWithItems | RoomInstance)[]
): RoomInstance[] {
  const instances: RoomInstance[] = [];

  for (const room of rooms) {
    if (isLegacyRoom(room)) {
      // Expand legacy room
      const expanded = expandRoomQuantities(room as RoomWithItems);
      instances.push(...expanded);
    } else {
      // Already an instance, but ensure quantity is 1
      const instance = room as RoomInstance;
      instances.push({
        ...instance,
        quantity: 1,
      });
    }
  }

  return instances;
}

/**
 * Summarize an array of RoomInstance objects back into RoomWithItems[] format.
 * Groups instances by roomType and roomSize, summing quantities.
 * 
 * Note: This loses individual instance information and should only be used
 * for backward compatibility or display purposes.
 * 
 * @param instances - Array of RoomInstance objects
 * @returns Array of RoomWithItems grouped by type and size
 */
export function summarizeRoomInstances(instances: RoomInstance[]): RoomWithItems[] {
  // Group instances by roomType and roomSize
  const grouped = new Map<string, RoomInstance[]>();
  
  for (const instance of instances) {
    const key = `${instance.roomType}_${instance.roomSize}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(instance);
  }

  // Convert groups to RoomWithItems
  const summarized: RoomWithItems[] = [];
  
  for (const [key, groupInstances] of grouped.entries()) {
    if (groupInstances.length === 0) continue;
    
    const firstInstance = groupInstances[0];
    const quantity = groupInstances.length;
    
    // Use the first instance's items (assuming all instances of same type/size have same items)
    // In practice, items might differ, so we take the first instance's items
    summarized.push({
      roomType: firstInstance.roomType,
      roomSize: firstInstance.roomSize,
      quantity,
      displayName: firstInstance.displayName, // Use first instance's display name
      items: firstInstance.items,
      instanceId: firstInstance.instanceId, // Keep first instance ID for reference
    });
  }

  return summarized;
}

/**
 * Check if an estimate's rooms array contains legacy rooms.
 */
export function hasLegacyRooms(
  rooms: RoomInstance[] | RoomWithItems[]
): boolean {
  if (rooms.length === 0) return false;
  
  // Check each room to see if it's legacy
  return rooms.some(room => isLegacyRoom(room));
}

/**
 * Convert an estimate's rooms to RoomInstance[] format.
 * Handles both legacy and instance formats.
 */
export function convertEstimateRoomsToInstances(
  rooms: RoomInstance[] | RoomWithItems[]
): RoomInstance[] {
  return normalizeToRoomInstances(rooms);
}

