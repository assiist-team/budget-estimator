import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEstimatorStore } from '../store/estimatorStore';
import Header from '../components/Header';
import ProgressBar from '../components/ProgressBar';
import RoomCard from '../components/RoomCard';
import type { RoomWithItems } from '../types';
import { suggestRoomConfiguration, formatCurrency, calculateEstimate } from '../utils/calculations';
import { useRoomTemplates } from '../hooks/useRoomTemplates';
import { useAutoConfiguration, useAutoConfigRules } from '../hooks/useAutoConfiguration';
import { calculateBedroomCapacity } from '../utils/autoConfiguration';

export default function RoomConfigurationPage() {
  const navigate = useNavigate();
  const {
    propertySpecs,
    selectedRooms,
    setSelectedRooms,
    setCurrentStep,
    setBudget,
    budgetMode,
    isConfigurationInitialized,
    setConfigurationInitialized,
  } = useEstimatorStore();
  
  const { roomTemplates, loading } = useRoomTemplates();
  const { computedConfiguration } = useAutoConfiguration();
  const { rules } = useAutoConfigRules();
  const [localRooms, setLocalRooms] = useState<RoomWithItems[]>(selectedRooms as RoomWithItems[]);

  // Initialize with suggestions only if the configuration has not been initialized yet.
  useEffect(() => {
    if (
      !isConfigurationInitialized &&
      propertySpecs &&
      computedConfiguration &&
      roomTemplates.size > 0
    ) {
      const suggestions = suggestRoomConfiguration(
        computedConfiguration,
        propertySpecs.squareFootage,
        propertySpecs.guestCapacity
      );

      // Apply the new suggestions to both local and global state.
      setLocalRooms(suggestions);
      setSelectedRooms(suggestions);

      // Mark the configuration as initialized and reset the user modification flag.
      setConfigurationInitialized(true);
    }
  }, [
    isConfigurationInitialized,
    propertySpecs,
    computedConfiguration,
    roomTemplates,
    setSelectedRooms,
    setConfigurationInitialized,
  ]);

  // Redirect if no property specs
  useEffect(() => {
    if (!propertySpecs) {
      navigate('/property');
    }
  }, [propertySpecs, navigate]);

  const handleToggleRoom = (roomType: string) => {
    const existingIndex = localRooms.findIndex(r => r.roomType === roomType);
    
    if (existingIndex >= 0) {
      // Remove room
      setLocalRooms(localRooms.filter((_, i) => i !== existingIndex));
    } else {
      // Add room with default values
      const template = roomTemplates.get(roomType);
      if (template) {
        const roomSize = template.sizes.medium;
        setLocalRooms([
          ...localRooms,
          {
            roomType,
            roomSize: 'medium',
            quantity: 1,
            displayName: template.displayName,
            items: roomSize.items,
          },
        ]);
      }
    }
  };

  const handleSizeChange = (index: number, size: 'small' | 'medium' | 'large') => {
    const newRooms = [...localRooms];
    const currentRoom = newRooms[index];
    const template = roomTemplates.get(currentRoom.roomType);
    if (template) {
      const roomSize = template.sizes[size];
      newRooms[index] = {
        ...currentRoom,
        roomSize: size,
        items: roomSize.items
      };
    }
    setLocalRooms(newRooms);
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    const newRooms = [...localRooms];
    newRooms[index] = { ...newRooms[index], quantity };
    setLocalRooms(newRooms);
  };

  const getRoomPriceRange = (roomType: string, size: 'small' | 'medium' | 'large') => {
    const template = roomTemplates.get(roomType);
    if (!template) return { low: 0, high: 0 };

    const roomSize = template.sizes[size];
    return {
      low: roomSize.totals.budget,
      high: roomSize.totals.mid, // Use mid tier for upper range instead of 20% markup
    };
  };

  const calculateRunningTotal = () => {
    if (localRooms.length === 0) return { low: 0, high: 0 };
    
    const budget = calculateEstimate(localRooms, roomTemplates, undefined, budgetMode);
    return {
      low: budget.rangeLow,
      high: budget.rangeHigh,
    };
  };

  const handleContinue = () => {
    if (localRooms.length === 0) {
      alert('Please select at least one room');
      return;
    }
    
    // Calculate budget
    const budget = calculateEstimate(localRooms, roomTemplates, undefined, budgetMode);
    
    setSelectedRooms(localRooms);
    setBudget(budget);
    setCurrentStep(3);
    navigate('/results');
  };

  const runningTotal = calculateRunningTotal();

  // Group rooms by category
  const commonSpaces = Array.from(roomTemplates.values())
    .filter(t => t.category === 'common_spaces')
    .sort((a, b) => a.sortOrder - b.sortOrder);
  
  const sleepingSpaces = Array.from(roomTemplates.values())
    .filter(t => t.category === 'sleeping_spaces')
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading room templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header currentStep={2} totalSteps={3} />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ProgressBar currentStep={2} totalSteps={3} />
        
        <div className="mt-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Configure Your Rooms
          </h1>
          <p className="text-gray-600 mb-8">
            Select the rooms you'd like to furnish and customize their sizes
          </p>

          {/* Common Spaces */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Common Spaces
            </h2>
            <div className="space-y-4">
              {commonSpaces.map((template) => {
                const roomIndex = localRooms.findIndex(r => r.roomType === template.id);
                const room = roomIndex >= 0 ? localRooms[roomIndex] : null;
                const isSelected = room !== null;
                
                return (
                  <RoomCard
                    key={template.id}
                    room={room || {
                      roomType: template.id,
                      roomSize: 'medium',
                      quantity: 1,
                      displayName: template.displayName,
                    }}
                    isSelected={isSelected}
                    priceRange={getRoomPriceRange(
                      template.id,
                      room?.roomSize || 'medium'
                    )}
                    onToggle={() => handleToggleRoom(template.id)}
                    onSizeChange={(size) => roomIndex >= 0 && handleSizeChange(roomIndex, size)}
                    onQuantityChange={(quantity) => roomIndex >= 0 && handleQuantityChange(roomIndex, quantity)}
                  />
                );
              })}
            </div>
          </div>

          {/* Sleeping Spaces */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Sleeping Spaces
            </h2>
            <div className="space-y-4">
              {sleepingSpaces.map((template) => {
                const roomIndex = localRooms.findIndex(r => r.roomType === template.id);
                const room = roomIndex >= 0 ? localRooms[roomIndex] : null;
                const isSelected = room !== null;
                
                return (
                  <RoomCard
                    key={template.id}
                    room={room || {
                      roomType: template.id,
                      roomSize: 'medium',
                      quantity: 1,
                      displayName: template.displayName,
                    }}
                    isSelected={isSelected}
                    priceRange={getRoomPriceRange(
                      template.id,
                      room?.roomSize || 'medium'
                    )}
                    onToggle={() => handleToggleRoom(template.id)}
                    onSizeChange={(size) => roomIndex >= 0 && handleSizeChange(roomIndex, size)}
                    onQuantityChange={(quantity) => roomIndex >= 0 && handleQuantityChange(roomIndex, quantity)}
                  />
                );
              })}
            </div>
          </div>

          {/* Running Total */}
          {localRooms.length > 0 && (
            <div className="card bg-primary-50 border-2 border-primary-200">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Estimated Budget Range
                </p>
                <p className="text-3xl font-bold text-primary-800">
                  {formatCurrency(runningTotal.low)} - {formatCurrency(runningTotal.high)}
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  Max capacity: {computedConfiguration && rules ? calculateBedroomCapacity(computedConfiguration.bedrooms, rules) : 0} guests
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-6">
            <button
              type="button"
              onClick={() => navigate('/property')}
              className="btn-secondary"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={handleContinue}
              disabled={localRooms.length === 0}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue to Results →
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

