import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { collection, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useEstimatorStore } from '../store/estimatorStore';
import Header from '../components/Header';
import ProgressBar from '../components/ProgressBar';
import type { ClientInfo, RoomItem, RoomWithItems } from '../types';
import { formatCurrency, generateEstimateId } from '../utils/calculations';
import { useRoomTemplates } from '../hooks/useRoomTemplates';
import { syncToHighLevel } from '../utils/highLevelSync';

export default function ResultsPage() {
  const navigate = useNavigate();
  const {
    propertySpecs,
    selectedRooms,
    budget,
    setClientInfo,
    reset
  } = useEstimatorStore();

  const { roomTemplates, items, loading: templatesLoading } = useRoomTemplates();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ClientInfo>();

  // Redirect if no budget calculated
  useEffect(() => {
    if (!budget || !selectedRooms || selectedRooms.length === 0) {
      navigate('/rooms');
    }
  }, [budget, selectedRooms, navigate]);

  if (!budget || !propertySpecs || templatesLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading estimate details...</p>
        </div>
      </div>
    );
  }


  const onSubmit = async (data: ClientInfo) => {
    setIsSubmitting(true);
    setClientInfo(data);

    try {
      // Convert selectedRooms to RoomWithItems with complete item mappings
      const roomsWithItems: RoomWithItems[] = selectedRooms.map(room => {
        const template = roomTemplates.get(room.roomType);
        if (template && template.sizes[room.roomSize]) {
          return {
            ...room,
            items: template.sizes[room.roomSize].items
          };
        }
        return {
          ...room,
          items: []
        };
      });

      // Save estimate to Firestore with complete item mappings
      const estimateData = {
        id: generateEstimateId(),
        clientInfo: data,
        propertySpecs,
        rooms: roomsWithItems,
        budget,
        status: 'submitted',
        source: 'direct',
        viewCount: 0,
        syncedToHighLevel: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        submittedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'estimates'), estimateData);
      const estimateId = docRef.id;

      // Sync to High Level CRM
      const syncSuccess = await syncToHighLevel(estimateData as any, estimateId);

      // Update sync status in Firestore
      await updateDoc(docRef, {
        syncedToHighLevel: syncSuccess,
        syncedAt: serverTimestamp()
      });

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
          <div className="bg-gradient-to-br from-primary-600 to-primary-900 text-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow duration-200 mb-8">
            <div className="text-center py-6">
              <p className="text-lg font-medium mb-3 opacity-90">
                ESTIMATED FURNISHINGS BUDGET RANGE
              </p>
              <div className="text-5xl font-bold mb-2">
                {formatCurrency(budget.rangeLow)} — {formatCurrency(budget.rangeHigh)}
              </div>
              <p className="text-sm opacity-75 mt-4">
                {propertySpecs.squareFootage.toLocaleString()} sqft property | Max capacity: {propertySpecs.guestCapacity} guests
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
                  <div className="space-y-6 mb-4">
                    {budget.roomBreakdown.map((room, idx) => {
                      const template = roomTemplates.get(room.roomType);
                      const roomSizeData = template?.sizes[room.roomSize as 'small' | 'medium' | 'large'];

                      return (
                        <div key={idx} className="border-b border-gray-100 pb-4 last:border-b-0">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-medium text-gray-900">
                                {room.roomType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </h4>
                              <p className="text-sm text-gray-500 mt-1">
                                {room.roomSize.charAt(0).toUpperCase() + room.roomSize.slice(1)} × {room.quantity}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="font-medium text-gray-900">
                                {formatCurrency(room.budgetAmount)} — {formatCurrency(Math.round(room.budgetAmount * 1.2))}
                              </div>
                            </div>
                          </div>

                          {roomSizeData && roomSizeData.items.length > 0 && (
                            <div className="ml-4 space-y-2">
                              <h5 className="text-sm font-medium text-gray-700 mb-2">Included Items:</h5>
                              <div className="grid gap-2">
                                {roomSizeData.items
                                  .sort((a: RoomItem, b: RoomItem) => {
                                    const itemA = items.get(a.itemId);
                                    const itemB = items.get(b.itemId);
                                    const nameA = itemA?.name || a.itemId.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
                                    const nameB = itemB?.name || b.itemId.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
                                    return nameA.localeCompare(nameB);
                                  })
                                  .map((roomItem: RoomItem, itemIdx: number) => {
                                    const item = items.get(roomItem.itemId);
                                    const itemDisplayName = item?.name || roomItem.itemId.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());

                                    return (
                                      <div key={itemIdx} className="flex justify-between items-center text-sm bg-gray-50 px-3 py-2 rounded">
                                        <span className="text-gray-700">
                                          {itemDisplayName}
                                        </span>
                                        <span className="text-gray-600">
                                          Qty: {roomItem.quantity}
                                        </span>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
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
              className="btn-secondary"
            >
              ← Edit Property Details
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

