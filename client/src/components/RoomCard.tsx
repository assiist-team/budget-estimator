import type { RoomWithItems } from '../types';
import { formatCurrency } from '../utils/calculations';

interface RoomCardProps {
  room: RoomWithItems;
  isSelected: boolean;
  priceRange: {
    low: number;
    mid: number;
  };
  onToggle: () => void;
  onSizeChange: (size: 'small' | 'medium' | 'large') => void;
  onQuantityChange: (quantity: number) => void;
}

export default function RoomCard({
  room,
  isSelected,
  priceRange,
  onToggle,
  onSizeChange,
  onQuantityChange,
}: RoomCardProps) {
  const sizes: Array<'small' | 'medium' | 'large'> = ['small', 'medium', 'large'];

  return (
    <div className={`card ${!isSelected ? 'opacity-50' : ''} transition-opacity duration-200`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggle}
            className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
          />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {room.displayName}
            </h3>
            {isSelected && (
              <div className="mt-4 text-sm text-gray-600">
                Low: {formatCurrency(priceRange.low)} — Mid: {formatCurrency(priceRange.mid)}
              </div>
            )}
          </div>
        </div>
      </div>

      {isSelected && (
        <div className="space-y-4 pl-8">
          {/* Size Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Size
            </label>
            <div className="flex gap-2">
              {sizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => onSizeChange(size)}
                  className={`
                    px-4 py-2 rounded-lg font-medium transition-all duration-200
                    ${room.roomSize === size
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  {size.charAt(0).toUpperCase() + size.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity Controls */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onQuantityChange(Math.max(1, room.quantity - 1))}
                disabled={room.quantity <= 1}
                className="w-10 h-10 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-gray-700"
              >
                −
              </button>
              <span className="w-12 text-center font-semibold text-gray-900">
                {room.quantity}
              </span>
              <button
                type="button"
                onClick={() => onQuantityChange(room.quantity + 1)}
                disabled={room.quantity >= 10}
                className="w-10 h-10 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-gray-700"
              >
                +
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

