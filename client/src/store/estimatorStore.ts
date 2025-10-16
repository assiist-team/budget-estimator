// Zustand store for estimator state management
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PropertySpecs, RoomWithItems, ClientInfo } from '../types';

interface EstimatorState {
  // Current step in the flow
  currentStep: number;

  // Property specifications
  propertySpecs: PropertySpecs | null;

  // Selected rooms with items
  selectedRooms: RoomWithItems[];


  // Client information
  clientInfo: ClientInfo | null;

  // Flag to check if the initial configuration has been applied
  isConfigurationInitialized: boolean;

  // Actions
  setCurrentStep: (step: number) => void;
  setPropertySpecs: (specs: PropertySpecs) => void;
  setSelectedRooms: (rooms: RoomWithItems[]) => void;
  updateRoom: (index: number, room: RoomWithItems) => void;
  addRoom: (room: RoomWithItems) => void;
  removeRoom: (index: number) => void;
  setClientInfo: (info: ClientInfo) => void;
  setConfigurationInitialized: (initialized: boolean) => void;
  reset: () => void;
}

const initialState = {
  currentStep: 0,
  propertySpecs: null,
  selectedRooms: [],
  clientInfo: null,
  isConfigurationInitialized: false,
};

export const useEstimatorStore = create<EstimatorState>()(
  persist(
    (set) => ({
      ...initialState,

      setCurrentStep: (step) => set({ currentStep: step }),

      setPropertySpecs: (specs) =>
        set({
          propertySpecs: specs,
          selectedRooms: [],
          isConfigurationInitialized: false,
        }),

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


      setClientInfo: (info) => set({ clientInfo: info }),

      setConfigurationInitialized: (initialized) =>
        set({ isConfigurationInitialized: initialized }),

      reset: () => set(initialState),
    }),
    {
      name: 'estimator-storage',
      // Only persist certain fields
      partialize: (state) => ({
        propertySpecs: state.propertySpecs,
        selectedRooms: state.selectedRooms,
        currentStep: state.currentStep,
        isConfigurationInitialized: state.isConfigurationInitialized,
      }),
    }
  )
);

