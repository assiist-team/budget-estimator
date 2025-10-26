// Zustand store for ROI estimator state management and persistence
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RoiInputs } from '../utils/roi';

interface RoiEstimatorState {
  // Current step in the flow (0 = Input, 1 = Results)
  currentStep: number;

  // User inputs for ROI estimation
  inputs: RoiInputs;

  // Actions
  setCurrentStep: (step: number) => void;
  setInputs: (updater: (prev: RoiInputs) => RoiInputs) => void;
}

const defaultInputs: RoiInputs = {
  fixed: {
    mortgage: 30000,
    propertyTaxes: 3300,
    insurance: 1400,
    utilities: 10800,
    maintenance: 6000,
    supplies: 2000,
  },
  occupancyBefore: 0.43,
  occupancyAfter: 0.7,
  adrBefore: 300,
  adrAfter: 300,
  propertyManagementPct: 0.15,
  sdeMultiple: 3,
};

export const useRoiEstimatorStore = create<RoiEstimatorState>()(
  persist(
    (set) => ({
      currentStep: 0,
      inputs: defaultInputs,
      setCurrentStep: (step) => set({ currentStep: step }),
      setInputs: (updater) => set((state) => ({ inputs: updater(state.inputs) })),
    }),
    {
      name: 'estimator-storage-roi-estimator',
      partialize: (state) => ({
        currentStep: state.currentStep,
        inputs: state.inputs,
      }),
    }
  )
);


