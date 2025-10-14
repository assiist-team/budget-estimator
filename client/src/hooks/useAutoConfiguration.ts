import { useEffect, useMemo } from 'react';
import { useConfigStore } from '../store/configStore';
import { useEstimatorStore } from '../store/estimatorStore';
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
export function useAutoConfiguration() {
  const { rules, computedConfiguration, setComputedConfiguration } = useConfigStore();
  const { propertySpecs } = useEstimatorStore();

  // Compute configuration when property specs or rules change
  useEffect(() => {
    if (!rules || !propertySpecs) {
      setComputedConfiguration(null);
      return;
    }

    try {
      const config = computeAutoConfiguration(
        propertySpecs.squareFootage,
        propertySpecs.guestCapacity,
        rules
      );
      setComputedConfiguration(config);
    } catch (error) {
      console.error('Error computing auto-configuration:', error);
      setComputedConfiguration(null);
    }
  }, [rules, propertySpecs, setComputedConfiguration]);

  // Validation helpers
  const validation = useMemo(() => {
    if (!rules || !propertySpecs) {
      return {
        isValid: false,
        clampedGuests: propertySpecs?.guestCapacity || 0,
        allowedRange: null,
        reason: 'Missing configuration or property specs'
      };
    }

    const clampedGuests = clampGuestsForSqft(
      propertySpecs.squareFootage,
      propertySpecs.guestCapacity,
      rules
    );

    const allowedRange = getAllowedGuestRange(propertySpecs.squareFootage, rules);
    const isValid = isValidSqftGuestCombination(
      propertySpecs.squareFootage,
      propertySpecs.guestCapacity,
      rules
    );

    let reason = '';
    if (!isValid && allowedRange) {
      if (propertySpecs.guestCapacity < allowedRange.min) {
        reason = `${propertySpecs.squareFootage.toLocaleString()} sqft requires at least ${allowedRange.min} guests`;
      } else if (propertySpecs.guestCapacity > allowedRange.max) {
        reason = `${propertySpecs.squareFootage.toLocaleString()} sqft can accommodate at most ${allowedRange.max} guests`;
      }
    }

    return {
      isValid,
      clampedGuests,
      allowedRange,
      reason
    };
  }, [rules, propertySpecs]);

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
      // For now, we'll use a fallback approach - in a real implementation,
      // this would fetch from Firestore with fallback to local file
      const response = await fetch('/autoconfig.json');

      if (!response.ok) {
        throw new Error(`Failed to load rules: ${response.status}`);
      }

      const rulesData = await response.json();
      setRules(rulesData);
    } catch (err) {
      console.error('Error loading auto-config rules:', err);
      setError(err instanceof Error ? err.message : 'Failed to load configuration');

      // Fallback to default rules if available
      // This would be replaced with actual fallback logic
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!rules && !loading) {
      loadRules();
    }
  }, [rules, loading]);

  return {
    rules,
    loading,
    error,
    loadRules,
  };
}
