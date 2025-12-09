import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useBackDestination } from '../hooks/useBackDestination';
import { doc, onSnapshot } from 'firebase/firestore';
import { ChevronDown, ChevronRight, Download } from 'lucide-react';
import { db } from '../lib/firebase';
import Header from '../components/Header';
import type { Estimate, RoomItem, Budget, ProjectBudget, Item, RoomTemplate } from '../types';
import { formatCurrency, calculateTotalRooms, calculateTotalItems, calculateEstimate, createOutdoorSpaceRoom } from '../utils/calculations';
import { useRoomTemplates } from '../hooks/useRoomTemplates';
import { calculateSelectedRoomCapacity } from '../utils/autoConfiguration';
import { useAutoConfigRules } from '../hooks/useAutoConfiguration';
import { useBudgetDefaultsStore } from '../store/budgetDefaultsStore';
import { useAuth } from '../context/AuthContext';
import { useAuthModal } from '../components/auth/AuthModalProvider';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [hidePrices, setHidePrices] = useState(false);
  const pdfContentRef = useRef<HTMLDivElement>(null);
  const { profile, loading: authLoading } = useAuth();
  const { requireAccount } = useAuthModal();

  const { roomTemplates, items, loading: templatesLoading } = useRoomTemplates();
  const { rules: autoConfigRules, loading: rulesLoading } = useAutoConfigRules();
  const { defaults: budgetDefaults, loadDefaults } = useBudgetDefaultsStore();

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!estimateId) {
      setLoading(false);
      return;
    }

    const estimateRef = doc(db, 'estimates', estimateId);
    const unsubscribe = onSnapshot(estimateRef, (estimateSnap) => {
      if (estimateSnap.exists()) {
        const estimateData = { id: estimateSnap.id, ...estimateSnap.data() } as Estimate;
        
        // For project budgets, ensure Outdoor Space room exists
        if (estimateData.propertySpecs) {
          const hasOutdoorSpace = estimateData.rooms.some(room => room.roomType === 'outdoor_space');
          if (!hasOutdoorSpace) {
            estimateData.rooms = [...estimateData.rooms, createOutdoorSpaceRoom()];
          }
        }
        
        setEstimate(estimateData);
      } else {
        console.log('No such document!');
        setEstimate(null);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching estimate:', error);
      setEstimate(null);
      if (!profile) {
        // Not logged in, so prompt for login. This is likely a permissions error.
        requireAccount({ reason: 'Please sign in to view this estimate.' })
          .catch(() => {
            // User cancelled login, do nothing, they will see the not found page
          });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [estimateId, profile, authLoading, requireAccount]);
  
  // Load budget defaults using the same store as EstimateEditPage
  useEffect(() => {
    if (!budgetDefaults) {
      void loadDefaults();
    }
  }, [budgetDefaults, loadDefaults]);

  const selectedRooms = estimate?.rooms || [];
  const propertySpecs = estimate?.propertySpecs;

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

  const budget: Budget | ProjectBudget | null = useMemo(() => {
    if (selectedRooms.length === 0) {
      return null;
    }

    // Build options object matching EstimateEditPage logic exactly
    const options = estimate?.propertySpecs && budgetDefaults
      ? { 
          propertySpecs: estimate.propertySpecs, 
          budgetDefaults,
          customRangeEnabled: estimate.customRangeEnabled,
          customRangeLowPercent: estimate.customRangeLowPercent,
          customRangeHighPercent: estimate.customRangeHighPercent,
          customProjectAddOns: estimate.customProjectAddOns
        }
      : estimate?.customRangeEnabled
        ? {
            customRangeEnabled: estimate.customRangeEnabled,
            customRangeLowPercent: estimate.customRangeLowPercent,
            customRangeHighPercent: estimate.customRangeHighPercent,
            customProjectAddOns: estimate.customProjectAddOns
          }
        : undefined;

    return calculateEstimate(selectedRooms, roomTemplatesMap, itemsMap, options);
  }, [selectedRooms, roomTemplatesMap, itemsMap, budgetDefaults, estimate]);

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

  const handleDownloadPDF = async () => {
    if (!pdfContentRef.current || !budget) return;

    setIsGeneratingPDF(true);
    
    // Add class to hide expand/collapse buttons during PDF generation
    pdfContentRef.current.classList.add('generating-pdf');
    
    // Expand all rooms before capturing
    const allRoomTypes = budget.roomBreakdown.map(room => room.roomType);
    setExpandedRooms(new Set(allRoomTypes));

    // Wait a bit for the DOM to update with expanded rooms
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      // Capture the content as canvas
      // Use a slightly lower scale and JPEG format to dramatically reduce file size
      const canvas = await html2canvas(pdfContentRef.current, {
        scale: 1.25, // Lower than 2x to keep resolution reasonable but lighter
        useCORS: true,
        logging: false,
        backgroundColor: '#f9fafb', // gray-50 background
        windowWidth: pdfContentRef.current.scrollWidth,
        windowHeight: pdfContentRef.current.scrollHeight,
      });

      // Use JPEG with quality setting instead of PNG to shrink PDF size
      const imgData = canvas.toDataURL('image/jpeg', 0.8);
      const padding = 5; // 5mm padding around the PDF
      const pageWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const usableWidth = pageWidth - (padding * 2); // Content width with padding
      const usableHeight = pageHeight - (padding * 2); // Content height with padding
      
      const imgWidth = usableWidth; // Image width fits within padding
      const imgHeight = (canvas.height * imgWidth) / canvas.width; // Proportional height
      
      // Enable internal compression for images
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });
      let yOffset = 0; // Track how much of the image we've shown

      // Add pages until all content is shown
      while (yOffset < imgHeight) {
        // Calculate the y position to show the current portion of the image
        // Negative y positions the image above the page, showing the next portion
        const yPosition = padding - yOffset;
        
        // Add image to current page
        pdf.addImage(imgData, 'JPEG', padding, yPosition, imgWidth, imgHeight);
        
        // Move to next portion
        yOffset += usableHeight;
        
        // If there's more content, add a new page
        if (yOffset < imgHeight) {
          pdf.addPage();
        }
      }

      // Generate filename
      const clientName = estimate?.clientInfo.firstName && estimate?.clientInfo.lastName
        ? `${estimate.clientInfo.firstName}_${estimate.clientInfo.lastName}`
        : 'Estimate';
      const date = new Date().toISOString().split('T')[0];
      const filename = `Budget_Estimate_${clientName}_${date}.pdf`;

      pdf.save(filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      // Remove the class to show buttons again
      if (pdfContentRef.current) {
        pdfContentRef.current.classList.remove('generating-pdf');
      }
      setIsGeneratingPDF(false);
    }
  };

  const { isAdmin } = useAuth();

  if (loading || templatesLoading || rulesLoading) {
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
            <div className="flex items-center gap-4">
              {/* Hide Prices Toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hidePrices}
                  onChange={(e) => setHidePrices(e.target.checked)}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 font-medium">Hide Prices</span>
              </label>
              {isAdmin && (
                <Link to={`/tools/budget-estimator/estimate/edit/${estimateId}`} className="btn-primary">
                  Edit
                </Link>
              )}
              <button
                onClick={handleDownloadPDF}
                disabled={isGeneratingPDF}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Download PDF"
              >
                <Download className="w-4 h-4" />
                {isGeneratingPDF ? 'Generating...' : 'Download PDF'}
              </button>
            </div>
          </div>
        </div>

        {/* PDF Content Container - starts from banner */}
        <div ref={pdfContentRef} id="pdf-content">
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
                          Project Budget Categories
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Furnishings */}
                    <div className="py-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-700 flex-1 min-w-0">Furnishings</span>
                        {!hidePrices && (
                          <span className="text-gray-700 flex-shrink-0 ml-3">
                            {formatCurrency(budget.rangeLow)} — {formatCurrency(budget.rangeHigh)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        All furniture, accessories, and finishing touches
                      </p>
                    </div>

                    {/* Project Add-ons */}
                    <div className="py-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-700 flex-1 min-w-0">Design Planning</span>
                        {!hidePrices && (
                          <span className="text-gray-700 flex-shrink-0 ml-3">
                            {formatCurrency(budget.projectAddOns.designPlanning)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        Initial design consultation, space planning, and design development
                      </p>
                    </div>

                    <div className="py-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-700 flex-1 min-w-0">Procurement</span>
                        {!hidePrices && (
                          <span className="text-gray-700 flex-shrink-0 ml-3">
                            {formatCurrency(budget.projectAddOns.procurement)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        Sourcing, ordering, and managing furniture and accessories
                      </p>
                    </div>

                    <div className="py-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-700 flex-1 min-w-0">Design Implementation</span>
                        {!hidePrices && (
                          <span className="text-gray-700 flex-shrink-0 ml-3">
                            {formatCurrency(budget.projectAddOns.designImplementation)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        Final placement, styling, and design execution services
                      </p>
                    </div>

                    <div className="py-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-700 flex-1 min-w-0">Installation</span>
                        {!hidePrices && (
                          <span className="text-gray-700 flex-shrink-0 ml-3">{formatCurrency(budget.projectAddOns.installation)}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        Professional delivery, setup, and installation services
                      </p>
                    </div>

                    <div className="py-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-700 flex-1 min-w-0">Fuel</span>
                        {!hidePrices && (
                          <span className="text-gray-700 flex-shrink-0 ml-3">{formatCurrency(budget.projectAddOns.fuel)}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        Transportation and fuel costs
                      </p>
                    </div>

                    <div className="py-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-700 flex-1 min-w-0">Storage & Receiving</span>
                        {!hidePrices && (
                          <span className="text-gray-700 flex-shrink-0 ml-3">{formatCurrency(budget.projectAddOns.storageAndReceiving)}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        Temporary storage solutions and receiving services
                      </p>
                    </div>

                    <div className="py-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-700 flex-1 min-w-0">Kitchen</span>
                        {!hidePrices && (
                          <span className="text-gray-700 flex-shrink-0 ml-3">{formatCurrency(budget.projectAddOns.kitchen)}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        Kitchen equipment including cookware, flatware, and accessories
                      </p>
                    </div>

                    <div className="py-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-700 flex-1 min-w-0">Property Management</span>
                        {!hidePrices && (
                          <span className="text-gray-700 flex-shrink-0 ml-3">{formatCurrency(budget.projectAddOns.propertyManagement)}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        Items required by property management
                      </p>
                    </div>

                    {/* Project Total */}
                    {!hidePrices && (
                      <div className="flex justify-between items-center py-4 border-t-2 border-gray-300 mt-4">
                        <span className="text-lg sm:text-xl font-bold text-gray-900 flex-1 min-w-0">Project Total</span>
                        <span className="text-lg sm:text-xl font-bold text-primary-600 flex-shrink-0 ml-3">
                          {formatCurrency(budget.projectRange.low)} — {formatCurrency(budget.projectRange.mid)}
                        </span>
                      </div>
                    )}

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
                      Detailed Furnishings Breakdown
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 mb-4">
                    Complete itemized breakdown by room
                  </p>
                  <div className="flex items-center gap-2 pdf-controls">
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
                    const roomDisplayName = estimateRoomData?.displayName || room.roomType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

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
                          {!hidePrices && (
                            <div className="text-right flex-shrink-0 ml-3">
                              <div className="font-semibold text-gray-700 whitespace-nowrap">
                                {formatCurrency(room.lowAmount)} — {formatCurrency(room.midAmount)}
                              </div>
                            </div>
                          )}
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
                                  const nameA = a.name || itemA?.name || a.itemId.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
                                  const nameB = b.name || itemB?.name || b.itemId.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
                                  return nameA.localeCompare(nameB);
                                })
                                .map((roomItem: RoomItem, itemIdx: number) => {
                                  const item = items.get(roomItem.itemId);
                                  const itemDisplayName = roomItem.name || item?.name || roomItem.itemId.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
                                  const totalQuantity = roomItem.quantity * room.quantity;
                                  
                                  // Get base low price (the price point the user sets)
                                  const baseLowPrice = roomItem.lowPrice !== undefined ? roomItem.lowPrice : (item?.lowPrice || 0);
                                  
                                  // Calculate display prices - respect custom range settings if enabled
                                  let lowPrice: number;
                                  let midPrice: number;
                                  
                                  // If custom range is enabled, calculate prices from base low price using percentages
                                  if (estimate?.customRangeEnabled && 
                                      estimate.customRangeLowPercent !== undefined && 
                                      estimate.customRangeHighPercent !== undefined && 
                                      baseLowPrice > 0) {
                                    // Low end: baseLowPrice * (1 - customRangeLowPercent / 100)
                                    lowPrice = Math.round(baseLowPrice * (1 - estimate.customRangeLowPercent / 100));
                                    // High end: baseLowPrice * (1 + customRangeHighPercent / 100)
                                    midPrice = Math.round(baseLowPrice * (1 + estimate.customRangeHighPercent / 100));
                                  } else {
                                    // Use RoomItem price override if available, otherwise fall back to item library
                                    lowPrice = roomItem.lowPrice !== undefined ? roomItem.lowPrice : (item?.lowPrice || 0);
                                    midPrice = roomItem.midPrice !== undefined ? roomItem.midPrice : (item?.midPrice || 0);
                                  }
                                  
                                  const lowTotal = lowPrice * totalQuantity;
                                  const midTotal = midPrice * totalQuantity;

                                  return (
                                    <div key={itemIdx} className="flex justify-between items-center text-sm bg-gray-50 px-4 py-3 rounded-lg">
                                      <div className="flex-1 min-w-0">
                                        <span className="text-gray-700 font-medium">
                                          {itemDisplayName}
                                        </span>
                                        {!hidePrices && isAdmin && (item || roomItem.lowPrice !== undefined || roomItem.midPrice !== undefined) && (
                                          <div className="text-xs text-gray-500 mt-1">
                                            {formatCurrency(lowPrice)} — {formatCurrency(midPrice)} each
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                                        <span className="text-gray-600">
                                          Qty: {roomItem.quantity}
                                          {room.quantity > 1 && ` × ${room.quantity} rooms`}
                                        </span>
                                        {!hidePrices && isAdmin && (item || roomItem.lowPrice !== undefined || roomItem.midPrice !== undefined) && (
                                          <span className="text-gray-700 font-semibold">
                                            {formatCurrency(lowTotal)} — {formatCurrency(midTotal)}
                                          </span>
                                        )}
                                      </div>
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
        </div> {/* End PDF content container */}
        
      </main>
    </div>
  );
}
