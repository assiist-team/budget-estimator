// Zustand store for budget defaults state management
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { collection, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { BudgetDefaults } from '../types';

interface BudgetDefaultsState {
  // Budget defaults
  defaults: BudgetDefaults | null;

  // Loading state
  loading: boolean;
  error: string | null;

  // Actions
  loadDefaults: () => Promise<void>;
  saveDefaults: (defaults: BudgetDefaults) => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  defaults: null,
  loading: false,
  error: null,
};

const DEFAULTS_DOC_ID = 'budgetDefaults';

export const useBudgetDefaultsStore = create<BudgetDefaultsState>()(
  persist(
    (set) => ({
      ...initialState,

      loadDefaults: async () => {
        set({ loading: true, error: null });

        try {
          const docRef = doc(collection(db, 'config'), DEFAULTS_DOC_ID);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            set({
              defaults: {
                installationCents: data.installationCents,
                fuelCents: data.fuelCents,
                storageAndReceivingCents: data.storageAndReceivingCents,
                kitchenCents: data.kitchenCents,
                propertyManagementCents: data.propertyManagementCents,
                designFeeRatePerSqftCents: data.designFeeRatePerSqftCents,
              },
              loading: false
            });
          } else {
            // Create default values if document doesn't exist
            const defaultDefaults: BudgetDefaults = {
              installationCents: 500000, // $5,000
              fuelCents: 200000, // $2,000
              storageAndReceivingCents: 400000, // $4,000
              kitchenCents: 500000, // $5,000
              propertyManagementCents: 400000, // $4,000
              designFeeRatePerSqftCents: 1000 // $10/sqft
            };

            set({ defaults: defaultDefaults, loading: false });
          }
        } catch (error) {
          console.error('Error loading budget defaults:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to load budget defaults',
            loading: false
          });
        }
      },

      saveDefaults: async (newDefaults) => {
        set({ loading: true, error: null });

        try {
          const docRef = doc(collection(db, 'config'), DEFAULTS_DOC_ID);
          await setDoc(docRef, newDefaults);

          set({ defaults: newDefaults, loading: false });
        } catch (error) {
          console.error('Error saving budget defaults:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to save budget defaults',
            loading: false
          });
        }
      },

      setLoading: (loading) => set({ loading }),

      setError: (error) => set({ error }),

      reset: () => set(initialState),
    }),
    {
      name: 'budget-defaults-storage',
      // Only persist the defaults data (not loading/error state)
      partialize: (state) => ({
        defaults: state.defaults,
      }),
    }
  )
);


