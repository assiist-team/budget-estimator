import { useState, useRef, useEffect } from 'react';
import EmojiPicker, { type EmojiClickData, Categories } from 'emoji-picker-react';

interface EmojiPickerInputProps {
  value: string;
  onChange: (emoji: string) => void;
  maxLength?: number;
  placeholder?: string;
}

// Room-related emoji categories ordered first for easier access
const roomRelatedCategories = [
  { category: Categories.TRAVEL_PLACES, name: 'Places' }, // Contains 🏠🏡🏘️🏚️🏗️🏭🏢🏬🏣🏤🏥🏦🏨🏩🏪🏫🏬🏭🏯🏰
  { category: Categories.OBJECTS, name: 'Objects' }, // Contains various room-related items
  { category: Categories.SUGGESTED, name: 'Recently Used' },
  { category: Categories.SMILEYS_PEOPLE, name: 'Smileys & People' },
  { category: Categories.ANIMALS_NATURE, name: 'Animals & Nature' },
  { category: Categories.FOOD_DRINK, name: 'Food & Drink' },
  { category: Categories.ACTIVITIES, name: 'Activities' },
  { category: Categories.SYMBOLS, name: 'Symbols' },
  { category: Categories.FLAGS, name: 'Flags' },
];

export function EmojiPickerInput({ value, onChange, maxLength = 2, placeholder = 'Select an emoji' }: EmojiPickerInputProps) {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false);
      }
    }

    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPicker]);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    const emoji = emojiData.emoji;
    // If maxLength is 2, take only the first emoji (handles multi-character emojis)
    const selectedEmoji = maxLength === 2 ? emoji.slice(0, 2) : emoji;
    onChange(selectedEmoji);
    setShowPicker(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setShowPicker(!showPicker)}
          className="flex items-center justify-center w-12 h-10 px-3 py-2 border border-gray-300 rounded-md text-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
          aria-label="Select emoji"
        >
          {value || '🏠'}
        </button>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onClick={() => setShowPicker(true)}
          placeholder={placeholder}
          maxLength={maxLength}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>
      {showPicker && (
        <div 
          ref={pickerRef}
          className="absolute z-50 mt-2 left-0"
        >
          <div className="shadow-lg rounded-lg overflow-hidden border border-gray-200">
            <EmojiPicker
              onEmojiClick={handleEmojiClick}
              width={350}
              height={400}
              previewConfig={{ showPreview: false }}
              skinTonesDisabled
              categories={roomRelatedCategories}
              searchPlaceHolder="Search room emojis..."
            />
          </div>
        </div>
      )}
    </div>
  );
}

