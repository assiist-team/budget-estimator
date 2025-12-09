import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEstimateEditor } from '../hooks/useEstimateEditing';
import { useRoomTemplates } from '../hooks/useRoomTemplates';
import { useBudgetDefaultsStore } from '../store/budgetDefaultsStore';
import Header from '../components/Header';
import { UndoIcon, RedoIcon, TrashIcon } from '../components/Icons';
import type { RoomWithItems, RoomTemplate, Item, ProjectBudget, Budget, RoomItem } from '../types';
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
  const { isAdmin, loading: authLoading } = useAuth();
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

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate(`/tools/budget-estimator/estimate/view/${estimateId}`);
    }
  }, [authLoading, isAdmin, navigate, estimateId]);

  // Redirect if no estimate loaded
  useEffect(() => {
    if (!loading && !estimate && !error) {
      navigate('/tools');
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

  if (loading || rulesLoading || authLoading) {
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
            onClick={() => navigate('/tools')}
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
                onClick={() => navigate(-1)}
                className="btn-secondary"
              >
                ← Back
              </button>
            </div>

            <div className="flex gap-3">
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
            <div className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2">
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

  // Calculate room totals from items
  const roomTotals = useMemo(() => {
    let lowTotal = 0;
    let midTotal = 0;
    
    room.items.forEach((roomItem) => {
      // Use RoomItem price override if available, otherwise fall back to item library
      const lowPrice = roomItem.lowPrice !== undefined ? roomItem.lowPrice : (itemsMap.get(roomItem.itemId)?.lowPrice || 0);
      const midPrice = roomItem.midPrice !== undefined ? roomItem.midPrice : (itemsMap.get(roomItem.itemId)?.midPrice || 0);
      
      const totalQuantity = roomItem.quantity * room.quantity;
      lowTotal += lowPrice * totalQuantity;
      midTotal += midPrice * totalQuantity;
    });
    
    return { low: lowTotal, mid: midTotal };
  }, [room.items, room.quantity, itemsMap]);

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

  const roomDisplayName = room.displayName || room.roomType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-500 hover:text-gray-700 flex-shrink-0"
          >
            {isExpanded ? '▼' : '▶'}
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-base sm:text-lg text-gray-900 truncate">
                {roomDisplayName}
              </h3>
              <div className="relative" ref={sizeDropdownRef}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsSizeDropdownOpen(!isSizeDropdownOpen);
                  }}
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
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSizeChange(size);
                          }}
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
            <p className="text-sm text-gray-500 truncate">
              {room.roomSize.charAt(0).toUpperCase() + room.roomSize.slice(1)} × {room.quantity}
            </p>
          </div>
        </div>
        <div className="text-right flex-shrink-0 ml-3">
          <div className="font-semibold text-gray-700 whitespace-nowrap">
            {formatCurrency(roomTotals.low)} — {formatCurrency(roomTotals.mid)}
          </div>
        </div>
        <div className="flex items-center gap-6 ml-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQuantityChange(Math.max(1, room.quantity - 1));
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              −
            </button>
            <span className="text-sm font-medium text-gray-900 w-8 text-center">
              {room.quantity}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQuantityChange(room.quantity + 1);
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              +
            </button>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="text-sm text-red-600 hover:text-red-800 p-1"
          >
            <TrashIcon />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-200 p-4 bg-white">
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
                roomQuantity={room.quantity}
                onRemove={() => {
                  const updatedItems = room.items.filter((_, i) => i !== itemIndex);
                  onUpdate({ ...room, items: updatedItems });
                }}
                onQuantityChange={(newQuantity: number) => {
                  const updatedItems = [...room.items];
                  updatedItems[itemIndex] = { ...roomItem, quantity: newQuantity };
                  onUpdate({ ...room, items: updatedItems });
                }}
                onPriceChange={(lowPrice?: number, midPrice?: number) => {
                  const updatedItems = [...room.items];
                  // Create updated roomItem, removing price fields if undefined (to reset to library)
                  const updatedRoomItem: RoomItem = { ...roomItem };
                  if (lowPrice === undefined) {
                    delete updatedRoomItem.lowPrice;
                  } else {
                    updatedRoomItem.lowPrice = lowPrice;
                  }
                  if (midPrice === undefined) {
                    delete updatedRoomItem.midPrice;
                  } else {
                    updatedRoomItem.midPrice = midPrice;
                  }
                  updatedItems[itemIndex] = updatedRoomItem;
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
  roomItem: RoomItem;
  roomIndex: number;
  itemIndex: number;
  itemsMap: Map<string, Item>;
  roomQuantity: number;
  onRemove: () => void;
  onQuantityChange: (newQuantity: number) => void;
  onPriceChange: (lowPrice?: number, midPrice?: number) => void;
}

function ItemRow({ roomItem, itemsMap, roomQuantity, onRemove, onQuantityChange, onPriceChange }: ItemRowProps) {
  const item = itemsMap.get(roomItem.itemId);
  const itemDisplayName = item?.name || roomItem.itemId.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
  
  // Use RoomItem price overrides if available, otherwise fall back to item library
  const lowPrice = roomItem.lowPrice !== undefined ? roomItem.lowPrice : (item?.lowPrice || 0);
  const midPrice = roomItem.midPrice !== undefined ? roomItem.midPrice : (item?.midPrice || 0);
  
  // Calculate totals considering quantity and room quantity
  const totalQuantity = roomItem.quantity * roomQuantity;
  const lowTotal = lowPrice * totalQuantity;
  const midTotal = midPrice * totalQuantity;
  
  const [isEditingPrices, setIsEditingPrices] = useState(false);
  const [lowPriceInput, setLowPriceInput] = useState(Math.round(lowPrice / 100).toString());
  const [midPriceInput, setMidPriceInput] = useState(Math.round(midPrice / 100).toString());

  useEffect(() => {
    setLowPriceInput(Math.round(lowPrice / 100).toString());
    setMidPriceInput(Math.round(midPrice / 100).toString());
  }, [lowPrice, midPrice]);

  const handlePriceSave = () => {
    const lowCents = Math.round(parseFloat(lowPriceInput) * 100);
    const midCents = Math.round(parseFloat(midPriceInput) * 100);
    
    // Only save if different from item library prices (to break sync)
    // If they match library prices, set to undefined to reset to library values
    const itemLow = item?.lowPrice || 0;
    const itemMid = item?.midPrice || 0;
    
    // If the input is invalid or empty, reset to library prices
    if (isNaN(lowCents) || isNaN(midCents) || lowPriceInput === '' || midPriceInput === '') {
      onPriceChange(undefined, undefined);
      setIsEditingPrices(false);
      return;
    }
    
    onPriceChange(
      lowCents !== itemLow ? lowCents : undefined,
      midCents !== itemMid ? midCents : undefined
    );
    setIsEditingPrices(false);
  };

  const handlePriceCancel = () => {
    setLowPriceInput(Math.round(lowPrice / 100).toString());
    setMidPriceInput(Math.round(midPrice / 100).toString());
    setIsEditingPrices(false);
  };

  return (
    <div className="flex justify-between items-center text-sm bg-gray-50 px-4 py-3 rounded-lg">
      <div className="flex-1 min-w-0">
        <span className="text-gray-700 font-medium">
          {itemDisplayName}
        </span>
        {isEditingPrices ? (
          <div className="mt-2 space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600 w-20">Low Price:</label>
              <input
                type="number"
                value={lowPriceInput}
                onChange={(e) => setLowPriceInput(e.target.value)}
                className="text-xs px-2 py-1 border border-gray-300 rounded w-24"
                placeholder="0"
              />
              <span className="text-xs text-gray-500">each</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600 w-20">Mid Price:</label>
              <input
                type="number"
                value={midPriceInput}
                onChange={(e) => setMidPriceInput(e.target.value)}
                className="text-xs px-2 py-1 border border-gray-300 rounded w-24"
                placeholder="0"
              />
              <span className="text-xs text-gray-500">each</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={handlePriceSave}
                className="text-xs px-2 py-1 bg-primary-600 text-white rounded hover:bg-primary-700"
              >
                Save
              </button>
              <button
                onClick={handlePriceCancel}
                className="text-xs px-2 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="text-xs text-gray-500 mt-1">
            {formatCurrency(lowPrice)} — {formatCurrency(midPrice)} each
            <button
              onClick={() => setIsEditingPrices(true)}
              className="ml-2 text-primary-600 hover:text-primary-800 underline"
            >
              Edit
            </button>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 ml-4 flex-shrink-0">
        <span className="text-gray-600">
          Qty: {roomItem.quantity}
          {roomQuantity > 1 && ` × ${roomQuantity} rooms`}
        </span>
        <span className="text-gray-700 font-semibold">
          {formatCurrency(lowTotal)} — {formatCurrency(midTotal)}
        </span>
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
