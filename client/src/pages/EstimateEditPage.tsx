import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEstimateEditor } from '../hooks/useEstimateEditing';
import { useRoomTemplates } from '../hooks/useRoomTemplates';
import { useBudgetDefaultsStore } from '../store/budgetDefaultsStore';
import Header from '../components/Header';
import { UndoIcon, RedoIcon, TrashIcon } from '../components/Icons';
import type { RoomWithItems, RoomTemplate, Item, ProjectBudget, Budget } from '../types';
import { formatCurrency, calculateEstimate, calculateTotalRooms, calculateTotalItems } from '../utils/calculations';
import { calculateSelectedRoomCapacity } from '../utils/autoConfiguration';
import { useAutoConfigRules } from '../hooks/useAutoConfiguration';

// Type guard to check if budget is a ProjectBudget
function isProjectBudget(budget: Budget | ProjectBudget | null): budget is ProjectBudget {
  return budget !== null && 'projectRange' in budget;
}

export default function EstimateEditPage() {
  const navigate = useNavigate();
  const { estimateId } = useParams<{ estimateId: string }>();
  const { estimate, loading, error, hasUnsavedChanges, canUndo, canRedo, updateRoom, removeRoom, saveChanges, undo, redo } = useEstimateEditor(estimateId);
  const { roomTemplates, items } = useRoomTemplates();
  const [saving, setSaving] = useState(false);

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
  const { rules: autoConfigRules, loading: rulesLoading } = useAutoConfigRules();

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

  const calculateBudgetBreakdown = useCallback((rooms: RoomWithItems[]) => {
    const options = estimate?.propertySpecs && budgetDefaults
      ? { propertySpecs: estimate.propertySpecs, budgetDefaults }
      : undefined;
    return calculateEstimate(rooms, roomTemplatesMap, itemsMap, options);
  }, [roomTemplatesMap, itemsMap, estimate, budgetDefaults]);

  // Calculate current budget breakdown
  const currentBudget = useMemo(() => {
    if (!estimate?.rooms) return null;
    return calculateBudgetBreakdown(estimate.rooms);
  }, [estimate?.rooms, calculateBudgetBreakdown]);

  const calculateBudgetRange = useCallback((rooms: RoomWithItems[]) => {
    const budget = calculateBudgetBreakdown(rooms);
    if (isProjectBudget(budget)) {
      return `${formatCurrency(budget.projectRange.low)} — ${formatCurrency(budget.projectRange.mid)}`;
    }
    return `${formatCurrency(budget.rangeLow)} — ${formatCurrency(budget.rangeHigh)}`;
  }, [calculateBudgetBreakdown]);

  // Calculate room and item counts for the current estimate
  const totalRooms = useMemo(() => calculateTotalRooms(estimate?.rooms || []), [estimate?.rooms]);
  const totalItems = useMemo(() => calculateTotalItems(estimate?.rooms || [], roomTemplatesMap, itemsMap), [estimate?.rooms, roomTemplatesMap, itemsMap]);

  // Calculate actual capacity of selected rooms
  const actualCapacity = useMemo(() => {
    if (!autoConfigRules || !estimate?.rooms || estimate.rooms.length === 0) return 0;
    const roomData = estimate.rooms.map(room => ({
      roomType: room.roomType,
      quantity: room.quantity,
      roomSize: room.roomSize
    }));
    return calculateSelectedRoomCapacity(roomData, autoConfigRules);
  }, [estimate?.rooms, autoConfigRules]);

  if (loading || rulesLoading) {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header currentStep={0} totalSteps={0} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Sticky Controls Container */}
        <div className="sticky top-0 z-10 bg-gray-50 pt-4 pb-4 mb-6 border-b border-gray-200">
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
        <div className="sticky top-[4.25rem] z-10 mb-8 bg-gradient-to-br from-primary-600 to-primary-900 text-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow duration-200">
          <div className="text-center py-6">
            <p className="text-lg font-medium mb-3 opacity-90">
              ESTIMATED PROJECT BUDGET
            </p>
            <div className="text-5xl font-bold mb-2">
              {calculateBudgetRange(estimate.rooms)}
            </div>
            <p className="text-sm opacity-75 mt-4 mb-2">
              {estimate.propertySpecs.squareFootage.toLocaleString()} sq ft • {estimate.propertySpecs.guestCapacity} requested capacity • {actualCapacity} max capacity • {totalRooms} room{totalRooms !== 1 ? 's' : ''} • {totalItems} item{totalItems !== 1 ? 's' : ''}
            </p>
            <p className="text-xs sm:text-sm opacity-75">
              {estimate.clientInfo.firstName} {estimate.clientInfo.lastName} • {estimate.clientInfo.email}
              {estimate.clientInfo.phone && ` • ${estimate.clientInfo.phone}`}
            </p>
          </div>
        </div>

        {/* Project Budget Breakdown */}
        {isProjectBudget(currentBudget) && (
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow border-2 border-gray-200">
              <div className="w-full text-left">
                <div className="p-6">
                  <div className="mb-6">
                    <span className="text-2xl font-bold text-primary-800">
                      Project Budget Breakdown
                    </span>
                  </div>

                  <div className="space-y-4">
                    {/* Furnishings */}
                    <div className="py-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-700">Furnishings</span>
                        <span className="text-gray-700">
                          {formatCurrency(currentBudget.rangeLow)} — {formatCurrency(currentBudget.rangeHigh)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        All furniture, accessories, and finishing touches
                      </p>
                    </div>

                    {/* Project Add-ons */}
                    <div className="py-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-700">Design Fee</span>
                        <span className="text-gray-700">
                          {formatCurrency(currentBudget.projectAddOns.designFee)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Comprehensive design planning, procurement, and placement services
                      </p>
                    </div>

                    <div className="py-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-700">Installation</span>
                        <span className="text-gray-700">{formatCurrency(currentBudget.projectAddOns.installation)}</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Professional delivery, setup, and installation services
                      </p>
                    </div>

                    <div className="py-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-700">Fuel</span>
                        <span className="text-gray-700">{formatCurrency(currentBudget.projectAddOns.fuel)}</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Transportation and fuel costs
                      </p>
                    </div>

                    <div className="py-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-700">Storage & Receiving</span>
                        <span className="text-gray-700">{formatCurrency(currentBudget.projectAddOns.storageAndReceiving)}</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Temporary storage solutions and receiving services
                      </p>
                    </div>

                    <div className="py-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-700">Kitchen</span>
                        <span className="text-gray-700">{formatCurrency(currentBudget.projectAddOns.kitchen)}</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Kitchen equipment including cookware, flatware, and accessories
                      </p>
                    </div>

                    {/* Property Management */}
                    <div className="py-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-700">Property Management</span>
                        <span className="text-gray-700">{formatCurrency(currentBudget.projectAddOns.propertyManagement)}</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Items required by property management
                      </p>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rooms & Items Editing Area */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <div className="mb-6">
              <div className="mb-1">
                <span className="text-2xl font-bold text-primary-800">
                  Edit Room Configurations
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Modify rooms, quantities, and items to customize your estimate
              </p>
            </div>

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
                    itemsMap={itemsMap}
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
  itemsMap: Map<string, Item>;
  onUpdate: (room: RoomWithItems) => void;
  onRemove: () => void;
  onQuantityChange: (newQuantity: number) => void;
}

function RoomEditor({ room, roomIndex, roomTemplates, itemsMap, onUpdate, onRemove, onQuantityChange }: RoomEditorProps) {
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
            <button className="text-sm text-primary-600 hover:text-primary-800 flex items-center gap-2">
              ➕ Add Item
            </button>

            {room.items.map((roomItem, itemIndex) => (
              <ItemRow
                key={itemIndex}
                roomItem={roomItem}
                roomIndex={roomIndex}
                itemIndex={itemIndex}
                itemsMap={itemsMap}
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
  itemsMap: Map<string, Item>;
  onRemove: () => void;
  onQuantityChange: (newQuantity: number) => void;
}

function ItemRow({ roomItem, itemsMap, onRemove, onQuantityChange }: ItemRowProps) {
  return (
    <div className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
      <div className="flex-1">
        <span className="text-gray-700">
          {(() => {
            const item = itemsMap.get(roomItem.itemId);
            return item?.name || roomItem.itemId.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
          })()}
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
