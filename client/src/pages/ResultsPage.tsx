import { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { collection, addDoc, updateDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useEstimatorStore } from '../store/estimatorStore';
import Header from '../components/Header';
import ProgressBar from '../components/ProgressBar';
import type { ClientInfo, RoomItem, RoomWithItems, Budget, ProjectBudget } from '../types';

// Type guard to check if budget is a ProjectBudget
function isProjectBudget(budget: Budget | ProjectBudget | null): budget is ProjectBudget {
  return budget !== null && 'projectRange' in budget;
}
import { formatCurrency, calculateTotalRooms, calculateTotalItems } from '../utils/calculations';
import { useRoomTemplates } from '../hooks/useRoomTemplates';
import { calculateSelectedRoomCapacity } from '../utils/autoConfiguration';
import { useAutoConfigRules } from '../hooks/useAutoConfiguration';
import { syncToHighLevel } from '../utils/highLevelSync';
import { calculateEstimate } from '../utils/calculations';
import type { BudgetDefaults } from '../types';

export default function ResultsPage() {
  const navigate = useNavigate();
  const {
    propertySpecs,
    selectedRooms,
    setClientInfo,
    reset
  } = useEstimatorStore();

  const { roomTemplates, items, loading: templatesLoading } = useRoomTemplates();
  const { rules: autoConfigRules, loading: rulesLoading } = useAutoConfigRules();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  const [isProjectBudgetType, setIsProjectBudgetType] = useState(false);
  const [budgetDefaults, setBudgetDefaults] = useState<BudgetDefaults | null>(null);
  const [defaultsLoading, setDefaultsLoading] = useState(true);

  // Convert arrays to Maps for calculation functions
  const roomTemplatesMap = useMemo(() => {
    const map = new Map<string, any>();
    roomTemplates.forEach(template => map.set(template.id, template));
    return map;
  }, [roomTemplates]);

  const itemsMap = useMemo(() => {
    const map = new Map<string, any>();
    items.forEach(item => map.set(item.id, item));
    return map;
  }, [items]);

  // Calculate budget dynamically
  const budget: Budget | ProjectBudget | null = useMemo(() => {
    if (selectedRooms.length === 0) {
      return null;
    }

    // If we have property specs, create a project budget
    if (propertySpecs) {
      setIsProjectBudgetType(true);
      return calculateEstimate(selectedRooms, roomTemplatesMap, itemsMap, {
        propertySpecs,
        budgetDefaults: budgetDefaults || undefined,
      });
    }

    // Otherwise, create a regular furnishings budget
    setIsProjectBudgetType(false);
    return calculateEstimate(selectedRooms, roomTemplatesMap, itemsMap);
  }, [selectedRooms, roomTemplatesMap, itemsMap, propertySpecs, budgetDefaults]);

  // Calculate room and item counts
  const totalRooms = useMemo(() => calculateTotalRooms(selectedRooms), [selectedRooms]);
  const totalItems = useMemo(() => calculateTotalItems(selectedRooms, roomTemplatesMap, itemsMap), [selectedRooms, roomTemplatesMap, itemsMap]);

  // Calculate actual capacity of selected rooms
  const actualCapacity = useMemo(() => {
    if (!autoConfigRules || selectedRooms.length === 0) return 0;
    const roomData = selectedRooms.map(room => ({
      roomType: room.roomType,
      quantity: room.quantity,
      roomSize: room.roomSize
    }));
    return calculateSelectedRoomCapacity(roomData, autoConfigRules);
  }, [selectedRooms, autoConfigRules]);

  const { register, handleSubmit, formState: { errors } } = useForm<ClientInfo>();

  // Function to toggle room expansion
  const toggleRoomExpansion = (roomType: string) => {
    setExpandedRooms(prev => {
      const newSet = new Set(prev);
      if (newSet.has(roomType)) {
        newSet.delete(roomType);
      } else {
        newSet.add(roomType);
      }
      return newSet;
    });
  };

  // Function to expand all rooms
  const expandAllRooms = () => {
    if (budget?.roomBreakdown) {
      setExpandedRooms(new Set(budget.roomBreakdown.map(room => room.roomType)));
    }
  };

  // Function to collapse all rooms
  const collapseAllRooms = () => {
    setExpandedRooms(new Set());
  };


  // Load budget defaults from Firestore on mount
  useEffect(() => {
    const loadBudgetDefaults = async () => {
      setDefaultsLoading(true);
      try {
        const docRef = doc(collection(db, 'config'), 'budgetDefaults');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setBudgetDefaults({
            installationCents: data.installationCents || 0,
            fuelCents: data.fuelCents || 0,
            storageAndReceivingCents: data.storageAndReceivingCents || 0,
            kitchenCents: data.kitchenCents || 0,
            propertyManagementCents: data.propertyManagementCents || 0,
            designFeeRatePerSqftCents: data.designFeeRatePerSqftCents || 1000, // Default $10/sqft
          });
        } else {
          // No defaults in Firestore - use minimal defaults for project budget
          setBudgetDefaults({
            installationCents: 0,
            fuelCents: 0,
            storageAndReceivingCents: 0,
            kitchenCents: 0,
            propertyManagementCents: 0,
            designFeeRatePerSqftCents: 1000, // Default $10/sqft
          });
        }
      } catch (error) {
        console.error('Error loading budget defaults from Firestore:', error);
        // Still set defaults to allow project budget to work
        setBudgetDefaults({
          installationCents: 0,
          fuelCents: 0,
          storageAndReceivingCents: 0,
          kitchenCents: 0,
          propertyManagementCents: 0,
          designFeeRatePerSqftCents: 1000, // Default $10/sqft
        });
      } finally {
        setDefaultsLoading(false);
      }
    };

    void loadBudgetDefaults();
  }, []);

  useEffect(() => {
    if (!budget || !selectedRooms || selectedRooms.length === 0) {
      navigate('/tools/budget-estimator/rooms');
    }
  }, [budget, selectedRooms, navigate]);

  if (!budget || !propertySpecs || templatesLoading || defaultsLoading || rulesLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading project budget details...</p>
        </div>
      </div>
    );
  }


  const onSubmit = async (data: ClientInfo) => {
    setIsSubmitting(true);
    setClientInfo(data);

    try {
      // Convert selectedRooms to RoomWithItems with complete item mappings
      const roomsWithItems: RoomWithItems[] = selectedRooms.map(room => {
        const template = roomTemplates.get(room.roomType);
        if (template && template.sizes[room.roomSize]) {
          return {
            ...room,
            items: template.sizes[room.roomSize].items
          };
        }
        return {
          ...room,
          items: []
        };
      });

      // Save estimate to Firestore with complete item mappings
      const estimateData = {
        clientInfo: data,
        propertySpecs,
        rooms: roomsWithItems,
        status: 'submitted',
        source: 'direct',
        viewCount: 0,
        syncedToHighLevel: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        submittedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'estimates'), {
        ...estimateData,
        toolId: 'budget-estimator',
        ownerUid: auth.currentUser?.uid ?? null,
      });
      const estimateId = docRef.id;

      // Sync to High Level CRM
      const syncSuccess = await syncToHighLevel(
        {
          ...estimateData,
          toolId: 'budget-estimator',
          ownerUid: auth.currentUser?.uid ?? null,
        } as any,
        estimateId
      );

      // Update sync status in Firestore
      await updateDoc(docRef, {
        syncedToHighLevel: syncSuccess,
        syncedAt: serverTimestamp()
      });

      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting estimate:', error);
      alert('There was an error submitting your project budget. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-2xl mx-auto px-4">
          <div className="card text-center bg-white p-12">
            <div className="text-6xl mb-6">✓</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Success!
            </h1>
            <p className="text-xl text-gray-600 mb-6">
              Your {isProjectBudgetType ? 'project budget' : 'estimate'} has been sent!
            </p>
            <p className="text-gray-600 mb-8">
              We've emailed your complete {isProjectBudgetType ? 'project budget' : 'furnishings estimate'} breakdown. Check your inbox in the next few minutes.
              We'll be in touch soon!
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => {
                  reset();
                  navigate('/tools/budget-estimator');
                }}
                className="btn-primary"
              >
                Start Another {isProjectBudgetType ? 'Project Budget' : 'Estimate'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header currentStep={3} totalSteps={3} />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ProgressBar currentStep={3} totalSteps={3} />
        
        <div className="mt-8">
          {/* Overall Budget Range */}
          <div className="bg-gradient-to-br from-primary-600 to-primary-900 text-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow duration-200 mb-8">
            <div className="text-center py-6">
              <p className="text-lg font-medium mb-3 opacity-90">
                {isProjectBudgetType ? 'ESTIMATED PROJECT BUDGET RANGE' : 'ESTIMATED FURNISHINGS BUDGET RANGE'}
              </p>
              <div className="text-5xl font-bold mb-2">
                {isProjectBudgetType && isProjectBudget(budget)
                  ? `${formatCurrency(budget.projectRange.low)} — ${formatCurrency(budget.projectRange.mid)}`
                  : budget ? `${formatCurrency(budget.rangeLow)} — ${formatCurrency(budget.rangeHigh)}` : '$0 — $0'}
              </div>
              <p className="text-sm opacity-75 mt-4">
                {propertySpecs.squareFootage.toLocaleString()} sq ft • {propertySpecs.guestCapacity} requested capacity • {actualCapacity} max capacity • {totalRooms} room{totalRooms !== 1 ? 's' : ''} • {totalItems} item{totalItems !== 1 ? 's' : ''}
              </p>
            </div>
          </div>


          {/* Project Budget Breakdown */}
          {isProjectBudget(budget) && (

            <div className="mb-8">
              <div className="card bg-gray-50 border-2 border-gray-200">
                <div className="w-full text-left">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex-1">
                      <div className="mb-1">
                        <span className="text-2xl font-bold text-primary-800">
                          Project Budget Breakdown
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Furnishings */}
                    <div className="py-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-700">Furnishings</span>
                        <span className="text-gray-700">
                          {formatCurrency(budget.rangeLow)} — {formatCurrency(budget.rangeHigh)}
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
                          {formatCurrency(budget.projectAddOns.designFee)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Comprehensive design planning, procurement, and placement services
                      </p>
                    </div>

                    <div className="py-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-700">Installation</span>
                        <span className="text-gray-700">{formatCurrency(budget.projectAddOns.installation)}</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Professional delivery, setup, and installation services
                      </p>
                    </div>

                    <div className="py-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-700">Fuel</span>
                        <span className="text-gray-700">{formatCurrency(budget.projectAddOns.fuel)}</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Transportation and fuel costs
                      </p>
                    </div>

                    <div className="py-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-700">Storage & Receiving</span>
                        <span className="text-gray-700">{formatCurrency(budget.projectAddOns.storageAndReceiving)}</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Temporary storage solutions and receiving services
                      </p>
                    </div>

                    <div className="py-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-700">Kitchen</span>
                        <span className="text-gray-700">{formatCurrency(budget.projectAddOns.kitchen)}</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Kitchen equipment including cookware, flatware, and accessories
                      </p>
                    </div>

                    <div className="py-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-700">Property Management</span>
                        <span className="text-gray-700">{formatCurrency(budget.projectAddOns.propertyManagement)}</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Items required by property management
                      </p>
                    </div>

                    {/* Project Total */}
                    <div className="flex justify-between items-center py-4 border-t-2 border-gray-300 mt-4">
                      <span className="text-xl font-bold text-gray-900">Project Total</span>
                      <span className="text-xl font-bold text-primary-600">
                        {formatCurrency(budget.projectRange.low)} — {formatCurrency(budget.projectRange.mid)}
                      </span>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Detailed Room Breakdown */}
          <div id="detailed-room-breakdown" className="mb-8">
            <div className="card">
              <div className="w-full text-left">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex-1">
                    <div className="mb-1">
                      <span className="text-2xl font-bold text-primary-800">
                        Detailed Furnishings Budget Breakdown
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Complete itemized breakdown by room
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={expandAllRooms}
                      className="text-sm text-primary-600 hover:text-primary-800 font-medium"
                    >
                      Expand All
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={collapseAllRooms}
                      className="text-sm text-primary-600 hover:text-primary-800 font-medium"
                    >
                      Collapse All
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {budget.roomBreakdown.map((room, idx) => {
                    const template = roomTemplates.get(room.roomType);
                    const roomSizeData = template?.sizes[room.roomSize as 'small' | 'medium' | 'large'];
                    const isExpanded = expandedRooms.has(room.roomType);
                    const roomDisplayName = room.roomType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

                    return (
                      <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
                        {/* Room Header - Always Visible */}
                        <div
                          className="flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                          onClick={() => toggleRoomExpansion(room.roomType)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                              {isExpanded ? (
                                <ChevronDown className="w-5 h-5 text-gray-600" />
                              ) : (
                                <ChevronRight className="w-5 h-5 text-gray-600" />
                              )}
                            </div>
                            <div>
                              <h4 className="font-semibold text-lg text-gray-900">
                                {roomDisplayName}
                              </h4>
                              <p className="text-sm text-gray-500">
                                {room.roomSize.charAt(0).toUpperCase() + room.roomSize.slice(1)} × {room.quantity}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-lg text-gray-900">
                              {formatCurrency(room.lowAmount)} — {formatCurrency(room.midAmount)}
                            </div>
                          </div>
                        </div>

                        {/* Room Details - Collapsible */}
                        {isExpanded && roomSizeData && roomSizeData.items.length > 0 && (
                          <div className="border-t border-gray-200 p-4 bg-white">
                            <h5 className="text-sm font-medium text-gray-700 mb-3">Included Items:</h5>
                            <div className="grid gap-2">
                              {roomSizeData.items
                                .sort((a: RoomItem, b: RoomItem) => {
                                  const itemA = items.get(a.itemId);
                                  const itemB = items.get(b.itemId);
                                  const nameA = itemA?.name || a.itemId.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
                                  const nameB = itemB?.name || b.itemId.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
                                  return nameA.localeCompare(nameB);
                                })
                                .map((roomItem: RoomItem, itemIdx: number) => {
                                  const item = items.get(roomItem.itemId);
                                  const itemDisplayName = item?.name || roomItem.itemId.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());

                                  return (
                                    <div key={itemIdx} className="flex justify-between items-center text-sm bg-gray-50 px-4 py-3 rounded-lg">
                                      <span className="text-gray-700 font-medium">
                                        {itemDisplayName}
                                      </span>
                                      <span className="text-gray-600">
                                        Qty: {roomItem.quantity}
                                      </span>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="card bg-primary-50 border-2 border-primary-200">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Get Your Detailed {isProjectBudgetType ? 'Project Budget' : 'Estimate'}
            </h2>
            <p className="text-gray-600 mb-6">
              Enter your contact information to receive a complete {isProjectBudgetType ? 'project budget' : 'furnishings estimate'} breakdown via email
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    {...register('firstName', { required: 'First name is required' })}
                    className="input-field"
                    placeholder="John"
                  />
                  {errors.firstName && (
                    <p className="text-red-600 text-sm mt-1">{errors.firstName.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    {...register('lastName', { required: 'Last name is required' })}
                    className="input-field"
                    placeholder="Smith"
                  />
                  {errors.lastName && (
                    <p className="text-red-600 text-sm mt-1">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address',
                    },
                  })}
                  className="input-field"
                  placeholder="john.smith@email.com"
                />
                {errors.email && (
                  <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number <span className="text-gray-500">(optional)</span>
                </label>
                <input
                  type="tel"
                  {...register('phone')}
                  className="input-field"
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company <span className="text-gray-500">(optional)</span>
                </label>
                <input
                  type="text"
                  {...register('company')}
                  className="input-field"
                  placeholder="Company name"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : `Submit & Get ${isProjectBudgetType ? 'Project Budget' : 'Estimate'} →`}
              </button>
            </form>
          </div>

          {/* Back Button */}
          <div className="mt-6">
            <button
              onClick={() => navigate('/tools/budget-estimator/rooms')}
              className="btn-secondary"
            >
              ← Edit Property Details
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

