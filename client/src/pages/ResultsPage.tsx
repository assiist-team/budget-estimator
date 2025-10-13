import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useEstimatorStore } from '../store/estimatorStore';
import Header from '../components/Header';
import ProgressBar from '../components/ProgressBar';
import type { ClientInfo } from '../types';
import { formatCurrency, generateEstimateId } from '../utils/calculations';

export default function ResultsPage() {
  const navigate = useNavigate();
  const {
    propertySpecs,
    selectedRooms,
    budget,
    setClientInfo,
    reset
  } = useEstimatorStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ClientInfo>();

  // Redirect if no budget calculated
  useEffect(() => {
    if (!budget || !selectedRooms || selectedRooms.length === 0) {
      navigate('/rooms');
    }
  }, [budget, selectedRooms, navigate]);

  if (!budget || !propertySpecs) {
    return null;
  }


  const onSubmit = async (data: ClientInfo) => {
    setIsSubmitting(true);
    setClientInfo(data);

    try {
      // Save estimate to Firestore
      const estimateData = {
        id: generateEstimateId(),
        clientInfo: data,
        propertySpecs,
        rooms: selectedRooms,
        budget,
        status: 'submitted',
        source: 'direct',
        viewCount: 0,
        syncedToHighLevel: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        submittedAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'estimates'), estimateData);

      // TODO: Send email with PDF
      // For now, just show success message
      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting estimate:', error);
      alert('There was an error submitting your estimate. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-2xl mx-auto px-4">
          <div className="card text-center bg-white p-12">
            <div className="text-6xl mb-6">✓</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Success!
            </h1>
            <p className="text-xl text-gray-600 mb-6">
              Your estimate has been sent!
            </p>
            <p className="text-gray-600 mb-8">
              We've emailed your detailed estimate. Check your inbox in the next few minutes.
              We'll be in touch soon!
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => {
                  reset();
                  navigate('/');
                }}
                className="btn-primary"
              >
                Start Another Estimate
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header currentStep={3} totalSteps={3} />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ProgressBar currentStep={3} totalSteps={3} />
        
        <div className="mt-8">
          {/* Overall Budget Range */}
          <div className="bg-gradient-to-br from-amber-800 to-amber-900 text-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow duration-200 mb-8">
            <div className="text-center py-6">
              <p className="text-lg font-medium mb-3 opacity-90">
                ESTIMATED FURNISHINGS BUDGET RANGE
              </p>
              <div className="text-5xl font-bold mb-2">
                {formatCurrency(budget.rangeLow)} — {formatCurrency(budget.rangeHigh)}
              </div>
              <p className="text-lg opacity-90">
                Furnishings Budget Range
              </p>
              <p className="text-sm opacity-75 mt-4">
                Based on {selectedRooms.length} room{selectedRooms.length !== 1 ? 's' : ''},
                {propertySpecs.squareFootage.toLocaleString()} sqft property
              </p>
            </div>
          </div>

          {/* Budget Estimate */}
          <div className="mb-8">
            <div className="card">
              <div className="w-full text-left">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="mb-1">
                      <span className="text-2xl font-bold text-primary-800">
                        Estimated Furnishings Budget Breakdown
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="space-y-2 mb-4">
                    {budget.roomBreakdown.map((room, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          {room.roomType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          ({room.roomSize}) × {room.quantity}
                        </span>
                        <span className="font-medium text-gray-900">
                          {formatCurrency(room.budgetAmount)} — {formatCurrency(Math.round(room.budgetAmount * 1.2))}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total Range</span>
                      <span>{formatCurrency(budget.rangeLow)} — {formatCurrency(budget.rangeHigh)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="card bg-primary-50 border-2 border-primary-200">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Get Your Detailed Estimate
            </h2>
            <p className="text-gray-600 mb-6">
              Enter your contact information to receive a detailed PDF estimate via email
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    {...register('firstName', { required: 'First name is required' })}
                    className="input-field"
                    placeholder="John"
                  />
                  {errors.firstName && (
                    <p className="text-red-600 text-sm mt-1">{errors.firstName.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    {...register('lastName', { required: 'Last name is required' })}
                    className="input-field"
                    placeholder="Smith"
                  />
                  {errors.lastName && (
                    <p className="text-red-600 text-sm mt-1">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address',
                    },
                  })}
                  className="input-field"
                  placeholder="john.smith@email.com"
                />
                {errors.email && (
                  <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number <span className="text-gray-500">(optional)</span>
                </label>
                <input
                  type="tel"
                  {...register('phone')}
                  className="input-field"
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company <span className="text-gray-500">(optional)</span>
                </label>
                <input
                  type="text"
                  {...register('company')}
                  className="input-field"
                  placeholder="Company name"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit & Get Estimate →'}
              </button>
            </form>
          </div>

          {/* Back Button */}
          <div className="mt-6">
            <button
              onClick={() => navigate('/rooms')}
              className="btn-ghost"
            >
              ← Edit Property Details
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

