import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Link } from 'react-router-dom';
import type { Estimate, RoomTemplate, Item, RoomItem } from '../types';
import { formatCurrency } from '../utils/calculations';

export default function AdminPage() {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [roomTemplates, setRoomTemplates] = useState<RoomTemplate[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'estimates' | 'templates' | 'items'>('estimates');
  const [editingTemplate, setEditingTemplate] = useState<RoomTemplate | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch estimates
        const estimatesQuery = query(
          collection(db, 'estimates'),
          orderBy('createdAt', 'desc'),
          limit(50)
        );

        const estimatesSnapshot = await getDocs(estimatesQuery);
        const estimatesData: Estimate[] = [];

        estimatesSnapshot.forEach((doc) => {
          const docData = doc.data();
          estimatesData.push({
            id: doc.id,
            ...docData,
            createdAt: docData.createdAt?.toDate ? docData.createdAt.toDate() : docData.createdAt,
            updatedAt: docData.updatedAt?.toDate ? docData.updatedAt.toDate() : docData.updatedAt,
            submittedAt: docData.submittedAt?.toDate ? docData.submittedAt.toDate() : docData.submittedAt,
          } as Estimate);
        });

        // Fetch room templates
        const templatesQuery = query(collection(db, 'roomTemplates'), orderBy('sortOrder'));
        const templatesSnapshot = await getDocs(templatesQuery);
        const templatesData: RoomTemplate[] = [];

        templatesSnapshot.forEach((doc) => {
          const docData = doc.data();
          templatesData.push({
            id: doc.id,
            ...docData,
            createdAt: docData.createdAt?.toDate ? docData.createdAt.toDate() : docData.createdAt,
            updatedAt: docData.updatedAt?.toDate ? docData.updatedAt.toDate() : docData.updatedAt,
          } as RoomTemplate);
        });

        // Fetch items
        const itemsQuery = query(collection(db, 'items'), orderBy('name'));
        const itemsSnapshot = await getDocs(itemsQuery);
        const itemsData: Item[] = [];

        itemsSnapshot.forEach((doc) => {
          const docData = doc.data();
          itemsData.push({
            id: doc.id,
            ...docData,
            createdAt: docData.createdAt?.toDate ? docData.createdAt.toDate() : docData.createdAt,
            updatedAt: docData.updatedAt?.toDate ? docData.updatedAt.toDate() : docData.updatedAt,
          } as Item);
        });

        setEstimates(estimatesData);
        setRoomTemplates(templatesData);
        setItems(itemsData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Function to update a room template
  const updateRoomTemplate = async (templateId: string, updates: Partial<RoomTemplate>) => {
    try {
      const templateRef = doc(db, 'roomTemplates', templateId);
      await updateDoc(templateRef, {
        ...updates,
        updatedAt: new Date(),
      });

      // Update local state
      setRoomTemplates(prev =>
        prev.map(template =>
          template.id === templateId
            ? { ...template, ...updates, updatedAt: new Date() }
            : template
        )
      );

      setEditingTemplate(null);
    } catch (error) {
      console.error('Error updating room template:', error);
      alert('Failed to update room template. Please try again.');
    }
  };

  // Function to calculate totals for a room size
  const calculateRoomTotals = (roomItems: RoomItem[]): { budget: number; mid: number; midHigh: number; high: number } => {
    let budget = 0, mid = 0, midHigh = 0, high = 0;

    roomItems.forEach(roomItem => {
      const item = items.find(i => i.id === roomItem.itemId);
      if (item) {
        budget += item.budgetPrice * roomItem.quantity;
        mid += item.midPrice * roomItem.quantity;
        midHigh += item.midHighPrice * roomItem.quantity;
        high += item.highPrice * roomItem.quantity;
      }
    });

    return { budget, mid, midHigh, high };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading estimates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-primary-800">
              Admin Dashboard
            </h1>
            <Link to="/" className="btn-secondary">
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('estimates')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'estimates'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📋 Estimates ({estimates.length})
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'templates'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🏠 Room Templates ({roomTemplates.length})
            </button>
            <button
              onClick={() => setActiveTab('items')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'items'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🏷️ Items ({items.length})
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'estimates' && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Recent Estimates
              </h2>
              <p className="text-gray-600">
                {estimates.length} estimate{estimates.length !== 1 ? 's' : ''} submitted
              </p>
            </div>

            {estimates.length === 0 ? (
              <div className="card text-center py-12">
                <p className="text-gray-600 text-lg">
                  No estimates submitted yet
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {estimates.map((estimate) => (
                  <div key={estimate.id} className="card hover:shadow-xl transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {estimate.clientInfo.firstName} {estimate.clientInfo.lastName}
                          </h3>
                          <span className={`
                            px-3 py-1 rounded-full text-xs font-medium
                            ${estimate.status === 'submitted' ? 'bg-blue-100 text-blue-800' : ''}
                            ${estimate.status === 'viewed' ? 'bg-yellow-100 text-yellow-800' : ''}
                            ${estimate.status === 'contacted' ? 'bg-green-100 text-green-800' : ''}
                          `}>
                            {estimate.status}
                          </span>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">
                              <span className="font-medium">Email:</span> {estimate.clientInfo.email}
                            </p>
                            {estimate.clientInfo.phone && (
                              <p className="text-gray-600">
                                <span className="font-medium">Phone:</span> {estimate.clientInfo.phone}
                              </p>
                            )}
                            <p className="text-gray-600">
                              <span className="font-medium">Property:</span>{' '}
                              {estimate.propertySpecs.squareFootage.toLocaleString()} sqft,
                              {' '}{estimate.propertySpecs.guestCapacity} guests
                            </p>
                          </div>

                          <div>
                            <p className="text-gray-600">
                              <span className="font-medium">Rooms:</span> {estimate.rooms.length}
                            </p>
                            <p className="text-gray-600">
                              <span className="font-medium">Budget Range:</span>{' '}
                              {formatCurrency(estimate.budget.rangeLow)} - {formatCurrency(estimate.budget.rangeHigh)}
                            </p>
                            <p className="text-gray-600">
                              <span className="font-medium">Submitted:</span>{' '}
                              {estimate.submittedAt?.toLocaleDateString() || 'N/A'}
                            </p>
                          </div>
                        </div>

                        {estimate.propertySpecs.notes && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Notes:</span> {estimate.propertySpecs.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'templates' && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Room Templates
                </h2>
                <p className="text-gray-600">
                  Configure items and quantities for each room size
                </p>
              </div>
              <button
                onClick={() => setEditingTemplate(roomTemplates[0] || null)}
                className="btn-primary"
              >
                Edit Templates
              </button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {roomTemplates.map((template) => (
                <div key={template.id} className="card">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">{template.icon}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900">{template.displayName}</h3>
                      <p className="text-sm text-gray-600">{template.description}</p>
                    </div>
                  </div>

                  {Object.entries(template.sizes).map(([size, sizeData]) => (
                    <div key={size} className="mb-4 last:mb-0">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-800 capitalize">{size} Room</h4>
                        <button
                          onClick={() => setEditingTemplate(template)}
                          className="text-sm text-primary-600 hover:text-primary-800"
                        >
                          Edit
                        </button>
                      </div>
                      <div className="text-sm text-gray-600">
                        <p>{sizeData.items.length} items</p>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <span>Budget: {formatCurrency(sizeData.totals.budget)}</span>
                          <span>Mid: {formatCurrency(sizeData.totals.mid)}</span>
                          <span>Mid/High: {formatCurrency(sizeData.totals.midHigh)}</span>
                          <span>High: {formatCurrency(sizeData.totals.high)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'items' && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Master Item Catalog
              </h2>
              <p className="text-gray-600">
                {items.length} items available for room configurations
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <div key={item.id} className="card">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{item.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      item.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {item.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{item.category}</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-medium">Budget:</span> {formatCurrency(item.budgetPrice)}
                    </div>
                    <div>
                      <span className="font-medium">Mid:</span> {formatCurrency(item.midPrice)}
                    </div>
                    <div>
                      <span className="font-medium">Mid/High:</span> {formatCurrency(item.midHighPrice)}
                    </div>
                    <div>
                      <span className="font-medium">High:</span> {formatCurrency(item.highPrice)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Edit Template Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Edit Room Template: {editingTemplate.displayName}
                </h2>
                <button
                  onClick={() => setEditingTemplate(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {Object.entries(editingTemplate.sizes).map(([sizeKey, sizeData]) => (
                  <div key={sizeKey} className="border rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-4 capitalize">{sizeKey} Room</h3>

                    <div className="space-y-3">
                      {sizeData.items.map((roomItem, index) => {
                        const item = items.find(i => i.id === roomItem.itemId);
                        return (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                            <div className="flex-1">
                              <span className="font-medium text-gray-900">
                                {item?.name || 'Unknown Item'}
                              </span>
                              <div className="text-sm text-gray-600 mt-1">
                                Budget: {formatCurrency(item?.budgetPrice || 0)} |
                                Mid: {formatCurrency(item?.midPrice || 0)} |
                                High: {formatCurrency(item?.highPrice || 0)}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600">Qty:</span>
                              <input
                                type="number"
                                min="0"
                                value={roomItem.quantity}
                                onChange={(e) => {
                                  const newQuantity = parseInt(e.target.value) || 0;
                                  const newItems = [...sizeData.items];
                                  newItems[index] = { ...roomItem, quantity: newQuantity };

                                  const newTotals = calculateRoomTotals(newItems);

                                  updateRoomTemplate(editingTemplate.id, {
                                    sizes: {
                                      ...editingTemplate.sizes,
                                      [sizeKey]: {
                                        ...sizeData,
                                        items: newItems,
                                        totals: newTotals,
                                      },
                                    },
                                  });
                                }}
                                className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                              <button
                                onClick={() => {
                                  const newItems = sizeData.items.filter((_, i) => i !== index);
                                  const newTotals = calculateRoomTotals(newItems);

                                  updateRoomTemplate(editingTemplate.id, {
                                    sizes: {
                                      ...editingTemplate.sizes,
                                      [sizeKey]: {
                                        ...sizeData,
                                        items: newItems,
                                        totals: newTotals,
                                      },
                                    },
                                  });
                                }}
                                className="text-red-600 hover:text-red-800 p-1"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {/* Add new item */}
                      <div className="border-2 border-dashed border-gray-300 rounded p-3">
                        <select
                          className="w-full p-2 border border-gray-300 rounded"
                          onChange={(e) => {
                            if (e.target.value) {
                              const newItemId = e.target.value;
                              const newItems = [...sizeData.items, { itemId: newItemId, quantity: 1 }];
                              const newTotals = calculateRoomTotals(newItems);

                              updateRoomTemplate(editingTemplate.id, {
                                sizes: {
                                  ...editingTemplate.sizes,
                                  [sizeKey]: {
                                    ...sizeData,
                                    items: newItems,
                                    totals: newTotals,
                                  },
                                },
                              });

                              e.target.value = '';
                            }
                          }}
                        >
                          <option value="">+ Add Item</option>
                          {items
                            .filter(item => !sizeData.items.some(roomItem => roomItem.itemId === item.id))
                            .map(item => (
                              <option key={item.id} value={item.id}>
                                {item.name} ({item.category})
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Budget:</span>
                          <p className="text-lg font-semibold text-green-600">
                            {formatCurrency(sizeData.totals.budget)}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium">Mid:</span>
                          <p className="text-lg font-semibold text-blue-600">
                            {formatCurrency(sizeData.totals.mid)}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium">Mid/High:</span>
                          <p className="text-lg font-semibold text-purple-600">
                            {formatCurrency(sizeData.totals.midHigh)}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium">High:</span>
                          <p className="text-lg font-semibold text-orange-600">
                            {formatCurrency(sizeData.totals.high)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setEditingTemplate(null)}
                  className="btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

