import { utils, writeFile } from 'xlsx';
import type { Estimate, RoomWithItems, Item, RoomTemplate, Budget, ProjectBudget } from '../types';
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
      'Design Fee',
      'Status',
      'Source',
    ],
  ];

  estimates.forEach((estimate) => {
    const budget = estimate.rooms?.length
      ? calculateEstimate(estimate.rooms, roomTemplatesMap, itemsMap, {
          propertySpecs: estimate.propertySpecs,
          budgetDefaults: budgetDefaults,
        })
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
      projectBudget ? formatCurrency(projectBudget.projectAddOns.designFee) : '',
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

        const lowTotal = item ? item.lowPrice * totalQuantity : 0;
        const midTotal = item ? item.midPrice * totalQuantity : 0;
        const midHighTotal = item ? item.midHighPrice * totalQuantity : 0;
        const highTotal = item ? item.highPrice * totalQuantity : 0;

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
          item ? formatCurrency(item.lowPrice) : '',
          item ? formatCurrency(item.midPrice) : '',
          item ? formatCurrency(item.midHighPrice) : '',
          item ? formatCurrency(item.highPrice) : '',
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
    const budget = estimate.rooms?.length
      ? calculateEstimate(estimate.rooms, roomTemplatesMap, itemsMap, {
          propertySpecs: estimate.propertySpecs,
          budgetDefaults: budgetDefaults,
        })
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
