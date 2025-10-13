// Zustand store for estimator state management
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PropertySpecs, SelectedRoom, Budget, ClientInfo } from '../types';

interface EstimatorState {
  // Current step in the flow
  currentStep: number;

  // Property specifications
  propertySpecs: PropertySpecs | null;

  // Selected rooms
  selectedRooms: SelectedRoom[];

  // Calculated budget
  budget: Budget | null;

  // Budget mode toggle
  budgetMode: boolean;

  // Client information
  clientInfo: ClientInfo | null;

  // Actions
  setCurrentStep: (step: number) => void;
  setPropertySpecs: (specs: PropertySpecs) => void;
  setSelectedRooms: (rooms: SelectedRoom[]) => void;
  updateRoom: (index: number, room: SelectedRoom) => void;
  addRoom: (room: SelectedRoom) => void;
  removeRoom: (index: number) => void;
  setBudget: (budget: Budget) => void;
  setBudgetMode: (mode: boolean) => void;
  setClientInfo: (info: ClientInfo) => void;
  reset: () => void;
}

const initialState = {
  currentStep: 0,
  propertySpecs: null,
  selectedRooms: [],
  budget: null,
  budgetMode: true,
  clientInfo: null,
};

export const useEstimatorStore = create<EstimatorState>()(
  persist(
    (set) => ({
      ...initialState,

      setCurrentStep: (step) => set({ currentStep: step }),

      setPropertySpecs: (specs) => set({ propertySpecs: specs }),

      setSelectedRooms: (rooms) => set({ selectedRooms: rooms }),

      updateRoom: (index, room) =>
        set((state) => {
          const newRooms = [...state.selectedRooms];
          newRooms[index] = room;
          return { selectedRooms: newRooms };
        }),

      addRoom: (room) =>
        set((state) => ({
          selectedRooms: [...state.selectedRooms, room],
        })),

      removeRoom: (index) =>
        set((state) => ({
          selectedRooms: state.selectedRooms.filter((_, i) => i !== index),
        })),

      setBudget: (budget) => set({ budget }),

      setBudgetMode: (mode) => set({ budgetMode: mode }),

      setClientInfo: (info) => set({ clientInfo: info }),

      reset: () => set(initialState),
    }),
    {
      name: 'estimator-storage',
      // Only persist certain fields
      partialize: (state) => ({
        propertySpecs: state.propertySpecs,
        selectedRooms: state.selectedRooms,
        budget: state.budget,
        currentStep: state.currentStep,
        budgetMode: state.budgetMode,
      }),
    }
  )
);

