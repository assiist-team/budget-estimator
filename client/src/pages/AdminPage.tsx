import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Link } from 'react-router-dom';
import type { Estimate, RoomTemplate, Item, RoomItem } from '../types';
import { formatCurrency } from '../utils/calculations';
import { EditIcon, TrashIcon } from '../components/Icons';

export default function AdminPage() {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [roomTemplates, setRoomTemplates] = useState<RoomTemplate[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'estimates' | 'templates' | 'items'>('estimates');
  const [editingTemplate, setEditingTemplate] = useState<RoomTemplate | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [showCreateItem, setShowCreateItem] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeRoomSizeTab, setActiveRoomSizeTab] = useState<string>('');

  // Set initial room size tab when editing template opens
  useEffect(() => {
    if (editingTemplate && !activeRoomSizeTab) {
      setActiveRoomSizeTab('small');
    }
  }, [editingTemplate, activeRoomSizeTab]);

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

        console.log('Fetching room templates from Firestore...');
        templatesSnapshot.forEach((doc) => {
          const docData = doc.data();
          templatesData.push({
            id: doc.id,
            ...docData,
            createdAt: docData.createdAt?.toDate ? docData.createdAt.toDate() : docData.createdAt,
            updatedAt: docData.updatedAt?.toDate ? docData.updatedAt.toDate() : docData.updatedAt,
          } as RoomTemplate);
        });
        console.log(`Loaded ${templatesData.length} room templates from Firestore`);

        // Fetch items
        const itemsQuery = query(collection(db, 'items'), orderBy('name'));
        const itemsSnapshot = await getDocs(itemsQuery);
        const itemsData: Item[] = [];

        console.log('Fetching items from Firestore...');
        itemsSnapshot.forEach((doc) => {
          const docData = doc.data();
          itemsData.push({
            id: doc.id,
            ...docData,
            createdAt: docData.createdAt?.toDate ? docData.createdAt.toDate() : docData.createdAt,
            updatedAt: docData.updatedAt?.toDate ? docData.updatedAt.toDate() : docData.updatedAt,
          } as Item);
        });
        console.log(`Loaded ${itemsData.length} items from Firestore`);

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

  // Get unique categories from items
  const uniqueCategories = Array.from(new Set(items.map(item => item.category))).sort();

  // Filter items based on selected category and search term
  const filteredItems = items.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = searchTerm === '' ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.subcategory && item.subcategory.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  // Function to update a room template
  const updateRoomTemplate = async (templateId: string, updates: Partial<RoomTemplate>) => {
    // Store original template for potential rollback
    const originalTemplate = roomTemplates.find(template => template.id === templateId);

    try {
      console.log('Updating room template:', templateId, updates);
      const templateRef = doc(db, 'roomTemplates', templateId);

      const updateData = {
        ...updates,
        updatedAt: new Date(),
      };

      console.log('Update data:', updateData);
      await updateDoc(templateRef, updateData);
      console.log('Firestore update successful');

      // Update local state
      setRoomTemplates(prev =>
        prev.map(template =>
          template.id === templateId
            ? { ...template, ...updates, updatedAt: new Date() }
            : template
        )
      );

      console.log('Local state updated');
      setEditingTemplate(null);
    } catch (error) {
      console.error('Error updating room template:', error);
      console.error('Error details:', {
        templateId,
        updates,
        error: error instanceof Error ? error.message : error
      });

      // Revert local state changes if Firestore update failed
      if (originalTemplate) {
        setRoomTemplates(prev =>
          prev.map(template =>
            template.id === templateId
              ? originalTemplate
              : template
          )
        );
      }

      alert(`Failed to update room template: ${error instanceof Error ? error.message : 'Unknown error'}. Changes have been reverted. Check console for details.`);
    }
  };

  // Function to create a new item
  const createItem = async (itemData: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newItem = {
        ...itemData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const docRef = await addDoc(collection(db, 'items'), newItem);

      // Update local state
      setItems(prev => [...prev, {
        id: docRef.id,
        ...newItem,
      } as Item]);

      setShowCreateItem(false);
      return docRef.id;
    } catch (error) {
      console.error('Error creating item:', error);
      alert('Failed to create item. Please try again.');
      throw error;
    }
  };

  // Function to update an existing item
  const updateItem = async (itemId: string, updates: Partial<Item>) => {
    // Store original item for potential rollback
    const originalItem = items.find(item => item.id === itemId);

    try {
      const itemRef = doc(db, 'items', itemId);
      await updateDoc(itemRef, {
        ...updates,
        updatedAt: new Date(),
      });

      // Update local state
      setItems(prev =>
        prev.map(item =>
          item.id === itemId
            ? { ...item, ...updates, updatedAt: new Date() }
            : item
        )
      );

      setEditingItem(null);
    } catch (error) {
      console.error('Error updating item:', error);

      // Revert local state changes if Firestore update failed
      if (originalItem) {
        setItems(prev =>
          prev.map(item =>
            item.id === itemId
              ? originalItem
              : item
          )
        );
      }

      // Show more specific error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to update item: ${errorMessage}. Changes have been reverted. Please try again.`);
    }
  };

  // Function to delete/deactivate an item
  const deleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item? It will be permanently removed.')) {
      return;
    }

    try {
      const itemRef = doc(db, 'items', itemId);
      await deleteDoc(itemRef);

      // Update local state
      setItems(prev => prev.filter(item => item.id !== itemId));
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item. Please try again.');
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
              🏠 Rooms ({roomTemplates.length})
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
                  Rooms
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
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{template.icon}</span>
                      <div>
                        <h3 className="font-semibold text-gray-900">{template.displayName}</h3>
                      </div>
                    </div>
                    <button
                      onClick={() => setEditingTemplate(template)}
                      className="text-sm text-primary-600 hover:text-primary-800 p-1"
                    >
                      <EditIcon />
                    </button>
                  </div>

                  {['small', 'medium', 'large'].map((size) => {
                    const sizeData = template.sizes[size as keyof typeof template.sizes];
                    return (
                      <div key={size} className="mb-4 last:mb-0">
                        <h4 className="font-medium text-gray-800 capitalize mb-2">{size}</h4>
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
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'items' && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Master Item Catalog
                </h2>
                <p className="text-gray-600">
                  {filteredItems.length === items.length
                    ? `${items.length} items available for room configurations`
                    : `${filteredItems.length} of ${items.length} items shown${searchTerm || selectedCategory !== 'all' ? ' (filtered)' : ''}`
                  }
                </p>
              </div>
              <button
                onClick={() => setShowCreateItem(true)}
                className="btn-primary"
              >
                + Create Item
              </button>
            </div>

            <div className="mb-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search Items:
                  </label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name or subcategory..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div className="sm:w-48">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filter by Category:
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="all">All Categories</option>
                    {uniqueCategories.map((category) => (
                      <option key={category} value={category}>
                        {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map((item) => (
                <div key={item.id} className="card">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{item.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {item.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                      <button
                        onClick={() => setEditingItem(item)}
                        className="text-sm text-primary-600 hover:text-primary-800 p-1"
                        title="Edit Item"
                      >
                        <EditIcon />
                      </button>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="text-sm text-red-600 hover:text-red-800 p-1"
                        title="Delete Item"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
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
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Sticky Header Section */}
            <div className="sticky top-0 z-20 bg-white border-b border-gray-200">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Edit Room Template: {editingTemplate.displayName}
                  </h2>
                  <button
                    onClick={() => {
                      setEditingTemplate(null);
                      setActiveRoomSizeTab('');
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                {/* Room Size Tabs */}
                <div className="border-b border-gray-200 mb-1">
                  <nav className="-mb-px flex space-x-8 overflow-x-auto">
                    {['small', 'medium', 'large'].map((sizeKey) => (
                      <button
                        key={sizeKey}
                        onClick={() => setActiveRoomSizeTab(sizeKey)}
                        className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                          activeRoomSizeTab === sizeKey
                            ? 'border-primary-500 text-primary-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {sizeKey.charAt(0).toUpperCase() + sizeKey.slice(1)}
                      </button>
                    ))}
                  </nav>
                </div>
              </div>

              {/* Budget Container - also sticky */}
              {activeRoomSizeTab && editingTemplate.sizes[activeRoomSizeTab as keyof typeof editingTemplate.sizes] && (
                <div className="px-6 pb-6">
                  <div className="p-3 bg-gray-50 rounded-lg border">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                          Budget
                        </div>
                        <div className="text-lg font-bold text-primary-500">
                          {formatCurrency(editingTemplate.sizes[activeRoomSizeTab as keyof typeof editingTemplate.sizes].totals.budget)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                          Mid
                        </div>
                        <div className="text-lg font-bold text-primary-600">
                          {formatCurrency(editingTemplate.sizes[activeRoomSizeTab as keyof typeof editingTemplate.sizes].totals.mid)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                          Mid/High
                        </div>
                        <div className="text-lg font-bold text-primary-900">
                          {formatCurrency(editingTemplate.sizes[activeRoomSizeTab as keyof typeof editingTemplate.sizes].totals.midHigh)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                          High
                        </div>
                        <div className="text-lg font-bold text-black">
                          {formatCurrency(editingTemplate.sizes[activeRoomSizeTab as keyof typeof editingTemplate.sizes].totals.high)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="pt-2 px-6 pb-6">
                {/* Add new item - moved above items list and made sticky */}
                {activeRoomSizeTab && editingTemplate.sizes[activeRoomSizeTab as keyof typeof editingTemplate.sizes] && (
                  <div className="sticky top-0 z-10 bg-white border-b border-gray-200 pb-1 mb-4">
                    <div className="rounded p-3">
                      <select
                        className="w-full p-2 border border-gray-300 rounded"
                        onChange={(e) => {
                          if (e.target.value) {
                            const newItemId = e.target.value;
                            const sizeData = editingTemplate.sizes[activeRoomSizeTab as keyof typeof editingTemplate.sizes];
                            console.log('Adding item to room:', { newItemId, sizeKey: activeRoomSizeTab, editingTemplateId: editingTemplate.id });

                            const newItems = [...sizeData.items, { itemId: newItemId, quantity: 1 }];
                            const newTotals = calculateRoomTotals(newItems);

                            console.log('New items array:', newItems);
                            console.log('New totals:', newTotals);

                            updateRoomTemplate(editingTemplate.id, {
                              sizes: {
                                ...editingTemplate.sizes,
                                [activeRoomSizeTab]: {
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
                          .filter(item => !editingTemplate.sizes[activeRoomSizeTab as keyof typeof editingTemplate.sizes].items.some((roomItem: RoomItem) => roomItem.itemId === item.id))
                          .map(item => (
                            <option key={item.id} value={item.id}>
                              {item.name} ({item.category})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Tab Content */}
                {activeRoomSizeTab && editingTemplate.sizes[activeRoomSizeTab as keyof typeof editingTemplate.sizes] && (
                  <div className="space-y-6">
                    <div className="border rounded-lg p-4">
                      <h3 className="font-medium text-gray-900 mb-4 capitalize">
                        {activeRoomSizeTab} Items
                      </h3>

                      <div className="space-y-3">
                        {editingTemplate.sizes[activeRoomSizeTab as keyof typeof editingTemplate.sizes].items.map((roomItem: RoomItem, index: number) => {
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
                                    const sizeData = editingTemplate.sizes[activeRoomSizeTab as keyof typeof editingTemplate.sizes];
                                    const newItems = [...sizeData.items];
                                    newItems[index] = { ...roomItem, quantity: newQuantity };

                                    const newTotals = calculateRoomTotals(newItems);

                                    updateRoomTemplate(editingTemplate.id, {
                                      sizes: {
                                        ...editingTemplate.sizes,
                                        [activeRoomSizeTab]: {
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
                                    const sizeData = editingTemplate.sizes[activeRoomSizeTab as keyof typeof editingTemplate.sizes];
                                    const newItems = sizeData.items.filter((_: RoomItem, i: number) => i !== index);
                                    const newTotals = calculateRoomTotals(newItems);

                                    updateRoomTemplate(editingTemplate.id, {
                                      sizes: {
                                        ...editingTemplate.sizes,
                                        [activeRoomSizeTab]: {
                                          ...sizeData,
                                          items: newItems,
                                          totals: newTotals,
                                        },
                                      },
                                    });
                                  }}
                                  className="text-red-600 hover:text-red-800 p-1"
                                >
                                  <TrashIcon />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Item Modal */}
      {showCreateItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Create New Item
                </h2>
                <button
                  onClick={() => setShowCreateItem(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <ItemForm
                onSubmit={createItem}
                onCancel={() => setShowCreateItem(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Edit Item: {editingItem.name}
                </h2>
                <button
                  onClick={() => setEditingItem(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <ItemForm
                item={editingItem}
                onSubmit={(updates) => updateItem(editingItem.id, updates)}
                onCancel={() => setEditingItem(null)}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Item Form Component
function ItemForm({
  item,
  onSubmit,
  onCancel
}: {
  item?: Item;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: item?.name || '',
    category: item?.category || 'Furniture',
    subcategory: item?.subcategory || '',
    budgetPrice: item?.budgetPrice ? Math.round(item.budgetPrice / 100) : 0,
    midPrice: item?.midPrice ? Math.round(item.midPrice / 100) : 0,
    midHighPrice: item?.midHighPrice ? Math.round(item.midHighPrice / 100) : 0,
    highPrice: item?.highPrice ? Math.round(item.highPrice / 100) : 0,
    unit: item?.unit || 'each',
    notes: item?.notes || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Convert prices to cents
    const submitData = {
      ...formData,
      budgetPrice: Math.round(formData.budgetPrice * 100),
      midPrice: Math.round(formData.midPrice * 100),
      midHighPrice: Math.round(formData.midHighPrice * 100),
      highPrice: Math.round(formData.highPrice * 100),
    };

    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Item Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="w-full p-2 border border-gray-300 rounded"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category
          </label>
          <select
            value={formData.category}
            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
            className="w-full p-2 border border-gray-300 rounded"
            required
          >
            <option value="Furniture">Furniture</option>
            <option value="Kitchen">Kitchen</option>
            <option value="Bedding">Bedding</option>
            <option value="Textiles">Textiles</option>
            <option value="Lighting">Lighting</option>
            <option value="Accessories">Accessories</option>
            <option value="Entertainment">Entertainment</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Subcategory (Optional)
        </label>
        <input
          type="text"
          value={formData.subcategory}
          onChange={(e) => setFormData(prev => ({ ...prev, subcategory: e.target.value }))}
          className="w-full p-2 border border-gray-300 rounded"
          placeholder="e.g., seating, tables, storage"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Unit
          </label>
          <select
            value={formData.unit}
            onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
            className="w-full p-2 border border-gray-300 rounded"
          >
            <option value="each">Each</option>
            <option value="sqft">Per Sq Ft</option>
            <option value="linear ft">Per Linear Ft</option>
            <option value="set">Set</option>
          </select>
        </div>

      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Notes (Optional)
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          className="w-full p-2 border border-gray-300 rounded"
          rows={3}
          placeholder="Additional notes or specifications"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-4">
          Pricing (in dollars)
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Budget Quality
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.budgetPrice}
              onChange={(e) => setFormData(prev => ({ ...prev, budgetPrice: parseFloat(e.target.value) || 0 }))}
              className="w-full p-2 border border-gray-300 rounded"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Mid Quality
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.midPrice}
              onChange={(e) => setFormData(prev => ({ ...prev, midPrice: parseFloat(e.target.value) || 0 }))}
              className="w-full p-2 border border-gray-300 rounded"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Mid/High Quality
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.midHighPrice}
              onChange={(e) => setFormData(prev => ({ ...prev, midHighPrice: parseFloat(e.target.value) || 0 }))}
              className="w-full p-2 border border-gray-300 rounded"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              High Quality
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.highPrice}
              onChange={(e) => setFormData(prev => ({ ...prev, highPrice: parseFloat(e.target.value) || 0 }))}
              className="w-full p-2 border border-gray-300 rounded"
              required
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn-primary"
        >
          {item ? 'Update Item' : 'Create Item'}
        </button>
      </div>
    </form>
  );
}





