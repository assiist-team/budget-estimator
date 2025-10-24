import { useState, useEffect, useMemo } from 'react';
import type { BudgetDefaults } from '../types';
import { collection, getDocs, query, orderBy, limit, doc, updateDoc, deleteDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Link } from 'react-router-dom';
import type { Estimate, RoomTemplate, Item, RoomItem } from '../types';
import type { AutoConfigRules, BedroomMixRule } from '../types/config';
import { useBudgetDefaultsStore } from '../store/budgetDefaultsStore';
import { formatCurrency, calculateEstimate } from '../utils/calculations';
import { calculateBedroomCapacity } from '../utils/autoConfiguration';
import { EditIcon, TrashIcon } from '../components/Icons';

// Helper function to create slug from item name
function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// Helper function to generate unique item ID from name
async function generateItemId(itemName: string): Promise<string> {
  const baseSlug = slugify(itemName);
  let itemId = baseSlug;
  let counter = 1;

  // Check if the ID already exists and increment counter if needed
  while (true) {
    const itemDoc = await getDoc(doc(db, 'items', itemId));
    if (!itemDoc.exists()) {
      return itemId;
    }
    itemId = `${baseSlug}_${counter}`;
    counter++;
  }
}

// Helper function to save auto-configuration rules
async function saveAutoConfigRules(rules: AutoConfigRules): Promise<void> {
  const configRef = doc(db, 'config', 'roomMappingRules');
  await setDoc(configRef, {
    ...rules,
    updatedAt: new Date().toISOString()
  });
}

