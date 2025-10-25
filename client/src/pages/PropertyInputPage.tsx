import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useEstimatorStore } from '../store/estimatorStore';
import { useAutoConfigRules, useAutoConfiguration } from '../hooks/useAutoConfiguration';
import Header from '../components/Header';
import ProgressBar from '../components/ProgressBar';
import type { PropertySpecs } from '../types';

export default function PropertyInputPage() {
  const navigate = useNavigate();
  const { setPropertySpecs, setCurrentStep, propertySpecs } = useEstimatorStore();

  // Load auto-configuration rules
  const { rules, loading: rulesLoading } = useAutoConfigRules();

  const { register, handleSubmit, watch, formState: { errors } } = useForm<PropertySpecs>({
    defaultValues: propertySpecs || {
      squareFootage: 2200,
      guestCapacity: 12,
      notes: '',
    },
  });

  const squareFootage = watch('squareFootage');
  const guestCapacity = watch('guestCapacity');

  // Get auto-configuration validation using current form values
  const { validation } = useAutoConfiguration(squareFootage, guestCapacity);

  const onSubmit = (data: PropertySpecs) => {
    setPropertySpecs(data);
    setCurrentStep(2);
    navigate('/tools/budget-estimator/rooms');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header currentStep={1} totalSteps={3} />
      
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ProgressBar currentStep={1} totalSteps={3} />
        
        <div className="mt-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Tell us about your property
          </h1>
          <p className="text-gray-600 mb-8">
            We'll use this information to suggest the best room configurations
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Square Footage */}
            <div className="card">
              <label className="block text-lg font-semibold text-gray-900 mb-4">
                Square Footage *
              </label>
              <div className="flex items-center gap-4 mb-2">
                <input
                  type="number"
                  {...register('squareFootage', {
                    required: 'Square footage is required',
                    min: { value: rules?.validation.global.min_sqft || 500, message: `Minimum ${rules?.validation.global.min_sqft || 500} sqft` },
                    max: { value: rules?.validation.global.max_sqft || 10000, message: `Maximum ${rules?.validation.global.max_sqft || 10000} sqft` }
                  })}
                  className="input-field flex-1"
                />
                <span className="text-gray-600 font-medium">sq ft</span>
              </div>
              <input
                type="range"
                min={rules?.validation.global.min_sqft || 500}
                max={rules?.validation.global.max_sqft || 10000}
                step="100"
                value={squareFootage}
                {...register('squareFootage')}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                disabled={rulesLoading}
              />
              <div className="flex justify-between text-sm text-gray-500 mt-1">
                <span>{(rules?.validation.global.min_sqft || 500).toLocaleString()} sqft</span>
                <span>{(rules?.validation.global.max_sqft || 10000).toLocaleString()} sqft</span>
              </div>
              {errors.squareFootage && (
                <p className="text-red-600 text-sm mt-2">{errors.squareFootage.message}</p>
              )}
            </div>

            {/* Guest Capacity */}
            <div className="card">
              <label className="block text-lg font-semibold text-gray-900 mb-4">
                Maximum Guest Capacity *
              </label>
              <div className="flex items-center gap-4 mb-2">
                <input
                  type="number"
                  {...register('guestCapacity', {
                    required: 'Guest capacity is required',
                    min: { value: rules?.validation.global.min_guests || 1, message: `Minimum ${rules?.validation.global.min_guests || 1} guests` },
                    max: { value: rules?.validation.global.max_guests || 50, message: `Maximum ${rules?.validation.global.max_guests || 50} guests` }
                  })}
                  className="input-field flex-1"
                  disabled={rulesLoading}
                />
                <span className="text-gray-600 font-medium">guests</span>
              </div>
              <input
                type="range"
                min={rules?.validation.global.min_guests || 1}
                max={rules?.validation.global.max_guests || 50}
                step="1"
                value={guestCapacity}
                {...register('guestCapacity')}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                disabled={rulesLoading}
              />
              <div className="flex justify-between text-sm text-gray-500 mt-1">
                <span>{rules?.validation.global.min_guests || 1} guests</span>
                <span>{rules?.validation.global.max_guests || 50} guests</span>
              </div>

              {/* Validation feedback */}
              {rules && !validation.isValid && validation.reason && (
                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-yellow-800 text-sm">{validation.reason}</p>
                </div>
              )}




              {errors.guestCapacity && (
                <p className="text-red-600 text-sm mt-2">{errors.guestCapacity.message}</p>
              )}
            </div>


            {/* Additional Notes */}
            <div className="card">
              <label className="block text-lg font-semibold text-gray-900 mb-4">
                Additional Notes <span className="text-gray-500 font-normal">(optional)</span>
              </label>
              <textarea
                {...register('notes')}
                rows={4}
                maxLength={500}
                placeholder="Any special requirements or details about your property..."
                className="input-field resize-none"
              />
              <p className="text-sm text-gray-500 mt-2">
                {watch('notes')?.length || 0} / 500 characters
              </p>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-6">
              <button
                type="button"
                onClick={() => navigate('/tools/budget-estimator')}
                className="btn-secondary"
              >
                ← Back
              </button>
              <button
                type="submit"
                className="btn-primary"
              >
                Continue to Rooms →
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

