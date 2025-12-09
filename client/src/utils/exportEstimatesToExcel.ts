import { utils, writeFile } from 'xlsx';
import type { Estimate, Item, RoomTemplate, ProjectBudget } from '../types';
import { formatCurrency, calculateEstimate, calculateTotalRooms, calculateTotalItems } from './calculations';

interface ExportData {
  estimates: Estimate[];
  itemsMap: Map<string, Item>;
  roomTemplatesMap: Map<string, RoomTemplate>;
  budgetDefaults?: {
    installationCents: number;
    fuelCents: number;
    storageAndReceivingCents: number;
    kitchenCents: number;
    propertyManagementCents: number;
    designFeeRatePerSqftCents: number;
  };
}

/**
 * Export estimates to Excel with multiple tabs:
 * 1. Summary - High-level estimate information
 * 2. Item Details - Item-level breakdown for each estimate
 * 3. Room Breakdown - Room-level totals for each estimate
 */
export function exportEstimatesToExcel({
  estimates,
  itemsMap,
  roomTemplatesMap,
  budgetDefaults,
}: ExportData): void {
  const workbook = utils.book_new();

  // Tab 1: Summary Sheet
  const summaryData: any[] = [
    [
      'Estimate ID',
      'Date Created',
      'Client Name',
      'Email',
      'Phone',
      'Company',
      'Square Footage',
      'Guest Capacity',
      'Total Rooms',
      'Total Items',
      'Low Tier Total',
      'Mid Tier Total',
      'Mid/High Tier Total',
      'High Tier Total',
      'Project Range Low',
      'Project Range High',
      'Installation',
      'Fuel',
      'Storage & Receiving',
      'Kitchen',
      'Property Management',
      'Design Planning',
      'Procurement',
      'Design Implementation',
      'Status',
      'Source',
    ],
  ];

  estimates.forEach((estimate) => {
    // Build options object matching EstimateEditPage and ViewEstimatePage logic exactly
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
        : estimate?.propertySpecs
          ? {
              propertySpecs: estimate.propertySpecs,
              budgetDefaults: budgetDefaults,
            }
          : undefined;
    
    const budget = estimate.rooms?.length
      ? calculateEstimate(estimate.rooms, roomTemplatesMap, itemsMap, options)
      : null;

    const isProjectBudget = budget && 'projectRange' in budget;
    const projectBudget = isProjectBudget ? (budget as ProjectBudget) : null;

    // Calculate totals using the same functions as the UI
    const totalRooms = calculateTotalRooms(estimate.rooms || []);
    const totalItems = calculateTotalItems(estimate.rooms || [], roomTemplatesMap, itemsMap);

    summaryData.push([
      estimate.id,
      estimate.createdAt ? new Date(estimate.createdAt).toLocaleDateString() : '',
      `${estimate.clientInfo.firstName} ${estimate.clientInfo.lastName}`,
      estimate.clientInfo.email,
      estimate.clientInfo.phone || '',
      estimate.clientInfo.company || '',
      estimate.propertySpecs?.squareFootage || '',
      estimate.propertySpecs?.guestCapacity || '',
      totalRooms,
      totalItems,
      budget ? formatCurrency(budget.low.total) : '',
      budget ? formatCurrency(budget.mid.total) : '',
      budget ? formatCurrency(budget.midHigh.total) : '',
      budget ? formatCurrency(budget.high.total) : '',
      projectBudget ? formatCurrency(projectBudget.projectRange.low) : budget ? formatCurrency(budget.rangeLow) : '',
      projectBudget ? formatCurrency(projectBudget.projectRange.mid) : budget ? formatCurrency(budget.rangeHigh) : '',
      projectBudget ? formatCurrency(projectBudget.projectAddOns.installation) : '',
      projectBudget ? formatCurrency(projectBudget.projectAddOns.fuel) : '',
      projectBudget ? formatCurrency(projectBudget.projectAddOns.storageAndReceiving) : '',
      projectBudget ? formatCurrency(projectBudget.projectAddOns.kitchen) : '',
      projectBudget ? formatCurrency(projectBudget.projectAddOns.propertyManagement) : '',
      projectBudget ? formatCurrency(projectBudget.projectAddOns.designPlanning) : '',
      projectBudget ? formatCurrency(projectBudget.projectAddOns.procurement) : '',
      projectBudget ? formatCurrency(projectBudget.projectAddOns.designImplementation) : '',
      estimate.status || '',
      estimate.source || '',
    ]);
  });

  const summarySheet = utils.aoa_to_sheet(summaryData);
  utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Tab 2: Item Details Sheet
  const itemDetailsData: any[] = [
    [
      'Estimate ID',
      'Client Name',
      'Room Type',
      'Room Size',
      'Room Quantity',
      'Item ID',
      'Item Name',
      'Item Category',
      'Item Subcategory',
      'Item Quantity (per room)',
      'Total Item Quantity',
      'Low Price',
      'Mid Price',
      'Mid/High Price',
      'High Price',
      'Low Total',
      'Mid Total',
      'Mid/High Total',
      'High Total',
    ],
  ];

  estimates.forEach((estimate) => {
    estimate.rooms?.forEach((room) => {
      const template = roomTemplatesMap.get(room.roomType);
      const roomDisplayName = template?.displayName || room.displayName || room.roomType;

      // Use items from room if available, otherwise use template items
      const roomItems = room.items.length > 0 
        ? room.items 
        : template?.sizes[room.roomSize]?.items || [];

      roomItems.forEach((roomItem) => {
        const item = itemsMap.get(roomItem.itemId);
        const itemName = item?.name || roomItem.name || roomItem.itemId;
        const totalQuantity = roomItem.quantity * room.quantity;

        // Get base low price (the price point the user sets)
        const baseLowPrice = roomItem.lowPrice !== undefined ? roomItem.lowPrice : (item?.lowPrice || 0);
        
        // Calculate prices - respect custom range settings if enabled
        let lowPrice: number;
        let midPrice: number;
        let midHighPrice: number;
        let highPrice: number;
        
        // If custom range is enabled, calculate prices from base low price using percentages
        if (estimate.customRangeEnabled && 
            estimate.customRangeLowPercent !== undefined && 
            estimate.customRangeHighPercent !== undefined && 
            baseLowPrice > 0) {
          // Low end: baseLowPrice * (1 - customRangeLowPercent / 100)
          lowPrice = Math.round(baseLowPrice * (1 - estimate.customRangeLowPercent / 100));
          // High end: baseLowPrice * (1 + customRangeHighPercent / 100)
          midPrice = Math.round(baseLowPrice * (1 + estimate.customRangeHighPercent / 100));
          // Calculate midHigh and high using proportional scaling
          const lowEnd = lowPrice;
          const highEnd = midPrice;
          const range = highEnd - lowEnd;
          midHighPrice = Math.round(lowEnd + range * 0.75);
          highPrice = Math.round(lowEnd + range * 1.5);
        } else {
          // Use RoomItem price override if available, otherwise fall back to item library
          lowPrice = roomItem.lowPrice !== undefined ? roomItem.lowPrice : (item?.lowPrice || 0);
          midPrice = roomItem.midPrice !== undefined ? roomItem.midPrice : (item?.midPrice || 0);
          midHighPrice = item?.midHighPrice || 0;
          highPrice = item?.highPrice || 0;
        }

        const lowTotal = lowPrice * totalQuantity;
        const midTotal = midPrice * totalQuantity;
        const midHighTotal = midHighPrice * totalQuantity;
        const highTotal = highPrice * totalQuantity;

        itemDetailsData.push([
          estimate.id,
          `${estimate.clientInfo.firstName} ${estimate.clientInfo.lastName}`,
          roomDisplayName,
          room.roomSize,
          room.quantity,
          roomItem.itemId,
          itemName,
          item?.category || '',
          item?.subcategory || '',
          roomItem.quantity,
          totalQuantity,
          formatCurrency(lowPrice),
          formatCurrency(midPrice),
          formatCurrency(midHighPrice),
          formatCurrency(highPrice),
          formatCurrency(lowTotal),
          formatCurrency(midTotal),
          formatCurrency(midHighTotal),
          formatCurrency(highTotal),
        ]);
      });
    });
  });

  const itemDetailsSheet = utils.aoa_to_sheet(itemDetailsData);
  utils.book_append_sheet(workbook, itemDetailsSheet, 'Item Details');

  // Tab 3: Room Breakdown Sheet
  const roomBreakdownData: any[] = [
    [
      'Estimate ID',
      'Client Name',
      'Room Type',
      'Room Size',
      'Room Quantity',
      'Low Amount',
      'Mid Amount',
      'Mid/High Amount',
      'High Amount',
    ],
  ];

  estimates.forEach((estimate) => {
    // Build options object matching EstimateEditPage and ViewEstimatePage logic exactly
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
        : estimate?.propertySpecs
          ? {
              propertySpecs: estimate.propertySpecs,
              budgetDefaults: budgetDefaults,
            }
          : undefined;
    
    const budget = estimate.rooms?.length
      ? calculateEstimate(estimate.rooms, roomTemplatesMap, itemsMap, options)
      : null;

    if (budget) {
      budget.roomBreakdown.forEach((roomBreakdown) => {
        const template = roomTemplatesMap.get(roomBreakdown.roomType);
        const roomDisplayName = template?.displayName || roomBreakdown.roomType;

        roomBreakdownData.push([
          estimate.id,
          `${estimate.clientInfo.firstName} ${estimate.clientInfo.lastName}`,
          roomDisplayName,
          roomBreakdown.roomSize,
          roomBreakdown.quantity,
          formatCurrency(roomBreakdown.lowAmount),
          formatCurrency(roomBreakdown.midAmount),
          formatCurrency(roomBreakdown.midHighAmount),
          formatCurrency(roomBreakdown.highAmount),
        ]);
      });
    }
  });

  const roomBreakdownSheet = utils.aoa_to_sheet(roomBreakdownData);
  utils.book_append_sheet(workbook, roomBreakdownSheet, 'Room Breakdown');

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `budget-estimates-export-${timestamp}.xlsx`;

  // Write the file
  writeFile(workbook, filename);
}