export default function AdminPage() {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [roomTemplates, setRoomTemplates] = useState<RoomTemplate[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [autoConfigRules, setAutoConfigRules] = useState<AutoConfigRules | null>(null);

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
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'estimates' | 'templates' | 'items' | 'autoconfig' | 'defaults'>('estimates');
  const [editingTemplate, setEditingTemplate] = useState<RoomTemplate | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [showCreateItem, setShowCreateItem] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeRoomSizeTab, setActiveRoomSizeTab] = useState<'small' | 'medium' | 'large' | ''>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [autoConfigTab, setAutoConfigTab] = useState<'bedrooms' | 'commonareas' | 'validation'>('bedrooms');
  const [autoConfigUnsavedChanges, setAutoConfigUnsavedChanges] = useState(false);
  const [autoConfigSaving, setAutoConfigSaving] = useState(false);
  const [editingBedroomRule, setEditingBedroomRule] = useState<BedroomMixRule | null>(null);

  // Project defaults state
  const {
    defaults,
    loading: defaultsLoading,
    loadDefaults,
    saveDefaults,
  } = useBudgetDefaultsStore();
  const budgetDefaults = defaults;
  const [localDefaults, setLocalDefaults] = useState<BudgetDefaults | null>(null);
  const [savingBudgetDefaults, setSavingBudgetDefaults] = useState(false);
  const [defaultsError, setDefaultsError] = useState<string | null>(null);
  const [defaultsDirty, setDefaultsDirty] = useState(false);

  useEffect(() => {
    if (defaults && !localDefaults) {
      setLocalDefaults(defaults);
      setDefaultsDirty(false);
    }
  }, [defaults, localDefaults]);

  // Set initial room size tab when editing template opens
  useEffect(() => {
    if (editingTemplate && !activeRoomSizeTab) {
      setActiveRoomSizeTab('small');
      setHasUnsavedChanges(false); // Reset unsaved changes when opening a template
    }
  }, [editingTemplate, activeRoomSizeTab]);

  // Load project defaults when defaults tab becomes active
  useEffect(() => {
    if (activeTab === 'defaults' && !defaults && !defaultsLoading) {
      void loadDefaults();
    }
  }, [activeTab, defaults, defaultsLoading, loadDefaults]);



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
          const sizes = Object.keys(docData.sizes || {}).reduce((acc, key) => {
            if (key === 'small' || key === 'medium' || key === 'large') {
              const sizeData = docData.sizes[key];
              acc[key] = {
                ...sizeData,
                totals: {
                  low: sizeData.totals?.low ?? 0,
                  mid: sizeData.totals?.mid ?? 0,
                  midHigh: sizeData.totals?.midHigh ?? 0,
                  high: sizeData.totals?.high ?? 0,
                }
              };
            }
            return acc;
          }, {} as RoomTemplate['sizes']);
          templatesData.push({
            id: doc.id,
            ...docData,
            sizes,
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
            lowPrice: docData.lowPrice,
            createdAt: docData.createdAt?.toDate ? docData.createdAt.toDate() : docData.createdAt,
            updatedAt: docData.updatedAt?.toDate ? docData.updatedAt.toDate() : docData.updatedAt,
          } as Item);
        });
        console.log(`Loaded ${itemsData.length} items from Firestore`);

        // Fetch auto-configuration rules
        try {
          const configDoc = await getDoc(doc(db, 'config', 'roomMappingRules'));
          if (configDoc.exists()) {
            setAutoConfigRules(configDoc.data() as AutoConfigRules);
            console.log('Loaded auto-configuration rules from Firestore');
          } else {
            console.warn('No auto-configuration rules found in Firestore');
          }
        } catch (error) {
          console.error('Error loading auto-configuration rules:', error);
        }

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
  const updateRoomTemplate = async (templateId: string, updates: Partial<RoomTemplate>, closeModal: boolean = true) => {
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

      try {
        await updateDoc(templateRef, updateData);
        console.log('Firestore update successful');
      } catch (updateErr: any) {
        // If the document doesn't exist, create it
        if (updateErr?.message?.includes('No document to update')) {
          console.log('Document does not exist, creating new document');
          await setDoc(templateRef, updateData);
        } else {
          throw updateErr;
        }
      }

      // Update local state
      setRoomTemplates(prev =>
        prev.map(template =>
          template.id === templateId
            ? { ...template, ...updates, updatedAt: new Date() }
            : template
        )
      );

      // Also update the editingTemplate state if it's the same template
      setEditingTemplate(prev =>
        prev && prev.id === templateId
          ? { ...prev, ...updates, updatedAt: new Date() }
          : prev
      );

      console.log('Local state updated');

      // Only close modal if explicitly requested
      if (closeModal) {
        setEditingTemplate(null);
      }
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

      // Generate custom ID from item name
      const itemId = await generateItemId(itemData.name);

      // Create document with custom ID
      const itemRef = doc(db, 'items', itemId);
      await setDoc(itemRef, newItem);

      // Update local state
      setItems(prev => [...prev, {
        id: itemId,
        ...newItem,
      } as Item]);

      setShowCreateItem(false);
      return itemId;
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

      try {
        await updateDoc(itemRef, {
          ...updates,
          updatedAt: new Date(),
        });
      } catch (updateErr: any) {
        // If the document doesn't exist, create it
        if (updateErr?.message?.includes('No document to update')) {
          console.log('Document does not exist, creating new document');
          await setDoc(itemRef, {
            ...updates,
            updatedAt: new Date(),
          });
        } else {
          throw updateErr;
        }
      }

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

  // Function to delete an estimate
  const deleteEstimate = async (estimateId: string) => {
    if (!confirm('Are you sure you want to delete this estimate? This action cannot be undone.')) {
      return;
    }

    try {
      const estimateRef = doc(db, 'estimates', estimateId);
      await deleteDoc(estimateRef);

      // Update local state
      setEstimates(prev => prev.filter(estimate => estimate.id !== estimateId));

      // Show success message
      alert('Estimate deleted successfully!');
    } catch (error) {
      console.error('Error deleting estimate:', error);
      alert('Failed to delete estimate. Please try again.');
    }
  };

  // Function to update a bedroom rule
  const updateBedroomRule = async (ruleId: string, updates: Partial<BedroomMixRule>) => {
    if (!autoConfigRules) return;

    const updatedRules = autoConfigRules.bedroomMixRules.map(rule =>
      rule.id === ruleId ? { ...rule, ...updates } : rule
    );

    const updatedAutoConfigRules = {
      ...autoConfigRules,
      bedroomMixRules: updatedRules
    };

    setAutoConfigRules(updatedAutoConfigRules);

    // Auto-save to Firestore
    try {
      await saveAutoConfigRules(updatedAutoConfigRules);
      setAutoConfigUnsavedChanges(false);
      console.log('Bedroom rule updated and saved to Firestore');
    } catch (error) {
      console.error('Failed to save bedroom rule to Firestore:', error);
      setAutoConfigUnsavedChanges(true);
      alert('Failed to save changes. Please try again.');
    }

    setEditingBedroomRule(null);
  };


  // Function to calculate totals for a room size
  const calculateRoomTotals = (roomItems: RoomItem[]): { low: number; mid: number; midHigh: number; high: number } => {
    let low = 0, mid = 0, midHigh = 0, high = 0;

    roomItems.forEach(roomItem => {
      const item = items.find(i => i.id === roomItem.itemId);
      if (item) {
        const itemLowPrice = item.lowPrice ?? 0;
        low += itemLowPrice * roomItem.quantity;
        mid += item.midPrice * roomItem.quantity;
        midHigh += item.midHighPrice * roomItem.quantity;
        high += item.highPrice * roomItem.quantity;
      }
    });

    return { low, mid, midHigh, high };
  };

  // Function to get current totals for the active room size (always calculated fresh)
  const getCurrentRoomTotals = (): { low: number; mid: number; midHigh: number; high: number } => {
    if (!editingTemplate || !activeRoomSizeTab) {
      return { low: 0, mid: 0, midHigh: 0, high: 0 };
    }

    if (!activeRoomSizeTab || !(activeRoomSizeTab in editingTemplate.sizes)) {
      return { low: 0, mid: 0, midHigh: 0, high: 0 };
    }
    const sizeData = editingTemplate.sizes[activeRoomSizeTab as 'small' | 'medium' | 'large'];
    return calculateRoomTotals(sizeData.items || []);
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
            <button
              onClick={() => setActiveTab('autoconfig')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'autoconfig'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              👥 Size & Capacity
            </button>
            <button
              onClick={() => setActiveTab('defaults')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'defaults'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              💰 Budget Defaults
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
                              <span className="font-medium">Project Range:</span>{' '}
                              {(() => {
                                const options = estimate.propertySpecs && budgetDefaults
                                  ? { propertySpecs: estimate.propertySpecs, budgetDefaults }
                                  : undefined;
                                const estimateBudget = calculateEstimate(estimate.rooms, roomTemplatesMap, itemsMap, options);
                                if ('projectRange' in estimateBudget) {
                                  return `${formatCurrency(estimateBudget.projectRange.low)} - ${formatCurrency(estimateBudget.projectRange.mid)}`;
                                }
                                return `${formatCurrency(estimateBudget.rangeLow)} - ${formatCurrency(estimateBudget.rangeHigh)}`;
                              })()}
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

                      {/* Edit and Delete buttons */}
                      <div className="flex items-start gap-2">
                        <Link
                          to={`/admin/edit/${estimate.id}`}
                          className="text-sm text-primary-600 hover:text-primary-800 p-2"
                          title="Edit Estimate"
                        >
                          <EditIcon />
                        </Link>
                        <button
                          onClick={() => deleteEstimate(estimate.id)}
                          className="text-sm text-red-600 hover:text-red-800 p-2"
                          title="Delete Estimate"
                        >
                          <TrashIcon />
                        </button>
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
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Rooms
              </h2>
              <p className="text-gray-600">
                Configure items and quantities for each room size
              </p>
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
                            <span>Low: {formatCurrency(calculateRoomTotals(sizeData.items || []).low)}</span>
                            <span>Mid: {formatCurrency(calculateRoomTotals(sizeData.items || []).mid)}</span>
                            <span>Mid/High: {formatCurrency(calculateRoomTotals(sizeData.items || []).midHigh)}</span>
                            <span>High: {formatCurrency(calculateRoomTotals(sizeData.items || []).high)}</span>
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
                      <span className="font-medium">Low:</span> {formatCurrency(item.lowPrice ?? 0)}
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

        {activeTab === 'autoconfig' && (
          <div>
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Size & Capacity Rules
                  </h2>
                  <p className="text-gray-600">
                    Configure automatic room layouts based on square footage and guest capacity
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {autoConfigUnsavedChanges && (
                    <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                      Unsaved Changes
                    </span>
                  )}
                  <button
                    onClick={async () => {
                      if (!autoConfigRules || autoConfigSaving) return;

                      setAutoConfigSaving(true);
                      try {
                        await saveAutoConfigRules(autoConfigRules);
                        setAutoConfigUnsavedChanges(false);
                        console.log('Manual save completed');
                      } catch (error) {
                        console.error('Failed to save auto-configuration rules:', error);
                        alert('Failed to save rules. Please try again.');
                      } finally {
                        setAutoConfigSaving(false);
                      }
                    }}
                    disabled={autoConfigSaving}
                    className={`px-4 py-2 rounded-md text-sm font-medium ${
                      !autoConfigSaving
                        ? 'bg-primary-600 text-white hover:bg-primary-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {autoConfigSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to cancel? Any local changes will be lost.')) {
                        // Reload from original data
                        window.location.reload();
                      }
                    }}
                    className="px-4 py-2 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>

            {/* Auto Config Sub-tabs */}
            <div className="border-b border-gray-200 mb-8">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setAutoConfigTab('bedrooms')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    autoConfigTab === 'bedrooms'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  🛏️ Bedrooms ({autoConfigRules?.bedroomMixRules.length || 0})
                </button>
                <button
                  onClick={() => setAutoConfigTab('commonareas')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    autoConfigTab === 'commonareas'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  🏠 Common Areas
                </button>
                <button
                  onClick={() => setAutoConfigTab('validation')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    autoConfigTab === 'validation'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  ⚙️ Slider Settings
                </button>
              </nav>
            </div>

            {/* Bedrooms Tab */}
            {autoConfigTab === 'bedrooms' && (
              <div className="space-y-6">
                {/* Bunk Capacities */}
                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Bunk Bed Capacities</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Small Bunk (guests)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={autoConfigRules?.bunkCapacities.small || 4}
                        onChange={async (e) => {
                          if (autoConfigRules) {
                            const newValue = parseInt(e.target.value) || 4;
                            const updatedRules = {
                              ...autoConfigRules,
                              bunkCapacities: {
                                ...autoConfigRules.bunkCapacities,
                                small: newValue
                              }
                            };
                            setAutoConfigRules(updatedRules);
                            try {
                              await saveAutoConfigRules(updatedRules);
                              setAutoConfigUnsavedChanges(false);
                            } catch (error) {
                              console.error('Failed to save bunk capacity change:', error);
                              setAutoConfigUnsavedChanges(true);
                            }
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Medium Bunk (guests)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={autoConfigRules?.bunkCapacities.medium || 8}
                        onChange={async (e) => {
                          if (autoConfigRules) {
                            const newValue = parseInt(e.target.value) || 8;
                            const updatedRules = {
                              ...autoConfigRules,
                              bunkCapacities: {
                                ...autoConfigRules.bunkCapacities,
                                medium: newValue
                              }
                            };
                            setAutoConfigRules(updatedRules);
                            try {
                              await saveAutoConfigRules(updatedRules);
                              setAutoConfigUnsavedChanges(false);
                            } catch (error) {
                              console.error('Failed to save bunk capacity change:', error);
                              setAutoConfigUnsavedChanges(true);
                            }
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Large Bunk (guests)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={autoConfigRules?.bunkCapacities.large || 12}
                        onChange={async (e) => {
                          if (autoConfigRules) {
                            const newValue = parseInt(e.target.value) || 12;
                            const updatedRules = {
                              ...autoConfigRules,
                              bunkCapacities: {
                                ...autoConfigRules.bunkCapacities,
                                large: newValue
                              }
                            };
                            setAutoConfigRules(updatedRules);
                            try {
                              await saveAutoConfigRules(updatedRules);
                              setAutoConfigUnsavedChanges(false);
                            } catch (error) {
                              console.error('Failed to save bunk capacity change:', error);
                              setAutoConfigUnsavedChanges(true);
                            }
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Bedroom Rules */}
                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Bedroom Configuration Rules</h3>
                    <button
                      onClick={async () => {
                        // Create new rule with default values
                        const newRule: BedroomMixRule = {
                          id: `r${Date.now()}`,
                          min_sqft: 2000,
                          max_sqft: 2500,
                          min_guests: 10,
                          max_guests: 12,
                          bedrooms: { single: 2, double: 1, bunk: null }
                        };
                        if (autoConfigRules) {
                          const updatedRules = {
                            ...autoConfigRules,
                            bedroomMixRules: [...autoConfigRules.bedroomMixRules, newRule]
                          };
                          setAutoConfigRules(updatedRules);
                          // Auto-save new rule to Firestore
                          try {
                            await saveAutoConfigRules(updatedRules);
                            setAutoConfigUnsavedChanges(false);
                          } catch (error) {
                            console.error('Failed to save new bedroom rule:', error);
                            setAutoConfigUnsavedChanges(true);
                          }
                        }
                      }}
                      className="btn-primary"
                    >
                      + Add Rule
                    </button>
                  </div>

                  <div className="space-y-4">
                    {autoConfigRules?.bedroomMixRules.map((rule) => (
                      <div key={rule.id} className="relative border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-4">
                            <span className="font-medium text-gray-900">
                              {rule.min_sqft}-{rule.max_sqft} sqft, {rule.min_guests}-{rule.max_guests} guests
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setEditingBedroomRule(rule)}
                              className="text-sm text-primary-600 hover:text-primary-800"
                              title="Edit Rule"
                            >
                              <EditIcon />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-sm">
                          <span className="font-medium">Single Rooms:</span> {rule.bedrooms.single}
                          <span className="text-gray-400">|</span>
                          <span className="font-medium">Double Rooms:</span> {rule.bedrooms.double}
                          <span className="text-gray-400">|</span>
                          <span className="font-medium">Bunk Rooms:</span> {rule.bedrooms.bunk || 'None'}
                        </div>

                        <div className="mt-2 text-sm text-gray-600">
                          Total Capacity: {calculateBedroomCapacity(rule.bedrooms, autoConfigRules)} guests
                        </div>

                        <div className="absolute bottom-4 right-4">
                          <button
                            onClick={async () => {
                              if (autoConfigRules) {
                                const updatedRules = {
                                  ...autoConfigRules,
                                  bedroomMixRules: autoConfigRules.bedroomMixRules.filter(r => r.id !== rule.id)
                                };
                                setAutoConfigRules(updatedRules);
                                // Auto-save deleted rule to Firestore
                                try {
                                  await saveAutoConfigRules(updatedRules);
                                  setAutoConfigUnsavedChanges(false);
                                } catch (error) {
                                  console.error('Failed to save deleted bedroom rule:', error);
                                  setAutoConfigUnsavedChanges(true);
                                }
                              }
                            }}
                            className="text-sm text-red-600 hover:text-red-800"
                            title="Delete Rule"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Common Areas Tab */}
            {autoConfigTab === 'commonareas' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  {/* Kitchen */}
                  <div className="card">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">🍳 Kitchen</h3>
                    <div className="space-y-4">
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-sm text-blue-800">
                          <strong>Always Present:</strong> Kitchen is always included in configurations
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Size Rules
                        </label>
                        <div className="space-y-3">
                          {['small', 'medium', 'large'].map((size) => {
                            const threshold = autoConfigRules?.commonAreas.kitchen.size.thresholds.find(t => t.size === size);
                            const minValue = threshold?.min_sqft || '';
                            const maxValue = threshold?.max_sqft || '';

                            return (
                              <div key={size} className="flex items-center gap-2">
                                <span className="w-16 text-sm capitalize">{size}:</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={minValue}
                                  onChange={(e) => {
                                    if (autoConfigRules) {
                                      const newThresholds = [...autoConfigRules.commonAreas.kitchen.size.thresholds];
                                      const existingIndex = newThresholds.findIndex(t => t.size === size);

                                      if (existingIndex >= 0) {
                                        newThresholds[existingIndex] = {
                                          ...newThresholds[existingIndex],
                                          min_sqft: parseInt(e.target.value) || undefined
                                        };
                                      } else {
                                        newThresholds.push({
                                          size: size as any,
                                          min_sqft: parseInt(e.target.value) || undefined
                                        });
                                      }

                                      const updatedRules = {
                                        ...autoConfigRules,
                                        commonAreas: {
                                          ...autoConfigRules.commonAreas,
                                          kitchen: {
                                            ...autoConfigRules.commonAreas.kitchen,
                                            size: {
                                              ...autoConfigRules.commonAreas.kitchen.size,
                                              thresholds: newThresholds
                                            }
                                          }
                                        }
                                      };
                                      setAutoConfigRules(updatedRules);
                                    }
                                  }}
                                  placeholder="Min"
                                  className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                                <span className="text-sm">to</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={maxValue}
                                  onChange={async (e) => {
                                    if (autoConfigRules) {
                                      const newThresholds = [...autoConfigRules.commonAreas.kitchen.size.thresholds];
                                      const existingIndex = newThresholds.findIndex(t => t.size === size);

                                      if (existingIndex >= 0) {
                                        newThresholds[existingIndex] = {
                                          ...newThresholds[existingIndex],
                                          max_sqft: parseInt(e.target.value) || undefined
                                        };
                                      } else {
                                        newThresholds.push({
                                          size: size as any,
                                          max_sqft: parseInt(e.target.value) || undefined
                                        });
                                      }

                                      const updatedRules = {
                                        ...autoConfigRules,
                                        commonAreas: {
                                          ...autoConfigRules.commonAreas,
                                          kitchen: {
                                            ...autoConfigRules.commonAreas.kitchen,
                                            size: {
                                              ...autoConfigRules.commonAreas.kitchen.size,
                                              thresholds: newThresholds
                                            }
                                          }
                                        }
                                      };
                                      setAutoConfigRules(updatedRules);
                                      try {
                                        await saveAutoConfigRules(updatedRules);
                                        setAutoConfigUnsavedChanges(false);
                                      } catch (error) {
                                        console.error('Failed to save kitchen size change:', error);
                                        setAutoConfigUnsavedChanges(true);
                                      }
                                    }
                                  }}
                                  placeholder="No limit"
                                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                                <span className="text-sm">sqft</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Living Room */}
                  <div className="card">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">🛋️ Living Room</h3>
                    <div className="space-y-4">
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-sm text-blue-800">
                          <strong>Always Present:</strong> Living room is always included in configurations
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Size Rules
                        </label>
                        <div className="space-y-3">
                          {['small', 'medium', 'large'].map((size) => {
                            const threshold = autoConfigRules?.commonAreas.living.size.thresholds.find(t => t.size === size);
                            const minValue = threshold?.min_sqft || '';
                            const maxValue = threshold?.max_sqft || '';

                            return (
                              <div key={size} className="flex items-center gap-2">
                                <span className="w-16 text-sm capitalize">{size}:</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={minValue}
                                  onChange={(e) => {
                                    if (autoConfigRules) {
                                      const newThresholds = [...autoConfigRules.commonAreas.living.size.thresholds];
                                      const existingIndex = newThresholds.findIndex(t => t.size === size);

                                      if (existingIndex >= 0) {
                                        newThresholds[existingIndex] = {
                                          ...newThresholds[existingIndex],
                                          min_sqft: parseInt(e.target.value) || undefined
                                        };
                                      } else {
                                        newThresholds.push({
                                          size: size as any,
                                          min_sqft: parseInt(e.target.value) || undefined
                                        });
                                      }

                                      setAutoConfigRules({
                                        ...autoConfigRules,
                                        commonAreas: {
                                          ...autoConfigRules.commonAreas,
                                          living: {
                                            ...autoConfigRules.commonAreas.living,
                                            size: {
                                              ...autoConfigRules.commonAreas.living.size,
                                              thresholds: newThresholds
                                            }
                                          }
                                        }
                                      });
                                    }
                                  }}
                                  placeholder="Min"
                                  className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                                <span className="text-sm">to</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={maxValue}
                                  onChange={(e) => {
                                    if (autoConfigRules) {
                                      const newThresholds = [...autoConfigRules.commonAreas.living.size.thresholds];
                                      const existingIndex = newThresholds.findIndex(t => t.size === size);

                                      if (existingIndex >= 0) {
                                        newThresholds[existingIndex] = {
                                          ...newThresholds[existingIndex],
                                          max_sqft: parseInt(e.target.value) || undefined
                                        };
                                      } else {
                                        newThresholds.push({
                                          size: size as any,
                                          max_sqft: parseInt(e.target.value) || undefined
                                        });
                                      }

                                      setAutoConfigRules({
                                        ...autoConfigRules,
                                        commonAreas: {
                                          ...autoConfigRules.commonAreas,
                                          living: {
                                            ...autoConfigRules.commonAreas.living,
                                            size: {
                                              ...autoConfigRules.commonAreas.living.size,
                                              thresholds: newThresholds
                                            }
                                          }
                                        }
                                      });
                                    }
                                  }}
                                  placeholder="No limit"
                                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                                <span className="text-sm">sqft</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dining */}
                  <div className="card">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">🍽️ Dining</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Presence Rules
                        </label>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={autoConfigRules?.commonAreas.dining.presence.present_if_sqft_gte !== undefined}
                              onChange={async (e) => {
                                if (autoConfigRules) {
                                  const updatedRules = {
                                    ...autoConfigRules,
                                    commonAreas: {
                                      ...autoConfigRules.commonAreas,
                                      dining: {
                                        ...autoConfigRules.commonAreas.dining,
                                        presence: {
                                          ...autoConfigRules.commonAreas.dining.presence,
                                          present_if_sqft_gte: e.target.checked ? 1600 : undefined
                                        }
                                      }
                                    }
                                  };
                                  setAutoConfigRules(updatedRules);
                                  try {
                                    await saveAutoConfigRules(updatedRules);
                                    setAutoConfigUnsavedChanges(false);
                                  } catch (error) {
                                    console.error('Failed to save dining presence change:', error);
                                    setAutoConfigUnsavedChanges(true);
                                  }
                                }
                              }}
                              className="rounded border-gray-300"
                            />
                            <span className="text-sm">Present if ≥ </span>
                            <input
                              type="number"
                              min="0"
                              value={autoConfigRules?.commonAreas.dining.presence.present_if_sqft_gte || 1600}
                              onChange={async (e) => {
                                if (autoConfigRules) {
                                  const updatedRules = {
                                    ...autoConfigRules,
                                    commonAreas: {
                                      ...autoConfigRules.commonAreas,
                                      dining: {
                                        ...autoConfigRules.commonAreas.dining,
                                        presence: {
                                          ...autoConfigRules.commonAreas.dining.presence,
                                          present_if_sqft_gte: parseInt(e.target.value) || 1600
                                        }
                                      }
                                    }
                                  };
                                  setAutoConfigRules(updatedRules);
                                  try {
                                    await saveAutoConfigRules(updatedRules);
                                    setAutoConfigUnsavedChanges(false);
                                  } catch (error) {
                                    console.error('Failed to save dining threshold change:', error);
                                    setAutoConfigUnsavedChanges(true);
                                  }
                                }
                              }}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                              disabled={autoConfigRules?.commonAreas.dining.presence.present_if_sqft_gte === undefined}
                            />
                            <span className="text-sm">sqft</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Size Rules
                        </label>
                        <div className="space-y-3">
                          {['small', 'medium', 'large'].map((size) => {
                            const threshold = autoConfigRules?.commonAreas.dining.size.thresholds.find(t => t.size === size);
                            const minValue = threshold?.min_sqft || '';
                            const maxValue = threshold?.max_sqft || '';

                            return (
                              <div key={size} className="flex items-center gap-2">
                                <span className="w-16 text-sm capitalize">{size}:</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={minValue}
                                  onChange={(e) => {
                                    if (autoConfigRules) {
                                      const newThresholds = [...autoConfigRules.commonAreas.dining.size.thresholds];
                                      const existingIndex = newThresholds.findIndex(t => t.size === size);

                                      if (existingIndex >= 0) {
                                        newThresholds[existingIndex] = {
                                          ...newThresholds[existingIndex],
                                          min_sqft: parseInt(e.target.value) || undefined
                                        };
                                      } else {
                                        newThresholds.push({
                                          size: size as any,
                                          min_sqft: parseInt(e.target.value) || undefined
                                        });
                                      }

                                      const updatedRules = {
                                        ...autoConfigRules,
                                        commonAreas: {
                                          ...autoConfigRules.commonAreas,
                                          dining: {
                                            ...autoConfigRules.commonAreas.dining,
                                            size: {
                                              ...autoConfigRules.commonAreas.dining.size,
                                              thresholds: newThresholds
                                            }
                                          }
                                        }
                                      };
                                      setAutoConfigRules(updatedRules);
                                    }
                                  }}
                                  placeholder="Min"
                                  className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                                <span className="text-sm">to</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={maxValue}
                                  onChange={async (e) => {
                                    if (autoConfigRules) {
                                      const newThresholds = [...autoConfigRules.commonAreas.dining.size.thresholds];
                                      const existingIndex = newThresholds.findIndex(t => t.size === size);

                                      if (existingIndex >= 0) {
                                        newThresholds[existingIndex] = {
                                          ...newThresholds[existingIndex],
                                          max_sqft: parseInt(e.target.value) || undefined
                                        };
                                      } else {
                                        newThresholds.push({
                                          size: size as any,
                                          max_sqft: parseInt(e.target.value) || undefined
                                        });
                                      }

                                      const updatedRules = {
                                        ...autoConfigRules,
                                        commonAreas: {
                                          ...autoConfigRules.commonAreas,
                                          dining: {
                                            ...autoConfigRules.commonAreas.dining,
                                            size: {
                                              ...autoConfigRules.commonAreas.dining.size,
                                              thresholds: newThresholds
                                            }
                                          }
                                        }
                                      };
                                      setAutoConfigRules(updatedRules);
                                      try {
                                        await saveAutoConfigRules(updatedRules);
                                        setAutoConfigUnsavedChanges(false);
                                      } catch (error) {
                                        console.error('Failed to save dining size change:', error);
                                        setAutoConfigUnsavedChanges(true);
                                      }
                                    }
                                  }}
                                  placeholder="No limit"
                                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                                <span className="text-sm">sqft</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Rec Room */}
                  <div className="card">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">🎮 Rec Room</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Presence Rules
                        </label>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={autoConfigRules?.commonAreas.recRoom.presence.present_if_sqft_gte !== undefined}
                              onChange={(e) => {
                                if (autoConfigRules) {
                                  setAutoConfigRules({
                                    ...autoConfigRules,
                                    commonAreas: {
                                      ...autoConfigRules.commonAreas,
                                      recRoom: {
                                        ...autoConfigRules.commonAreas.recRoom,
                                        presence: {
                                          ...autoConfigRules.commonAreas.recRoom.presence,
                                          present_if_sqft_gte: e.target.checked ? 2600 : undefined
                                        }
                                      }
                                    }
                                  });
                                }
                              }}
                              className="rounded border-gray-300"
                            />
                            <span className="text-sm">Present if ≥ </span>
                            <input
                              type="number"
                              min="0"
                              value={autoConfigRules?.commonAreas.recRoom.presence.present_if_sqft_gte || 2600}
                              onChange={(e) => {
                                if (autoConfigRules) {
                                  setAutoConfigRules({
                                    ...autoConfigRules,
                                    commonAreas: {
                                      ...autoConfigRules.commonAreas,
                                      recRoom: {
                                        ...autoConfigRules.commonAreas.recRoom,
                                        presence: {
                                          ...autoConfigRules.commonAreas.recRoom.presence,
                                          present_if_sqft_gte: parseInt(e.target.value) || 2600
                                        }
                                      }
                                    }
                                  });
                                }
                              }}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                              disabled={autoConfigRules?.commonAreas.recRoom.presence.present_if_sqft_gte === undefined}
                            />
                            <span className="text-sm">sqft</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Size Rules
                        </label>
                        <div className="space-y-3">
                          {['small', 'medium', 'large'].map((size) => {
                            const threshold = autoConfigRules?.commonAreas.recRoom.size.thresholds.find(t => t.size === size);
                            const minValue = threshold?.min_sqft || '';
                            const maxValue = threshold?.max_sqft || '';

                            return (
                              <div key={size} className="flex items-center gap-2">
                                <span className="w-16 text-sm capitalize">{size}:</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={minValue}
                                  onChange={async (e) => {
                                    if (autoConfigRules) {
                                      const newThresholds = [...autoConfigRules.commonAreas.recRoom.size.thresholds];
                                      const existingIndex = newThresholds.findIndex(t => t.size === size);

                                      if (existingIndex >= 0) {
                                        newThresholds[existingIndex] = {
                                          ...newThresholds[existingIndex],
                                          min_sqft: parseInt(e.target.value) || undefined
                                        };
                                      } else {
                                        newThresholds.push({
                                          size: size as any,
                                          min_sqft: parseInt(e.target.value) || undefined
                                        });
                                      }

                                      const updatedRules = {
                                        ...autoConfigRules,
                                        commonAreas: {
                                          ...autoConfigRules.commonAreas,
                                          recRoom: {
                                            ...autoConfigRules.commonAreas.recRoom,
                                            size: {
                                              ...autoConfigRules.commonAreas.recRoom.size,
                                              thresholds: newThresholds
                                            }
                                          }
                                        }
                                      };

                                      setAutoConfigRules(updatedRules);
                                      setAutoConfigUnsavedChanges(true);

                                      // Auto-save to Firestore
                                      try {
                                        await saveAutoConfigRules(updatedRules);
                                        setAutoConfigUnsavedChanges(false);
                                        console.log('Rec room min threshold updated and saved to Firestore');
                                      } catch (error) {
                                        console.error('Failed to save rec room min threshold to Firestore:', error);
                                        setAutoConfigUnsavedChanges(true);
                                        alert('Failed to save changes. Please try again.');
                                      }
                                    }
                                  }}
                                  placeholder="Min"
                                  className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                                <span className="text-sm">to</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={maxValue}
                                  onChange={async (e) => {
                                    if (autoConfigRules) {
                                      const newThresholds = [...autoConfigRules.commonAreas.recRoom.size.thresholds];
                                      const existingIndex = newThresholds.findIndex(t => t.size === size);

                                      if (existingIndex >= 0) {
                                        newThresholds[existingIndex] = {
                                          ...newThresholds[existingIndex],
                                          max_sqft: parseInt(e.target.value) || undefined
                                        };
                                      } else {
                                        newThresholds.push({
                                          size: size as any,
                                          max_sqft: parseInt(e.target.value) || undefined
                                        });
                                      }

                                      const updatedRules = {
                                        ...autoConfigRules,
                                        commonAreas: {
                                          ...autoConfigRules.commonAreas,
                                          recRoom: {
                                            ...autoConfigRules.commonAreas.recRoom,
                                            size: {
                                              ...autoConfigRules.commonAreas.recRoom.size,
                                              thresholds: newThresholds
                                            }
                                          }
                                        }
                                      };

                                      setAutoConfigRules(updatedRules);
                                      setAutoConfigUnsavedChanges(true);

                                      // Auto-save to Firestore
                                      try {
                                        await saveAutoConfigRules(updatedRules);
                                        setAutoConfigUnsavedChanges(false);
                                        console.log('Rec room max threshold updated and saved to Firestore');
                                      } catch (error) {
                                        console.error('Failed to save rec room max threshold to Firestore:', error);
                                        setAutoConfigUnsavedChanges(true);
                                        alert('Failed to save changes. Please try again.');
                                      }
                                    }
                                  }}
                                  placeholder="No limit"
                                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                                <span className="text-sm">sqft</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Validation Tab */}
            {autoConfigTab === 'validation' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="card">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Global Limits</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Min Sqft
                        </label>
                        <input
                          type="number"
                          step="100"
                          value={autoConfigRules?.validation.global.min_sqft || ''}
                          onChange={(e) => {
                            if (autoConfigRules) {
                              setAutoConfigRules({
                                ...autoConfigRules,
                                validation: {
                                  ...autoConfigRules.validation,
                                  global: {
                                    ...autoConfigRules.validation.global,
                                    min_sqft: parseInt(e.target.value) || 0
                                  }
                                }
                              });
                            }
                          }}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Max Sqft
                        </label>
                        <input
                          type="number"
                          step="100"
                          value={autoConfigRules?.validation.global.max_sqft || ''}
                          onChange={(e) => {
                            if (autoConfigRules) {
                              setAutoConfigRules({
                                ...autoConfigRules,
                                validation: {
                                  ...autoConfigRules.validation,
                                  global: {
                                    ...autoConfigRules.validation.global,
                                    max_sqft: parseInt(e.target.value) || 0
                                  }
                                }
                              });
                            }
                          }}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Min Guests
                        </label>
                        <input
                          type="number"
                          value={autoConfigRules?.validation.global.min_guests || ''}
                          onChange={(e) => {
                            if (autoConfigRules) {
                              setAutoConfigRules({
                                ...autoConfigRules,
                                validation: {
                                  ...autoConfigRules.validation,
                                  global: {
                                    ...autoConfigRules.validation.global,
                                    min_guests: parseInt(e.target.value) || 0
                                  }
                                }
                              });
                            }
                          }}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Max Guests
                        </label>
                        <input
                          type="number"
                          value={autoConfigRules?.validation.global.max_guests || ''}
                          onChange={(e) => {
                            if (autoConfigRules) {
                              setAutoConfigRules({
                                ...autoConfigRules,
                                validation: {
                                  ...autoConfigRules.validation,
                                  global: {
                                    ...autoConfigRules.validation.global,
                                    max_guests: parseInt(e.target.value) || 0
                                  }
                                }
                              });
                            }
                          }}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'defaults' && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Budget Defaults
              </h2>
              <p className="text-gray-600">
                Configure default costs for project add-ons and fees
              </p>
            </div>

            {defaultsLoading ? (
              <div className="card text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading budget defaults...</p>
              </div>
            ) : localDefaults ? (
              <div className="card">
                <div className="space-y-6">
                  <div className="grid gap-6">
                    {[
                      { key: 'installationCents', label: 'Installation', prefix: '$', allowCents: false },
                      { key: 'kitchenCents', label: 'Kitchen Setup', prefix: '$', allowCents: false },
                      { key: 'fuelCents', label: 'Fuel', prefix: '$', allowCents: false },
                      { key: 'propertyManagementCents', label: 'Property Management', prefix: '$', allowCents: false },
                      { key: 'storageAndReceivingCents', label: 'Storage & Receiving', prefix: '$', allowCents: false },
                      { key: 'designFeeRatePerSqftCents', label: 'Design Fee', prefix: '$/sqft', allowCents: true },
                    ].map(({ key, label, prefix, allowCents }) => {
                      const isDesignFee = key === 'designFeeRatePerSqftCents';
                      const dollarValue = isDesignFee
                        ? (localDefaults?.designFeeRatePerSqftCents ?? 0) / 100
                        : (localDefaults?.[key as keyof BudgetDefaults] as number ?? 0) / 100;
                      const displayValue = allowCents ? dollarValue.toFixed(2) : Math.floor(dollarValue);

                      return (
                        <div key={key as string}>
                          <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
                          <div className="flex items-center border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-primary-500">
                            <span className="pl-3 pr-2 text-gray-500 whitespace-nowrap">
                              {prefix}
                            </span>
                            <input
                              type="text"
                              value={displayValue}
                              onChange={(e) => {
                                // Remove any non-numeric characters except decimal point
                                let cleanValue = e.target.value.replace(/[^0-9.]/g, '');

                                // Ensure only one decimal point
                                const parts = cleanValue.split('.');
                                if (parts.length > 2) {
                                  cleanValue = parts[0] + '.' + parts.slice(1).join('');
                                }

                                // Limit decimal places
                                if (parts.length === 2 && parts[1].length > (allowCents ? 2 : 0)) {
                                  cleanValue = parts[0] + '.' + parts[1].substring(0, allowCents ? 2 : 0);
                                }

                                // Convert to cents and update
                                const rawValue = parseFloat(cleanValue);
                                const centsValue = isNaN(rawValue) ? 0 : Math.round(rawValue * 100);

                                setLocalDefaults((prev) => prev ? {
                                  ...prev,
                                  [key]: centsValue,
                                } as BudgetDefaults : prev);
                                setDefaultsDirty(true);
                              }}
                              onBlur={(e) => {
                                // Format the value on blur for consistency
                                const rawValue = parseFloat(e.target.value);
                                if (!isNaN(rawValue)) {
                                  const formattedValue = allowCents ? rawValue.toFixed(2) : Math.floor(rawValue).toString();
                                  // Update the display without triggering onChange
                                  const input = e.target;
                                  const cursorPosition = input.selectionStart;
                                  input.value = formattedValue;
                                  // Restore cursor position
                                  input.setSelectionRange(cursorPosition, cursorPosition);
                                }
                              }}
                              className="flex-1 bg-transparent border-0 focus:outline-none focus:ring-0 py-2 pr-3"
                              placeholder={allowCents ? "0.00" : "0"}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {defaultsError && (
                    <div className="text-sm text-red-600">{defaultsError}</div>
                  )}

                  <div className="flex justify-end gap-3">
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        setLocalDefaults(defaults);
                        setDefaultsDirty(false);
                        setDefaultsError(null);
                      }}
                      disabled={!defaultsDirty}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn-primary"
                      onClick={async () => {
                        if (!localDefaults) return;
                        setDefaultsError(null);
                        setSavingBudgetDefaults(true);
                        try {
                          await saveDefaults(localDefaults);
                          setDefaultsDirty(false);
                        } catch (error) {
                          console.error('Failed to save budget defaults:', error);
                          setDefaultsError('Failed to save changes. Please try again.');
                        } finally {
                          setSavingBudgetDefaults(false);
                        }
                      }}
                      disabled={!defaultsDirty || savingBudgetDefaults}
                    >
                      {savingBudgetDefaults ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card text-center py-12">
                <p className="text-gray-600 text-lg">
                  No budget defaults available
                </p>
                <button
                  onClick={() => loadDefaults()}
                  className="btn-primary mt-4"
                >
                  Load Defaults
                </button>
              </div>
            )}
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
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Edit Room Template: {editingTemplate.displayName}
                    </h2>
                    {hasUnsavedChanges && (
                      <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                        Unsaved Changes
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={async () => {
                        if (!editingTemplate || !hasUnsavedChanges || isSaving) return;

                        setIsSaving(true);
                        try {
                          await updateRoomTemplate(editingTemplate.id, editingTemplate, false);
                          setHasUnsavedChanges(false);
                          // Success is indicated by the badge disappearing
                        } catch (error) {
                          console.error('Failed to save template:', error);
                          alert('Failed to save template. Please try again.');
                        } finally {
                          setIsSaving(false);
                        }
                      }}
                      disabled={!hasUnsavedChanges || isSaving}
                      className={`px-4 py-2 rounded-md text-sm font-medium ${
                        hasUnsavedChanges && !isSaving
                          ? 'bg-primary-600 text-white hover:bg-primary-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {isSaving ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Saving...
                        </div>
                      ) : (
                        'Save Changes'
                      )}
                    </button>
                    <button
                      onClick={() => {
                        if (hasUnsavedChanges && !confirm('You have unsaved changes. Are you sure you want to close?')) {
                          return;
                        }
                        setEditingTemplate(null);
                        setActiveRoomSizeTab('');
                        setHasUnsavedChanges(false);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Room Size Tabs */}
                <div className="border-b border-gray-200 mb-1">
                  <nav className="-mb-px flex space-x-8 overflow-x-auto">
                    {(['small', 'medium', 'large'] as const).map((sizeKey) => (
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
              {activeRoomSizeTab && activeRoomSizeTab in editingTemplate.sizes && (
                <div className="px-6 pb-6">
                  <div className="p-3 bg-gray-50 rounded-lg border">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                          Budget
                        </div>
                        <div className="text-lg font-bold text-primary-500">
                          {formatCurrency(getCurrentRoomTotals().low)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                          Mid
                        </div>
                        <div className="text-lg font-bold text-primary-600">
                          {formatCurrency(getCurrentRoomTotals().mid)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                          Mid/High
                        </div>
                        <div className="text-lg font-bold text-primary-900">
                          {formatCurrency(getCurrentRoomTotals().midHigh)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                          High
                        </div>
                        <div className="text-lg font-bold text-black">
                          {formatCurrency(getCurrentRoomTotals().high)}
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
                {activeRoomSizeTab && activeRoomSizeTab in editingTemplate.sizes && (
                  <div className="sticky top-0 z-10 bg-white border-b border-gray-200 pb-1 mb-4">
                    <div className="rounded p-3">
                      <select
                        className="w-full p-2 border border-gray-300 rounded"
                        onChange={(e) => {
                          if (e.target.value) {
                            const newItemId = e.target.value;
                            const sizeData = editingTemplate.sizes[activeRoomSizeTab as 'small' | 'medium' | 'large'];
                            console.log('Adding item to room:', { newItemId, sizeKey: activeRoomSizeTab, editingTemplateId: editingTemplate.id });

                            const newItems = [...sizeData.items, { itemId: newItemId, quantity: 1 }];
                            const newTotals = calculateRoomTotals(newItems);

                            console.log('New items array:', newItems);
                            console.log('New totals:', newTotals);

                            // Update editingTemplate state directly for immediate UI feedback
                            setEditingTemplate(prev => prev ? {
                              ...prev,
                              sizes: {
                                ...prev.sizes,
                                [activeRoomSizeTab]: {
                                  ...sizeData,
                                  items: newItems,
                                  totals: newTotals,
                                },
                              },
                              updatedAt: new Date(),
                            } : null);

                            setHasUnsavedChanges(true);

                            e.target.value = '';
                          }
                        }}
                      >
                        <option value="">+ Add Item</option>
                        {items
                          .filter(item => !editingTemplate.sizes[activeRoomSizeTab as 'small' | 'medium' | 'large'].items.some((roomItem: RoomItem) => roomItem.itemId === item.id))
                          .sort((a, b) => a.name.localeCompare(b.name))
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
                {activeRoomSizeTab && activeRoomSizeTab in editingTemplate.sizes && (
                  <div className="space-y-6">
                    <div className="border rounded-lg p-4">
                      <h3 className="font-medium text-gray-900 mb-4 capitalize">
                        {activeRoomSizeTab} Items
                      </h3>

                      <div className="space-y-3">
                        {editingTemplate.sizes[activeRoomSizeTab as 'small' | 'medium' | 'large'].items
                          .sort((a: RoomItem, b: RoomItem) => {
                            const itemA = items.find(i => i.id === a.itemId);
                            const itemB = items.find(i => i.id === b.itemId);
                            const nameA = itemA?.name || a.itemId;
                            const nameB = itemB?.name || b.itemId;
                            return nameA.localeCompare(nameB);
                          })
                          .map((roomItem: RoomItem, index: number) => {
                          const item = items.find(i => i.id === roomItem.itemId);
                          return (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                              <div className="flex-1">
                                <span className="font-medium text-gray-900">
                                  {item?.name || 'Unknown Item'}
                                </span>
                                <div className="text-sm text-gray-600 mt-1">
                                  Low: {formatCurrency(item?.lowPrice ?? 0)} |
                                  Mid: {formatCurrency(item?.midPrice ?? 0)} |
                                  High: {formatCurrency(item?.highPrice ?? 0)}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">Qty:</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={roomItem.quantity === 0 ? '' : (roomItem.quantity || '')}
                                  onChange={(e) => {
                                    const inputValue = e.target.value;

                                    // Handle empty input (user deleted everything or entered nothing)
                                    if (inputValue === '') {
                                      const sizeData = editingTemplate.sizes[activeRoomSizeTab as 'small' | 'medium' | 'large'];
                                      const newItems = [...sizeData.items];
                                      newItems[index] = { ...roomItem, quantity: 0 };

                                      const newTotals = calculateRoomTotals(newItems);

                                      setEditingTemplate(prev => prev ? {
                                        ...prev,
                                        sizes: {
                                          ...prev.sizes,
                                          [activeRoomSizeTab]: {
                                            ...sizeData,
                                            items: newItems,
                                            totals: newTotals,
                                          },
                                        },
                                        updatedAt: new Date(),
                                      } : null);

                                      setHasUnsavedChanges(true);
                                      return;
                                    }

                                    const newQuantity = parseInt(inputValue) || 0;

                                    // Skip if no change
                                    if (newQuantity === roomItem.quantity) {
                                      return;
                                    }

                                    const sizeData = editingTemplate.sizes[activeRoomSizeTab as 'small' | 'medium' | 'large'];
                                    const newItems = [...sizeData.items];
                                    newItems[index] = { ...roomItem, quantity: newQuantity };

                                    const newTotals = calculateRoomTotals(newItems);

                                    // Update state
                                    setEditingTemplate(prev => prev ? {
                                      ...prev,
                                      sizes: {
                                        ...prev.sizes,
                                        [activeRoomSizeTab]: {
                                          ...sizeData,
                                          items: newItems,
                                          totals: newTotals,
                                        },
                                      },
                                      updatedAt: new Date(),
                                    } : null);

                                    setHasUnsavedChanges(true);
                                  }}
                                  onBlur={(e) => {
                                    const inputValue = e.target.value;

                                    // If empty on blur, ensure it's set to 0
                                    if (inputValue === '' || inputValue === '0') {
                                      e.target.value = '0';

                                      const sizeData = editingTemplate.sizes[activeRoomSizeTab as 'small' | 'medium' | 'large'];
                                      const newItems = [...sizeData.items];
                                      newItems[index] = { ...roomItem, quantity: 0 };

                                      const newTotals = calculateRoomTotals(newItems);

                                      setEditingTemplate(prev => prev ? {
                                        ...prev,
                                        sizes: {
                                          ...prev.sizes,
                                          [activeRoomSizeTab]: {
                                            ...sizeData,
                                            items: newItems,
                                            totals: newTotals,
                                          },
                                        },
                                        updatedAt: new Date(),
                                      } : null);

                                      setHasUnsavedChanges(true);
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    // Handle the case where user tries to delete the last digit
                                    if ((e.key === 'Backspace' || e.key === 'Delete') && e.target instanceof HTMLInputElement) {
                                      const input = e.target;
                                      if (input.value.length === 1 && input.selectionStart === 1 && input.selectionEnd === 1) {
                                        // User is trying to delete the last single digit
                                        e.preventDefault();
                                        input.value = '';
                                        // Trigger onChange to handle empty value
                                        input.dispatchEvent(new Event('input', { bubbles: true }));
                                        return;
                                      }
                                    }
                                  }}
                                  className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                                <button
                                  onClick={() => {
                                    const sizeData = editingTemplate.sizes[activeRoomSizeTab as 'small' | 'medium' | 'large'];
                                    const newItems = sizeData.items.filter((_: RoomItem, i: number) => i !== index);
                                    const newTotals = calculateRoomTotals(newItems);

                                    // Update editingTemplate state directly for immediate UI feedback
                                    setEditingTemplate(prev => prev ? {
                                      ...prev,
                                      sizes: {
                                        ...prev.sizes,
                                        [activeRoomSizeTab]: {
                                          ...sizeData,
                                          items: newItems,
                                          totals: newTotals,
                                        },
                                      },
                                      updatedAt: new Date(),
                                    } : null);

                                    setHasUnsavedChanges(true);
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

      {/* Edit Bedroom Rule Modal */}
      {editingBedroomRule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Edit Bedroom Configuration Rule
                </h2>
                <button
                  onClick={() => setEditingBedroomRule(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <BedroomRuleForm
                rule={editingBedroomRule}
                onSubmit={(updates) => updateBedroomRule(editingBedroomRule.id, updates)}
                onCancel={() => setEditingBedroomRule(null)}
                autoConfigRules={autoConfigRules}
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
    lowPrice: item?.lowPrice ? Math.round(item.lowPrice / 100) : 0,
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
      lowPrice: Math.round(formData.lowPrice * 100),
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
              Low Quality
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.lowPrice || ''}
              onChange={(e) => {
                const value = e.target.value;
                setFormData(prev => ({ ...prev, lowPrice: value === '' ? 0 : parseFloat(value) || 0 }));
              }}
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
              value={formData.midPrice || ''}
              onChange={(e) => {
                const value = e.target.value;
                setFormData(prev => ({ ...prev, midPrice: value === '' ? 0 : parseFloat(value) || 0 }));
              }}
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
              value={formData.midHighPrice || ''}
              onChange={(e) => {
                const value = e.target.value;
                setFormData(prev => ({ ...prev, midHighPrice: value === '' ? 0 : parseFloat(value) || 0 }));
              }}
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
              value={formData.highPrice || ''}
              onChange={(e) => {
                const value = e.target.value;
                setFormData(prev => ({ ...prev, highPrice: value === '' ? 0 : parseFloat(value) || 0 }));
              }}
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

// Bedroom Rule Form Component
function BedroomRuleForm({
  rule,
  onSubmit,
  onCancel,
  autoConfigRules
}: {
  rule: BedroomMixRule;
  onSubmit: (updates: Partial<BedroomMixRule>) => void;
  onCancel: () => void;
  autoConfigRules: AutoConfigRules | null;
}) {
  const [formData, setFormData] = useState({
    min_sqft: rule.min_sqft,
    max_sqft: rule.max_sqft,
    min_guests: rule.min_guests,
    max_guests: rule.max_guests,
    bedrooms: rule.bedrooms
  });

  // Calculate total capacity reactively using the proper utility function
  const totalCapacity = useMemo(() => {
    if (!autoConfigRules) return 0;
    return calculateBedroomCapacity(formData.bedrooms, autoConfigRules);
  }, [formData.bedrooms, autoConfigRules]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Min Square Footage
          </label>
          <input
            type="number"
            min="0"
            step="100"
            value={formData.min_sqft}
            onChange={(e) => setFormData(prev => ({ ...prev, min_sqft: parseInt(e.target.value) || 0 }))}
            className="w-full p-2 border border-gray-300 rounded"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Max Square Footage
          </label>
          <input
            type="number"
            min="0"
            step="100"
            value={formData.max_sqft}
            onChange={(e) => setFormData(prev => ({ ...prev, max_sqft: parseInt(e.target.value) || 0 }))}
            className="w-full p-2 border border-gray-300 rounded"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Min Guests
          </label>
          <input
            type="number"
            min="0"
            value={formData.min_guests}
            onChange={(e) => setFormData(prev => ({ ...prev, min_guests: parseInt(e.target.value) || 0 }))}
            className="w-full p-2 border border-gray-300 rounded"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Max Guests
          </label>
          <input
            type="number"
            min="0"
            value={formData.max_guests}
            onChange={(e) => setFormData(prev => ({ ...prev, max_guests: parseInt(e.target.value) || 0 }))}
            className="w-full p-2 border border-gray-300 rounded"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-4">
          Bedroom Configuration
        </label>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Single Rooms
            </label>
            <input
              type="number"
              min="0"
              value={formData.bedrooms.single}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                bedrooms: { ...prev.bedrooms, single: parseInt(e.target.value) || 0 }
              }))}
              className="w-full p-2 border border-gray-300 rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Double Rooms
            </label>
            <input
              type="number"
              min="0"
              value={formData.bedrooms.double}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                bedrooms: { ...prev.bedrooms, double: parseInt(e.target.value) || 0 }
              }))}
              className="w-full p-2 border border-gray-300 rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Bunk Room Size
            </label>
            <select
              value={formData.bedrooms.bunk || ''}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                bedrooms: { ...prev.bedrooms, bunk: e.target.value as any }
              }))}
              className="w-full p-2 border border-gray-300 rounded"
            >
              <option value="">None</option>
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-2">Capacity Check:</p>
          <p>
            Total capacity: {totalCapacity} guests
          </p>
          <p>
            Required capacity: {formData.max_guests} guests
          </p>
          {totalCapacity < formData.max_guests && (
            <p className="text-red-600 font-medium">
              Warning: Configuration capacity is less than maximum guests required!
            </p>
          )}
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
          Update Rule
        </button>
      </div>
    </form>
  );
}

