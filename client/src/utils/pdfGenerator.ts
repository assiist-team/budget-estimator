// PDF Generation utilities
// TODO: Implement with jsPDF or similar library in Phase 2

import type { Estimate } from '../types';
import { formatCurrency, QUALITY_TIERS } from './calculations';

/**
 * Generate PDF estimate (placeholder for Phase 2)
 * 
 * To implement:
 * 1. npm install jspdf jspdf-autotable
 * 2. Create styled PDF with company branding
 * 3. Include all quality tiers and room breakdowns
 * 4. Add charts/visualizations (optional)
 */
export async function generateEstimatePDF(estimate: Estimate): Promise<Blob | null> {
  console.log('PDF Generation called for estimate:', estimate.id);
  
  // Placeholder implementation
  // In Phase 2, implement with jsPDF:
  
  // import jsPDF from 'jspdf';
  // import 'jspdf-autotable';
  
  // const doc = new jsPDF();
  
  // Add header with logo
  // doc.setFontSize(20);
  // doc.text('1584 Interior Design', 20, 20);
  // doc.setFontSize(16);
  // doc.text('Project Estimate', 20, 30);
  
  // Add client information
  // doc.setFontSize(12);
  // doc.text(`Client: ${estimate.clientInfo.firstName} ${estimate.clientInfo.lastName}`, 20, 50);
  // doc.text(`Email: ${estimate.clientInfo.email}`, 20, 58);
  
  // Add property specs
  // doc.text(`Property: ${estimate.propertySpecs.squareFootage} sqft, ${estimate.propertySpecs.guestCapacity} guests`, 20, 74);
  
  // Add budget range summary
  // doc.setFontSize(14);
  // doc.text('Estimated Budget Range', 20, 90);
  // doc.setFontSize(16);
  // doc.text(`${formatCurrency(estimate.budget.rangeLow)} - ${formatCurrency(estimate.budget.rangeHigh)}`, 20, 100);
  
  // Add quality tier breakdown table
  // const tierData = Object.keys(QUALITY_TIERS).map(tier => [
  //   QUALITY_TIERS[tier as QualityTier].name,
  //   formatCurrency(estimate.budget[tier as QualityTier].total)
  // ]);
  
  // doc.autoTable({
  //   startY: 110,
  //   head: [['Quality Tier', 'Total Estimate']],
  //   body: tierData,
  // });
  
  // Add room breakdown for each tier
  // (similar table format)
  
  // Add footer
  // doc.setFontSize(10);
  // doc.text('1584 Interior Design | contact@1584design.com', 20, 280);
  
  // return doc.output('blob');
  
  console.warn('PDF generation not implemented yet. Will be added in Phase 2.');
  return null;
}

/**
 * Download PDF to user's device
 */
export function downloadPDF(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format estimate data for PDF (helper)
 */
export function formatEstimateForPDF(estimate: Estimate) {
  return {
    client: {
      name: `${estimate.clientInfo.firstName} ${estimate.clientInfo.lastName}`,
      email: estimate.clientInfo.email,
      phone: estimate.clientInfo.phone || 'N/A',
    },
    property: {
      squareFootage: estimate.propertySpecs.squareFootage.toLocaleString(),
      guestCapacity: estimate.propertySpecs.guestCapacity,
      type: estimate.propertySpecs.propertyType || 'Not specified',
    },
    rooms: estimate.rooms.map(room => ({
      name: room.displayName,
      size: room.roomSize,
      quantity: room.quantity,
    })),
    budget: {
      rangeLow: formatCurrency(estimate.budget.rangeLow),
      rangeHigh: formatCurrency(estimate.budget.rangeHigh),
      tiers: Object.keys(QUALITY_TIERS).map(tier => ({
        name: QUALITY_TIERS[tier as keyof typeof QUALITY_TIERS].name,
        description: QUALITY_TIERS[tier as keyof typeof QUALITY_TIERS].description,
        total: formatCurrency(estimate.budget[tier as keyof typeof QUALITY_TIERS].total),
      })),
    },
  };
}

