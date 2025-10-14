// Zustand store for auto-configuration state management
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
  computedConfiguration: null,
};

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      ...initialState,

      setRules: (rules) => set({ rules }),

      setLoading: (loading) => set({ loading }),

      setError: (error) => set({ error }),

      setComputedConfiguration: (computedConfiguration) => set({ computedConfiguration }),

      reset: () => set(initialState),

      // Clear cached rules (useful when switching from local file to Firestore)
      clearRules: () => set({ rules: null }),
    }),
    {
      name: 'config-storage',
      // Only persist rules and computed configuration
      partialize: (state) => ({
        rules: state.rules,
        computedConfiguration: state.computedConfiguration,
      }),
    }
  )
);
