// ROI calculation utilities for the ROI Estimator tool

export interface RoiFixedCosts {
  mortgage: number; // dollars/year
  propertyTaxes: number; // dollars/year
  insurance: number; // dollars/year
  utilities: number; // dollars/year
  maintenance: number; // dollars/year
  supplies: number; // dollars/year
}

export interface RoiInputs {
  fixed: RoiFixedCosts;
  occupancyBefore: number; // 0..1
  occupancyAfter: number; // 0..1
  adrBefore: number; // dollars/day
  adrAfter: number; // dollars/day
  propertyManagementPct: number; // 0..1
  sdeMultiple: number; // e.g., 3
}

export interface RoiComputedFlat {
  grossBefore: number;
  grossAfter: number;
  pmBefore: number;
  pmAfter: number;
  otherFixed: number; // excludes mortgage and PM
  sdeBefore: number;
  sdeAfter: number;
  evBefore: number;
  evAfter: number;
  netCashFlowBefore: number;
  netCashFlowAfter: number;
  annualCashFlowGain: number;
  enterpriseValueGain: number;
  totalYearOneGain: number;
}

export function gross(adr: number, occupancy: number): number {
  return adr * occupancy * 365;
}

export function propertyManagementFee(grossAnnual: number, pmPct: number): number {
  return grossAnnual * pmPct;
}

export function sumOtherFixedExcludingMortgage(fixed: RoiFixedCosts): number {
  const { propertyTaxes, insurance, utilities, maintenance, supplies } = fixed;
  return propertyTaxes + insurance + utilities + maintenance + supplies;
}

export function computeNetCashFlow(grossAnnual: number, pmFee: number, fixed: RoiFixedCosts): number {
  // Net = G - PM - mortgage - otherFixed
  const otherFixed = sumOtherFixedExcludingMortgage(fixed);
  return grossAnnual - pmFee - fixed.mortgage - otherFixed;
}

export function computeSde(grossAnnual: number, otherFixedExclMortgage: number): number {
  // SDE = Net + mortgage + PM = G - OtherFixed
  return grossAnnual - otherFixedExclMortgage;
}

export function computeEnterpriseValue(sde: number, multiple: number): number {
  return sde * multiple;
}

export function computeProjection(inputs: RoiInputs): RoiComputedFlat {
  const otherFixed = sumOtherFixedExcludingMortgage(inputs.fixed);

  const gBefore = gross(inputs.adrBefore, inputs.occupancyBefore);
  const gAfter = gross(inputs.adrAfter, inputs.occupancyAfter);

  const pmBefore = propertyManagementFee(gBefore, inputs.propertyManagementPct);
  const pmAfter = propertyManagementFee(gAfter, inputs.propertyManagementPct);

  const netBefore = computeNetCashFlow(gBefore, pmBefore, inputs.fixed);
  const netAfter = computeNetCashFlow(gAfter, pmAfter, inputs.fixed);

  const sdeBefore = computeSde(gBefore, otherFixed);
  const sdeAfter = computeSde(gAfter, otherFixed);

  const evBefore = computeEnterpriseValue(sdeBefore, inputs.sdeMultiple);
  const evAfter = computeEnterpriseValue(sdeAfter, inputs.sdeMultiple);

  return {
    grossBefore: gBefore,
    grossAfter: gAfter,
    pmBefore,
    pmAfter,
    otherFixed,
    sdeBefore,
    sdeAfter,
    evBefore,
    evAfter,
    netCashFlowBefore: netBefore,
    netCashFlowAfter: netAfter,
    annualCashFlowGain: netAfter - netBefore,
    enterpriseValueGain: evAfter - evBefore,
    totalYearOneGain: (netAfter - netBefore) + (evAfter - evBefore),
  };
}


