import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEstimateEditor } from '../hooks/useEstimateEditing';
import { useRoomTemplates } from '../hooks/useRoomTemplates';
import { useBudgetDefaultsStore } from '../store/budgetDefaultsStore';
import Header from '../components/Header';
import { UndoIcon, RedoIcon, TrashIcon } from '../components/Icons';
import type { RoomWithItems, RoomTemplate, Item } from '../types';
import { formatCurrency, calculateEstimate } from '../utils/calculations';

export default function EstimateEditPage() {
  const navigate = useNavigate();
  const { estimateId } = useParams<{ estimateId: string }>();
  const { estimate, loading, error, hasUnsavedChanges, canUndo, canRedo, updateRoom, removeRoom, saveChanges, undo, redo } = useEstimateEditor(estimateId);
  const { roomTemplates, items } = useRoomTemplates();
  const [saving, setSaving] = useState(false);
  const [isClientInfoExpanded, setIsClientInfoExpanded] = useState(false);
  const [isPropertySpecsExpanded, setIsPropertySpecsExpanded] = useState(false);

  // Convert arrays to Maps for calculation functions
  const roomTemplatesMap = useMemo(() => {
    const map = new Map<string, RoomTemplate>();
    roomTemplates.forEach(template => map.set(template.id, template));
    return map;
  }, [roomTemplates]);

  const itemsMap = useMemo(() => {
    const map = new Map<string, Item>();
    items.forEach(item => map.set(item.id, item));
    return map;
  }, [items]);

  const { defaults: budgetDefaults, loadDefaults } = useBudgetDefaultsStore();

  useEffect(() => {
    if (!budgetDefaults) {
      void loadDefaults();
    }
  }, [budgetDefaults, loadDefaults]);

  // Redirect if no estimate loaded
  useEffect(() => {
    if (!loading && !estimate && !error) {
      navigate('/admin');
    }
  }, [loading, estimate, error, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading estimate...</p>
        </div>
      </div>
    );
  }

  if (error || !estimate) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg">Error: {error || 'Estimate not found'}</p>
          <button
            onClick={() => navigate('/admin')}
            className="btn-primary mt-4"
          >
            Back to Admin
          </button>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    const success = await saveChanges();
    setSaving(false);

    if (success) {
      alert('Estimate saved successfully!');
    } else {
      alert('Failed to save estimate. Please try again.');
    }
  };

  const calculateBudgetRange = useCallback((rooms: RoomWithItems[]) => {
    const options = estimate?.propertySpecs && budgetDefaults
      ? { propertySpecs: estimate.propertySpecs, budgetDefaults }
      : undefined;
    const budget = calculateEstimate(rooms, roomTemplatesMap, itemsMap, options);
    if ('projectRange' in budget) {
      return `${formatCurrency(budget.projectRange.low)} — ${formatCurrency(budget.projectRange.mid)}`;
    }
    return `${formatCurrency(budget.rangeLow)} — ${formatCurrency(budget.rangeHigh)}`;
  }, [roomTemplatesMap, itemsMap, estimate?.propertySpecs, budgetDefaults]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header currentStep={0} totalSteps={0} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Sticky Controls Container */}
        <div className="sticky top-0 z-10 bg-gray-50 pt-4 pb-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/admin')}
                className="btn-secondary"
              >
                ← Back
              </button>
            </div>

            <div className="flex gap-3">
              {hasUnsavedChanges && (
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full">
                  Unsaved Changes
                </span>
              )}

              <div className="flex gap-2">
                <button
                  onClick={undo}
                  disabled={!canUndo}
                  className="btn-secondary disabled:opacity-50"
                  title="Undo (Ctrl+Z)"
                >
                  <UndoIcon />
                </button>
                <button
                  onClick={redo}
                  disabled={!canRedo}
                  className="btn-secondary disabled:opacity-50"
                  title="Redo (Ctrl+Y)"
                >
                  <RedoIcon />
                </button>
              </div>

              <button
                onClick={handleSave}
                disabled={saving || !hasUnsavedChanges}
                className="btn-primary disabled:opacity-50"
              >
                {saving ? '💾 Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>

        {/* Sticky Budget Summary */}
        <div className="sticky top-16 z-10 mb-8 bg-gradient-to-br from-primary-600 to-primary-900 text-white rounded-xl shadow-md p-4 sm:p-6">
          <div className="text-center">
            <p className="text-base sm:text-lg font-medium mb-2 sm:mb-3 opacity-90">
              PROJECT BUDGET TOTAL
            </p>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 leading-tight">
              <span className="font-medium">Project Range:</span> {calculateBudgetRange(estimate.rooms)}
            </div>
            <p className="text-xs sm:text-sm opacity-75">
              {estimate.rooms.length} room{estimate.rooms.length !== 1 ? 's' : ''} • {estimate.rooms.reduce((total, room) => total + room.quantity, 0)} items
            </p>
          </div>
        </div>

        {/* Property Info - Displayed as cards instead of tabs */}
        <div className="mb-8">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className={`flex items-center gap-3 ${isClientInfoExpanded ? 'mb-4' : 'mb-0'}`}>
                <button
                  onClick={() => setIsClientInfoExpanded(!isClientInfoExpanded)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  {isClientInfoExpanded ? '▼' : '▶'}
                </button>
                <h3 className="text-lg font-medium text-gray-900">Client Information</h3>
              </div>
              {isClientInfoExpanded && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <p className="text-gray-900">{estimate.clientInfo.firstName} {estimate.clientInfo.lastName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="text-gray-900">{estimate.clientInfo.email}</p>
                  </div>
                  {estimate.clientInfo.phone && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone</label>
                      <p className="text-gray-900">{estimate.clientInfo.phone}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className={`flex items-center gap-3 ${isPropertySpecsExpanded ? 'mb-4' : 'mb-0'}`}>
                <button
                  onClick={() => setIsPropertySpecsExpanded(!isPropertySpecsExpanded)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  {isPropertySpecsExpanded ? '▼' : '▶'}
                </button>
                <h3 className="text-lg font-medium text-gray-900">Property Specifications</h3>
              </div>
              {isPropertySpecsExpanded && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Square Footage</label>
                    <p className="text-gray-900">{estimate.propertySpecs.squareFootage.toLocaleString()} sqft</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Guest Capacity</label>
                    <p className="text-gray-900">{estimate.propertySpecs.guestCapacity} guests</p>
                  </div>
                  {estimate.propertySpecs.notes && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Notes</label>
                      <p className="text-gray-900">{estimate.propertySpecs.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Rooms & Items Editing Area */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            {estimate.rooms.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 text-lg">No rooms in this estimate</p>
                <button className="btn-primary mt-4">Add Room</button>
              </div>
            ) : (
              <div className="space-y-6">
                {estimate.rooms.map((room, roomIndex) => (
                  <RoomEditor
                    key={`${room.roomType}-${roomIndex}`}
                    room={room}
                    roomIndex={roomIndex}
                    roomTemplates={roomTemplates}
                    onUpdate={(updatedRoom) => updateRoom(roomIndex, updatedRoom)}
                    onRemove={() => removeRoom(roomIndex)}
                    onQuantityChange={(newQuantity) => {
                      const updatedRoom = { ...room, quantity: newQuantity };
                      updateRoom(roomIndex, updatedRoom);
                    }}
                  />
                ))}

                <div className="pt-4 border-t border-gray-200">
                  <button className="btn-secondary">
                    ➕ Add Room
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// Room Editor Component
interface RoomEditorProps {
  room: RoomWithItems;
  roomIndex: number;
  roomTemplates: Map<string, RoomTemplate>;
  onUpdate: (room: RoomWithItems) => void;
  onRemove: () => void;
  onQuantityChange: (newQuantity: number) => void;
}

function RoomEditor({ room, roomIndex, roomTemplates, onUpdate, onRemove, onQuantityChange }: RoomEditorProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isSizeDropdownOpen, setIsSizeDropdownOpen] = useState(false);
  const sizeDropdownRef = useRef<HTMLDivElement>(null);
  const template = roomTemplates.get(room.roomType);

  const handleSizeChange = (newSize: 'small' | 'medium' | 'large') => {
    // Update room size and items based on the new size template
    const templateForNewSize = template?.sizes[newSize];
    const updatedRoom = {
      ...room,
      roomSize: newSize,
      // Update items to match the new room size template
      items: templateForNewSize?.items || room.items
    };
    onUpdate(updatedRoom);
    setIsSizeDropdownOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sizeDropdownRef.current && !sizeDropdownRef.current.contains(event.target as Node)) {
        setIsSizeDropdownOpen(false);
      }
    };

    if (isSizeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isSizeDropdownOpen]);

  return (
    <div className="border border-gray-200 rounded-lg">
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-500 hover:text-gray-700"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
            <div className="flex items-center gap-3">
              <h3 className="font-medium text-gray-900">
                {room.displayName || room.roomType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </h3>
              <div className="relative" ref={sizeDropdownRef}>
                <button
                  onClick={() => setIsSizeDropdownOpen(!isSizeDropdownOpen)}
                  className="flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium text-gray-700 transition-colors"
                >
                  <span>{room.roomSize.charAt(0).toUpperCase() + room.roomSize.slice(1)}</span>
                  <svg
                    className={`w-3 h-3 transition-transform ${isSizeDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isSizeDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-32 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                    <div className="py-1">
                      {(['small', 'medium', 'large'] as const).map((size) => (
                        <button
                          key={size}
                          onClick={() => handleSizeChange(size)}
                          className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                            room.roomSize === size ? 'bg-gray-50 text-gray-900 font-medium' : 'text-gray-700'
                          }`}
                        >
                          {size.charAt(0).toUpperCase() + size.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onQuantityChange(Math.max(1, room.quantity - 1))}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                −
              </button>
              <span className="text-sm font-medium text-gray-900 w-8 text-center">
                {room.quantity}
              </span>
              <button
                onClick={() => onQuantityChange(room.quantity + 1)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                +
              </button>
            </div>

            <button
              onClick={onRemove}
              className="text-sm text-red-600 hover:text-red-800 p-1"
            >
              <TrashIcon />
            </button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4">
          <div className="space-y-3">
            {room.items.map((roomItem, itemIndex) => (
              <ItemRow
                key={itemIndex}
                roomItem={roomItem}
                roomIndex={roomIndex}
                itemIndex={itemIndex}
                onRemove={() => {
                  const updatedItems = room.items.filter((_, i) => i !== itemIndex);
                  onUpdate({ ...room, items: updatedItems });
                }}
                onQuantityChange={(newQuantity: number) => {
                  const updatedItems = [...room.items];
                  updatedItems[itemIndex] = { ...roomItem, quantity: newQuantity };
                  onUpdate({ ...room, items: updatedItems });
                }}
              />
            ))}

            <button className="text-sm text-primary-600 hover:text-primary-800 flex items-center gap-2">
              ➕ Add Item
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Item Row Component
interface ItemRowProps {
  roomItem: any;
  roomIndex: number;
  itemIndex: number;
  onRemove: () => void;
  onQuantityChange: (newQuantity: number) => void;
}

function ItemRow({ roomItem, onRemove, onQuantityChange }: ItemRowProps) {
  return (
    <div className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
      <div className="flex-1">
        <span className="text-gray-700">
          {roomItem.name || roomItem.itemId.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
        </span>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onQuantityChange(Math.max(1, roomItem.quantity - 1))}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            −
          </button>
          <span className="text-sm font-medium text-gray-900 w-8 text-center">
            {roomItem.quantity}
          </span>
          <button
            onClick={() => onQuantityChange(roomItem.quantity + 1)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            +
          </button>
        </div>

        <button
          onClick={onRemove}
          className="text-sm text-red-600 hover:text-red-800 p-1"
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  );
}
