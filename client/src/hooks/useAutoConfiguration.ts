import { useEffect, useMemo } from 'react';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useConfigStore } from '../store/configStore';
import { useEstimatorStore } from '../store/estimatorStore';
import type { AutoConfigRules } from '../types/config';
import {
  computeAutoConfiguration,
  clampGuestsForSqft,
  getAllowedGuestRange,
  isValidSqftGuestCombination
} from '../utils/autoConfiguration';

/**
 * Hook for auto-configuration functionality
 * Provides computed configuration and validation helpers for current property specs
 */
export function useAutoConfiguration(currentSquareFootage?: number, currentGuestCapacity?: number) {
  const { rules, computedConfiguration, setComputedConfiguration } = useConfigStore();
  const { propertySpecs } = useEstimatorStore();

  // Use provided values or fall back to store values
  const squareFootage = currentSquareFootage ?? propertySpecs?.squareFootage ?? 2200;
  const guestCapacity = currentGuestCapacity ?? propertySpecs?.guestCapacity ?? 12;

  // Compute configuration when property specs or rules change
  useEffect(() => {
    if (!rules) {
      setComputedConfiguration(null);
      return;
    }

    try {
      const config = computeAutoConfiguration(
        squareFootage,
        guestCapacity,
        rules
      );
      setComputedConfiguration(config);
    } catch (error) {
      console.error('Error computing auto-configuration:', error);
      setComputedConfiguration(null);
    }
  }, [rules, squareFootage, guestCapacity, setComputedConfiguration]);

  // Validation helpers
  const validation = useMemo(() => {
    if (!rules) {
      return {
        isValid: false,
        clampedGuests: guestCapacity,
        allowedRange: null,
        reason: 'Missing configuration rules'
      };
    }

    const clampedGuests = clampGuestsForSqft(
      squareFootage,
      guestCapacity,
      rules
    );

    const allowedRange = getAllowedGuestRange(squareFootage, rules);
    const isValid = isValidSqftGuestCombination(
      squareFootage,
      guestCapacity,
      rules
    );

    let reason = '';
    if (!isValid && allowedRange) {
      if (guestCapacity < allowedRange.min) {
        reason = `${squareFootage.toLocaleString()} sqft requires at least ${allowedRange.min} guests`;
      } else if (guestCapacity > allowedRange.max) {
        reason = `${squareFootage.toLocaleString()} sqft can accommodate at most ${allowedRange.max} guests`;
      }
    }

    return {
      isValid,
      clampedGuests,
      allowedRange,
      reason
    };
  }, [rules, squareFootage, guestCapacity]);

  return {
    computedConfiguration,
    validation,
    hasValidConfiguration: computedConfiguration !== null && validation.isValid,
  };
}

/**
 * Hook for loading auto-configuration rules
 * Handles fetching rules from Firestore or fallback to local cache
 */
export function useAutoConfigRules() {
  const { rules, loading, error, setRules, setLoading, setError } = useConfigStore();

  const loadRules = async () => {
    setLoading(true);
    setError(null);

    try {
      // Try to load from Firestore first
      const configDoc = await getDoc(doc(db, 'config', 'roomMappingRules'));
      if (configDoc.exists()) {
        const rulesData = configDoc.data() as AutoConfigRules;
        setRules(rulesData);
        console.log('Loaded auto-configuration rules from Firestore');
      } else {
        // Fallback to local file for initial setup
        console.log('No auto-configuration rules found in Firestore, trying local file...');
        const response = await fetch('/autoconfig.json');

        if (!response.ok) {
          throw new Error(`Failed to load rules: ${response.status}`);
        }

        const rulesData = await response.json();
        setRules(rulesData);
        console.log('Loaded auto-configuration rules from local file');
      }
    } catch (err) {
      console.error('Error loading auto-config rules:', err);
      setError(err instanceof Error ? err.message : 'Failed to load configuration');

      // Fallback to local file if Firestore fails
      try {
        console.log('Attempting fallback to local file...');
        const response = await fetch('/autoconfig.json');
        if (response.ok) {
          const rulesData = await response.json();
          setRules(rulesData);
          console.log('Loaded auto-configuration rules from local file as fallback');
        }
      } catch (fallbackErr) {
        console.error('Fallback to local file also failed:', fallbackErr);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Always load rules on mount, even if we have cached values
    // This ensures we get the latest from Firestore, not cached local file values
    if (!loading) {
      loadRules();
    }
  }, []); // Only run on mount

  return {
    rules,
    loading,
    error,
    loadRules,
  };
}
