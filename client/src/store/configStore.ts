// Zustand store for auto-configuration state management
import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import type { AutoConfigRules, ComputedConfiguration } from '../types/config';

interface ConfigState {
  // Auto-configuration rules (published version)
  rules: AutoConfigRules | null;

  // Loading state
  loading: boolean;
  error: string | null;

  // Computed configuration for current property specs
  computedConfiguration: ComputedConfiguration | null;


  // Actions
  setRules: (rules: AutoConfigRules, fromFirestore?: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setComputedConfiguration: (config: ComputedConfiguration | null) => void;

  // Reset and clear cached rules
  reset: () => void;
  clearRules: () => void;
}

const initialState = {
  rules: null,
  loading: false,
  error: null,
  computedConfiguration: null, // Always null initially, computed fresh each time
};

export const useConfigStore = create<ConfigState>()(
  persist(
    subscribeWithSelector((set) => ({
      ...initialState,

      setRules: (rules) => set({ rules }),

      setLoading: (loading) => set({ loading }),

      setError: (error) => set({ error }),

      setComputedConfiguration: (computedConfiguration) => set({ computedConfiguration }),

      reset: () => set(initialState),

      // Clear cached rules (useful when switching from local file to Firestore)
      clearRules: () => set({ rules: null }),

      // Clear computed configuration when property specs change
      clearComputedConfiguration: () => set({ computedConfiguration: null }),
    })),
    {
      name: 'config-storage',
      // Only persist rules (computed configuration should be recalculated each time)
      partialize: (state) => ({
        rules: state.rules,
      }),
    }
  )
);

// Subscribe to property specs changes and clear computed configuration
useConfigStore.subscribe(
  (state) => state,
  () => {
    // This will be called whenever the config store changes, but we want to listen to property specs changes
    // We'll handle this in the useAutoConfiguration hook instead
  }
);
