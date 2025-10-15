import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEstimateEditor } from '../hooks/useEstimateEditing';
import { useRoomTemplates } from '../hooks/useRoomTemplates';
import Header from '../components/Header';
import type { RoomWithItems, RoomTemplate } from '../types';
import { formatCurrency } from '../utils/calculations';

export default function EstimateEditPage() {
  const navigate = useNavigate();
  const { estimateId } = useParams<{ estimateId: string }>();
  const { estimate, loading, error, hasUnsavedChanges, canUndo, canRedo, updateRoom, addRoom, removeRoom, saveChanges, recalculateBudget, undo, redo } = useEstimateEditor(estimateId);
  const { roomTemplates } = useRoomTemplates();
  const [saving, setSaving] = useState(false);

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header currentStep={0} totalSteps={0} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/admin')}
                className="btn-secondary"
              >
                ← Back to Dashboard
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Edit Estimate: {estimate.id}
                </h1>
                <p className="text-gray-600">
                  {estimate.clientInfo.firstName} {estimate.clientInfo.lastName} • {formatCurrency(estimate.budget.rangeLow)} - {formatCurrency(estimate.budget.rangeHigh)}
                </p>
              </div>
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
                  ↶ Undo
                </button>
                <button
                  onClick={redo}
                  disabled={!canRedo}
                  className="btn-secondary disabled:opacity-50"
                  title="Redo (Ctrl+Y)"
                >
                  ↷ Redo
                </button>
              </div>

              <button
                onClick={() => recalculateBudget(estimate)}
                className="btn-secondary"
              >
                🔄 Recalculate
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !hasUnsavedChanges}
                className="btn-primary disabled:opacity-50"
              >
                {saving ? '💾 Saving...' : '💾 Save Draft'}
              </button>
            </div>
          </div>
        </div>

        {/* Property Info Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200 mb-8">
            <nav className="-mb-px flex space-x-8">
              <button className="py-4 px-1 border-b-2 border-primary-500 font-medium text-sm text-primary-600">
                📋 Client Info
              </button>
              <button className="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700">
                📐 Property Specs
              </button>
              <button className="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700">
                💰 Budget
              </button>
            </nav>
          </div>

          {/* Client Info Tab */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Client Information</h3>
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
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Property Specifications</h3>
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
              </div>
            </div>
          </div>
        </div>

        {/* Rooms & Items Editing Area */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              📝 Rooms & Items
            </h2>
          </div>

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

        {/* Budget Summary */}
        <div className="mt-8 bg-gradient-to-br from-primary-600 to-primary-900 text-white rounded-xl shadow-md p-6">
          <div className="text-center">
            <p className="text-lg font-medium mb-3 opacity-90">
              CURRENT ESTIMATE TOTAL
            </p>
            <div className="text-4xl font-bold mb-2">
              {formatCurrency(estimate.budget.rangeLow)} — {formatCurrency(estimate.budget.rangeHigh)}
            </div>
            <p className="text-sm opacity-75">
              {estimate.rooms.length} room{estimate.rooms.length !== 1 ? 's' : ''} • {estimate.rooms.reduce((total, room) => total + room.quantity, 0)} total items
            </p>
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
}

function RoomEditor({ room, roomIndex, roomTemplates, onUpdate, onRemove }: RoomEditorProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const template = roomTemplates.get(room.roomType);

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
            <div>
              <h3 className="font-medium text-gray-900">
                {room.displayName || room.roomType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </h3>
              <p className="text-sm text-gray-500">
                {room.roomSize.charAt(0).toUpperCase() + room.roomSize.slice(1)} × {room.quantity}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="text-sm text-primary-600 hover:text-primary-800 p-1">
              ✏️ Edit
            </button>
            <button
              onClick={onRemove}
              className="text-sm text-red-600 hover:text-red-800 p-1"
            >
              🗑️ Remove
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
                onUpdate={(updatedItem) => {
                  const updatedItems = [...room.items];
                  updatedItems[itemIndex] = updatedItem;
                  onUpdate({ ...room, items: updatedItems });
                }}
                onRemove={() => {
                  const updatedItems = room.items.filter((_, i) => i !== itemIndex);
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
  onUpdate: (item: any) => void;
  onRemove: () => void;
}

function ItemRow({ roomItem, onUpdate, onRemove }: ItemRowProps) {
  return (
    <div className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
      <div className="flex-1">
        <span className="text-gray-700">
          {roomItem.name || roomItem.itemId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <button className="text-sm text-gray-500 hover:text-gray-700">−</button>
          <span className="text-sm font-medium text-gray-900 w-8 text-center">
            {roomItem.quantity}
          </span>
          <button className="text-sm text-gray-500 hover:text-gray-700">+</button>
        </div>

        <button className="text-sm text-primary-600 hover:text-primary-800 p-1">
          ✏️
        </button>

        <button
          onClick={onRemove}
          className="text-sm text-red-600 hover:text-red-800 p-1"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
