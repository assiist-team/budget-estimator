import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useBackDestination } from '../hooks/useBackDestination';
import { doc, getDoc, collection, onSnapshot } from 'firebase/firestore';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { db } from '../lib/firebase';
import Header from '../components/Header';
import type { Estimate, RoomItem, Budget, ProjectBudget } from '../types';
import { formatCurrency, calculateTotalRooms, calculateTotalItems, calculateEstimate } from '../utils/calculations';
import { useRoomTemplates } from '../hooks/useRoomTemplates';
import { calculateSelectedRoomCapacity } from '../utils/autoConfiguration';
import { useAutoConfigRules } from '../hooks/useAutoConfiguration';
import type { BudgetDefaults } from '../types';

// Type guard to check if budget is a ProjectBudget
function isProjectBudget(budget: Budget | ProjectBudget | null): budget is ProjectBudget {
  return budget !== null && 'projectRange' in budget;
}

export default function ViewEstimatePage() {
  const { estimateId } = useParams<{ estimateId: string }>();
  const { href: backHref } = useBackDestination('/tools/reports?tab=estimates');
  const [searchParams, setSearchParams] = useSearchParams();
  const sent = searchParams.get('sent') != null;

  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());

  const { roomTemplates, items, loading: templatesLoading } = useRoomTemplates();
  const { rules: autoConfigRules, loading: rulesLoading } = useAutoConfigRules();
  const [budgetDefaults, setBudgetDefaults] = useState<BudgetDefaults | null>(null);
  const [defaultsLoading, setDefaultsLoading] = useState(true);

  useEffect(() => {
    if (!estimateId) {
      setLoading(false);
      return;
    }

    const estimateRef = doc(db, 'estimates', estimateId);
    const unsubscribe = onSnapshot(estimateRef, (estimateSnap) => {
      if (estimateSnap.exists()) {
        setEstimate({ id: estimateSnap.id, ...estimateSnap.data() } as Estimate);
      } else {
        console.log('No such document!');
        setEstimate(null);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching estimate:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [estimateId]);
  
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
                designFeeRatePerSqftCents: data.designFeeRatePerSqftCents || 1000,
              });
            } else {
              setBudgetDefaults({
                installationCents: 0,
                fuelCents: 0,
                storageAndReceivingCents: 0,
                kitchenCents: 0,
                propertyManagementCents: 0,
                designFeeRatePerSqftCents: 1000,
              });
            }
          } catch (error) {
            console.error('Error loading budget defaults from Firestore:', error);
            setBudgetDefaults({
              installationCents: 0,
              fuelCents: 0,
              storageAndReceivingCents: 0,
              kitchenCents: 0,
              propertyManagementCents: 0,
              designFeeRatePerSqftCents: 1000,
            });
          } finally {
            setDefaultsLoading(false);
          }
        };
    
        void loadBudgetDefaults();
      }, []);

  const selectedRooms = estimate?.rooms || [];
  const propertySpecs = estimate?.propertySpecs;

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

  const budget: Budget | ProjectBudget | null = useMemo(() => {
    if (selectedRooms.length === 0 || !propertySpecs) {
      return null;
    }

    return calculateEstimate(selectedRooms, roomTemplatesMap, itemsMap, {
      propertySpecs,
      budgetDefaults: budgetDefaults || undefined,
    });
  }, [selectedRooms, roomTemplatesMap, itemsMap, propertySpecs, budgetDefaults]);

  const totalRooms = useMemo(() => calculateTotalRooms(selectedRooms), [selectedRooms]);
  const totalItems = useMemo(() => calculateTotalItems(selectedRooms, roomTemplatesMap, itemsMap), [selectedRooms, roomTemplatesMap, itemsMap]);

  const actualCapacity = useMemo(() => {
    if (!autoConfigRules || selectedRooms.length === 0) return 0;
    const roomData = selectedRooms.map(room => ({
      roomType: room.roomType,
      quantity: room.quantity,
      roomSize: room.roomSize
    }));
    return calculateSelectedRoomCapacity(roomData, autoConfigRules);
  }, [selectedRooms, autoConfigRules]);

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

  const expandAllRooms = () => {
    if (budget?.roomBreakdown) {
      setExpandedRooms(new Set(budget.roomBreakdown.map(room => room.roomType)));
    }
  };

  const collapseAllRooms = () => {
    setExpandedRooms(new Set());
  };

  if (loading || templatesLoading || defaultsLoading || rulesLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading estimate...</p>
        </div>
      </div>
    );
  }

  if (!estimate || !budget || !propertySpecs) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Estimate not found</h1>
          <p className="text-gray-600">The estimate you are looking for does not exist.</p>
          <Link to={backHref} className="btn-primary mt-6">← Back to Reports</Link>
        </div>
      </div>
    );
  }

  const isProjectBudgetType = isProjectBudget(budget);


  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {sent && (
          <div className="mb-6 rounded-md bg-green-50 border border-green-200 p-4 text-green-800 flex items-start justify-between">
            <div>
              <div className="font-semibold">Report sent and saved</div>
              <div className="text-sm">We emailed your report and saved it to your Reports.</div>
            </div>
            <button
              className="text-green-800/80 hover:text-green-900 text-sm"
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.delete('sent');
                setSearchParams(next, { replace: true });
              }}
            >
              Dismiss
            </button>
          </div>
        )}
        <div className="sticky top-0 z-10 bg-gray-50 pt-4 pb-4 mb-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <Link to={backHref} className="btn-secondary">← Back to Reports</Link>
            <Link to={`/tools/budget-estimator/estimate/edit/${estimateId}`} className="btn-primary">
              Edit
            </Link>
          </div>
        </div>

        {/* Overall Budget Range */}
        <div className="sticky top-[4.25rem] z-10 mb-8 bg-gradient-to-br from-primary-600 to-primary-900 text-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow duration-200">
          <div className="text-center py-6">
            <p className="text-lg font-medium mb-3 opacity-90">
              {isProjectBudgetType ? 'ESTIMATED PROJECT BUDGET' : 'ESTIMATED FURNISHINGS BUDGET RANGE'}
            </p>
            <div className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2">
              {isProjectBudgetType && isProjectBudget(budget)
                ? `${formatCurrency(budget.projectRange.low)} — ${formatCurrency(budget.projectRange.mid)}`
                : budget ? `${formatCurrency(budget.rangeLow)} — ${formatCurrency(budget.rangeHigh)}` : '$0 — $0'}
            </div>
            <p className="text-sm opacity-75 mt-4 mb-2">
              {propertySpecs.squareFootage.toLocaleString()} sq ft • {propertySpecs.guestCapacity} requested capacity • {actualCapacity} max capacity • {totalRooms} room{totalRooms !== 1 ? 's' : ''} • {totalItems} item{totalItems !== 1 ? 's' : ''}
            </p>
            <p className="text-xs sm:text-sm opacity-75">
              {(() => {
                const parts = [estimate.clientInfo.firstName, estimate.clientInfo.lastName].filter(Boolean);
                const fullName = parts.join(' ');
                return (
                  <>
                    {fullName ? `${fullName} • ` : ''}{estimate.clientInfo.email}
                    {estimate.clientInfo.phone && ` • ${estimate.clientInfo.phone}`}
                  </>
                );
              })()}
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
                        <span className="text-gray-700 flex-1 min-w-0">Furnishings</span>
                        <span className="text-gray-700 flex-shrink-0 ml-3">
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
                        <span className="text-gray-700 flex-1 min-w-0">Design Fee</span>
                        <span className="text-gray-700 flex-shrink-0 ml-3">
                          {formatCurrency(budget.projectAddOns.designFee)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Comprehensive design planning, procurement, and placement services
                      </p>
                    </div>

                    <div className="py-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-700 flex-1 min-w-0">Installation</span>
                        <span className="text-gray-700 flex-shrink-0 ml-3">{formatCurrency(budget.projectAddOns.installation)}</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Professional delivery, setup, and installation services
                      </p>
                    </div>

                    <div className="py-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-700 flex-1 min-w-0">Fuel</span>
                        <span className="text-gray-700 flex-shrink-0 ml-3">{formatCurrency(budget.projectAddOns.fuel)}</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Transportation and fuel costs
                      </p>
                    </div>

                    <div className="py-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-700 flex-1 min-w-0">Storage & Receiving</span>
                        <span className="text-gray-700 flex-shrink-0 ml-3">{formatCurrency(budget.projectAddOns.storageAndReceiving)}</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Temporary storage solutions and receiving services
                      </p>
                    </div>

                    <div className="py-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-700 flex-1 min-w-0">Kitchen</span>
                        <span className="text-gray-700 flex-shrink-0 ml-3">{formatCurrency(budget.projectAddOns.kitchen)}</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Kitchen equipment including cookware, flatware, and accessories
                      </p>
                    </div>

                    <div className="py-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-700 flex-1 min-w-0">Property Management</span>
                        <span className="text-gray-700 flex-shrink-0 ml-3">{formatCurrency(budget.projectAddOns.propertyManagement)}</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Items required by property management
                      </p>
                    </div>

                    {/* Project Total */}
                    <div className="flex justify-between items-center py-4 border-t-2 border-gray-300 mt-4">
                      <span className="text-lg sm:text-xl font-bold text-gray-900 flex-1 min-w-0">Project Total</span>
                      <span className="text-lg sm:text-xl font-bold text-primary-600 flex-shrink-0 ml-3">
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
                <div className="mb-6">
                  <div className="mb-1">
                    <span className="text-2xl font-bold text-primary-800">
                      Detailed Furnishings Budget Breakdown
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 mb-4">
                    Complete itemized breakdown by room
                  </p>
                  <div className="flex items-center gap-2">
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
                    const estimateRoomData = estimate.rooms.find(
                      (r) => r.roomType === room.roomType && r.roomSize === room.roomSize
                    );
                    const isExpanded = expandedRooms.has(room.roomType);
                    const roomDisplayName = room.roomType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

                    return (
                      <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
                        {/* Room Header - Always Visible */}
                        <div
                          className="flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                          onClick={() => toggleRoomExpansion(room.roomType)}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="flex-shrink-0">
                              {isExpanded ? (
                                <ChevronDown className="w-5 h-5 text-gray-600" />
                              ) : (
                                <ChevronRight className="w-5 h-5 text-gray-600" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-semibold text-base sm:text-lg text-gray-900 truncate">
                                {roomDisplayName}
                              </h4>
                              <p className="text-sm text-gray-500 truncate">
                                {room.roomSize.charAt(0).toUpperCase() + room.roomSize.slice(1)} × {room.quantity}
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 ml-3">
                            <div className="font-semibold text-gray-700 whitespace-nowrap">
                              {formatCurrency(room.lowAmount)} — {formatCurrency(room.midAmount)}
                            </div>
                          </div>
                        </div>

                        {/* Room Details - Collapsible */}
                        {isExpanded && estimateRoomData && estimateRoomData.items.length > 0 && (
                          <div className="border-t border-gray-200 p-4 bg-white">
                            <h5 className="text-sm font-medium text-gray-700 mb-3">Included Items:</h5>
                            <div className="grid gap-2">
                              {estimateRoomData.items
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
        
      </main>
    </div>
  );
}
