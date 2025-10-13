# UI Specifications & User Flow

## Overview
Detailed screen-by-screen specifications for the 1584 Project Estimator web application.

**Design Philosophy:** Clean, professional, mobile-first, conversion-focused

---

## Design System

### Color Palette
```css
/* Primary Colors */
--primary-900: #1A252F;
--primary-800: #2C3E50;
--primary-700: #34495E;
--primary-600: #415A77;

/* Accent Colors */
--accent-900: #9A7B4F;
--accent-700: #B89858;
--accent-600: #C9A868;
--accent-500: #D4B878;

/* Neutrals */
--gray-50: #F9FAFB;
--gray-100: #F3F4F6;
--gray-200: #E5E7EB;
--gray-300: #D1D5DB;
--gray-500: #6B7280;
--gray-700: #374151;
--gray-900: #111827;

/* Semantic */
--success: #10B981;
--warning: #F59E0B;
--error: #EF4444;
--info: #3B82F6;

/* Backgrounds */
--bg-primary: #FFFFFF;
--bg-secondary: #F9FAFB;
--bg-elevated: #FFFFFF;
```

### Typography
```css
/* Font Stack */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Headings */
h1: 2.5rem (40px) / 600 weight
h2: 2rem (32px) / 600 weight
h3: 1.5rem (24px) / 600 weight
h4: 1.25rem (20px) / 600 weight

/* Body */
body: 1rem (16px) / 400 weight
large: 1.125rem (18px) / 400 weight
small: 0.875rem (14px) / 400 weight
```

### Spacing Scale
```css
/* 4px base unit */
--space-1: 0.25rem;  /* 4px */
--space-2: 0.5rem;   /* 8px */
--space-3: 0.75rem;  /* 12px */
--space-4: 1rem;     /* 16px */
--space-6: 1.5rem;   /* 24px */
--space-8: 2rem;     /* 32px */
--space-12: 3rem;    /* 48px */
--space-16: 4rem;    /* 64px */
```

### Border Radius
```css
--radius-sm: 0.25rem;  /* 4px */
--radius-md: 0.5rem;   /* 8px */
--radius-lg: 0.75rem;  /* 12px */
--radius-xl: 1rem;     /* 16px */
```

### Shadows
```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
```

---

## User Flow Summary

**3-Step Process (No Quality Selection Required):**
1. Property Input (sqft, guests)
2. Room Configuration (types, sizes, quantities)
3. Results & Contact (see all tiers, submit)

**Output:** Full range from Budget to High-End quality across all selected rooms

---

## Screen Layouts

### Mobile-First Breakpoints
```css
/* Mobile: < 640px (default) */
/* Tablet: 640px - 1024px */
/* Desktop: > 1024px */

@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
```

---

## Screen 1: Landing Page

### Purpose
Welcome visitors and introduce the estimator tool.

### Layout (Desktop)
```
┌─────────────────────────────────────────────────────────────┐
│  [Logo]                                      [Admin Login]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│              Get Your Project Budget Estimate              │
│              ─────────────────────────────────              │
│                                                             │
│     Professional interior design estimates in minutes       │
│                                                             │
│              [Start Your Estimate →]                        │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   💰 Fast   │  │ 📊 Complete │  │ 🎨 Custom   │        │
│  │ Get instant │  │ See budget  │  │ Tailored to │        │
│  │ estimates   │  │ to high-end │  │ your needs  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
│  How it works:                                              │
│  1️⃣ Tell us about your property                            │
│  2️⃣ Select your rooms and sizes                            │
│  3️⃣ Get estimates across all quality levels                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Mobile Layout
```
┌──────────────────────────────┐
│  [Logo]              [Menu]  │
├──────────────────────────────┤
│                              │
│  Get Your Project Budget     │
│  Estimate                    │
│  ─────────────────           │
│                              │
│  Professional interior       │
│  design estimates            │
│                              │
│  [Start Your Estimate →]     │
│                              │
│  ┌────────────────────────┐ │
│  │   💰 Fast              │ │
│  │   Get instant estimates│ │
│  └────────────────────────┘ │
│  ┌────────────────────────┐ │
│  │   📊 Accurate          │ │
│  │   Based on real prices │ │
│  └────────────────────────┘ │
│  ┌────────────────────────┐ │
│  │   🎨 Custom            │ │
│  │   Tailored to you      │ │
│  └────────────────────────┘ │
│                              │
└──────────────────────────────┘
```

### Components
- **Header**: Logo, navigation, admin link
- **Hero Section**: Headline, subheading, CTA button
- **Features**: 3-column grid (1-column mobile)
- **How It Works**: Numbered steps
- **Footer**: Copyright, contact info

### CTA Button Style
```css
.cta-button {
  background: var(--accent-600);
  color: white;
  padding: 1rem 2rem;
  border-radius: var(--radius-lg);
  font-size: 1.125rem;
  font-weight: 600;
  box-shadow: var(--shadow-md);
  transition: all 0.2s;
}

.cta-button:hover {
  background: var(--accent-700);
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}
```

---

## Screen 2: Property Input (Step 1/3)

### Purpose
Gather basic property information.

### Layout
```
┌─────────────────────────────────────────────────────────────┐
│  [Logo]                                      Step 1 of 3    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Progress: [████████░░░░░░░░] 33%                          │
│                                                             │
│  Tell us about your property                                │
│  ───────────────────────────                                │
│                                                             │
│  Square Footage *                                           │
│  ┌──────────────────────────────────────┐                  │
│  │ 3200                          sq ft  │                  │
│  └──────────────────────────────────────┘                  │
│  [────────●──────────] 500 - 10,000 sqft                   │
│                                                             │
│  Maximum Guest Capacity *                                   │
│  ┌──────────────────────────────────────┐                  │
│  │ 12                           guests  │                  │
│  └──────────────────────────────────────┘                  │
│  [────────●───────] 2 - 20 guests                          │
│                                                             │
│  Property Type (optional)                                   │
│  ┌──────────────────────────────────────┐                  │
│  │ Select type...               ▼       │                  │
│  └──────────────────────────────────────┘                  │
│  Options: Vacation Rental, Primary Residence, Commercial    │
│                                                             │
│  Additional Notes (optional)                                │
│  ┌──────────────────────────────────────┐                  │
│  │                                      │                  │
│  │                                      │                  │
│  └──────────────────────────────────────┘                  │
│                                                             │
│  [← Back]                         [Continue →]             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Mobile Layout
```
┌──────────────────────────────┐
│  [Logo]          Step 1 of 3 │
├──────────────────────────────┤
│  [████████░░░░] 33%          │
│                              │
│  Tell us about your property │
│  ───────────────────         │
│                              │
│  Square Footage *            │
│  ┌────────────────────────┐ │
│  │ 3200              sqft │ │
│  └────────────────────────┘ │
│  [──●────────]               │
│  500 - 10,000 sqft           │
│                              │
│  Max Guest Capacity *        │
│  ┌────────────────────────┐ │
│  │ 12             guests  │ │
│  └────────────────────────┘ │
│  [──●────]                   │
│  2 - 20 guests               │
│                              │
│  Property Type (optional)    │
│  ┌────────────────────────┐ │
│  │ Vacation Rental    ▼  │ │
│  └────────────────────────┘ │
│                              │
│  Additional Notes            │
│  ┌────────────────────────┐ │
│  │                        │ │
│  └────────────────────────┘ │
│                              │
│  [Continue →]                │
│  [← Back]                    │
│                              │
└──────────────────────────────┘
```

### Validation
- Square footage: Required, 500-10,000 range
- Guest capacity: Required, 2-20 range
- Property type: Optional dropdown
- Notes: Optional, max 500 characters

### Interactive Elements
- **Range sliders** with number inputs
- **Real-time validation** with error messages
- **Auto-save** to localStorage

---

## Screen 3: Room Configuration (Step 2/3)

### Purpose
Select rooms, sizes, and quantities.

### Layout
```
┌─────────────────────────────────────────────────────────────┐
│  [Logo]                                      Step 2 of 3    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Progress: [████████████████░░░░] 67%                       │
│                                                             │
│  Configure Your Rooms                                       │
│  ─────────────────────                                      │
│                                                             │
│  Based on your property specs, we suggest:                  │
│  [💡 Use Suggested Rooms] [✓ Customize]                    │
│                                                             │
│  Common Spaces                                              │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ ☑ Living Room                              [$16k-$109k]│ │
│  │   Size: [Small ▼] [Medium ▼] [●Large]  Qty: [1] [-][+]│ │
│  ├───────────────────────────────────────────────────────┤ │
│  │ ☑ Kitchen                                  [$14k-$67k] │ │
│  │   Size: [Small] [Medium] [●Large]  Qty: [1] [-][+]    │ │
│  ├───────────────────────────────────────────────────────┤ │
│  │ ☑ Dining Area                              [$13k-$152k]│ │
│  │   Size: [Small] [●Medium] [Large]  Qty: [1] [-][+]    │ │
│  ├───────────────────────────────────────────────────────┤ │
│  │ ☐ Rec Room                                 [$10k-$30k] │ │
│  │   Size: [Small] [Medium] [Large]  Qty: [1] [-][+]     │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  Sleeping Spaces                                            │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ ☑ Single Bedroom                            [$6k-$63k] │ │
│  │   Size: [Small] [●Medium] [Large]  Qty: [3] [-][+]    │ │
│  ├───────────────────────────────────────────────────────┤ │
│  │ ☑ Double Bedroom                           [$13k-$118k]│ │
│  │   Size: [Small] [Medium] [●Large]  Qty: [1] [-][+]    │ │
│  ├───────────────────────────────────────────────────────┤ │
│  │ ☑ Bunk Room                                 [$7k-$93k] │ │
│  │   Size: [●Small] [Medium] [Large]  Qty: [1] [-][+]    │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  [+ Add Custom Room]                                        │
│                                                             │
│  Running Total: $85,000 - $650,000                          │
│                                                             │
│  [← Back]                         [Continue →]             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Mobile Layout
```
┌──────────────────────────────┐
│  [Logo]          Step 2 of 3 │
├──────────────────────────────┤
│  [████████████░░] 67%        │
│                              │
│  Configure Your Rooms        │
│  ─────────────────           │
│                              │
│  💡 We suggest 7 rooms       │
│  [Use Suggested] [Customize] │
│                              │
│  Common Spaces               │
│  ┌────────────────────────┐ │
│  │ ☑ Living Room          │ │
│  │   Large  Qty: 1        │ │
│  │   $16k - $109k         │ │
│  │   [Details ▼]          │ │
│  └────────────────────────┘ │
│  ┌────────────────────────┐ │
│  │ ☑ Kitchen              │ │
│  │   Large  Qty: 1        │ │
│  │   $14k - $67k          │ │
│  │   [Details ▼]          │ │
│  └────────────────────────┘ │
│                              │
│  Sleeping Spaces             │
│  ┌────────────────────────┐ │
│  │ ☑ Single Bedroom       │ │
│  │   Medium  Qty: 3       │ │
│  │   $18k - $189k         │ │
│  │   [Details ▼]          │ │
│  └────────────────────────┘ │
│                              │
│  [+ Add Room]                │
│                              │
│  Running Total:              │
│  $85k - $650k                │
│                              │
│  [Continue →]                │
│  [← Back]                    │
│                              │
└──────────────────────────────┘
```

### Features
- **Checkbox** to enable/disable rooms
- **Size selector** (pill buttons: Small/Medium/Large)
- **Quantity controls** (+/- buttons)
- **Price range preview** per room
- **Running total** updates in real-time
- **Suggested configuration** based on property specs
- **Expandable details** on mobile

### Smart Suggestions Logic
```javascript
function suggestRooms(squareFootage, guestCapacity) {
  const suggestions = [];
  
  // Always include basics
  suggestions.push({
    type: 'living_room',
    size: squareFootage > 3000 ? 'large' : 'medium',
    quantity: 1
  });
  
  suggestions.push({
    type: 'kitchen',
    size: squareFootage > 3000 ? 'large' : 'medium',
    quantity: 1
  });
  
  // Dining based on capacity
  if (guestCapacity >= 8) {
    suggestions.push({
      type: 'dining_area',
      size: guestCapacity > 12 ? 'large' : 'medium',
      quantity: 1
    });
  }
  
  // Bedrooms based on capacity
  const bedroomCount = Math.ceil(guestCapacity / 2);
  suggestions.push({
    type: 'single_bedroom',
    size: 'medium',
    quantity: Math.min(bedroomCount, 4)
  });
  
  // Bunk room for larger properties
  if (guestCapacity > 10) {
    suggestions.push({
      type: 'bunk_room',
      size: 'medium',
      quantity: 1
    });
  }
  
  // Rec room for larger properties
  if (squareFootage > 2500) {
    suggestions.push({
      type: 'rec_room',
      size: 'medium',
      quantity: 1
    });
  }
  
  return suggestions;
}
```

---

## Screen 4: Results & Contact (Step 3/3)

### Purpose
Show estimate range across all quality tiers and capture contact info.

### Layout
```
┌─────────────────────────────────────────────────────────────┐
│  [Logo]                                      Step 3 of 3    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Progress: [████████████████████████████] 100%              │
│                                                             │
│  Your Project Estimate                                      │
│  ──────────────────────                                     │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  ESTIMATED BUDGET RANGE                               │  │
│  │  ═══════════════════════                              │  │
│  │                                                       │  │
│  │      $85,000 — $650,000                               │  │
│  │      ───────────────────                              │  │
│  │      Budget to High-End Quality                       │  │
│  │                                                       │  │
│  │  Based on 8 rooms, 3,200 sqft property                │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Quality Tier Breakdown                                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Budget Quality          $85,000                      │  │
│  │  Good value materials and furnishings                 │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  Mid-Range Quality       $180,000                     │  │
│  │  Balanced quality and investment                      │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  Mid/High Quality        $350,000                     │  │
│  │  Premium materials and designer pieces                │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  High-End Quality        $650,000                     │  │
│  │  Luxury, high-end designer furnishings               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  [View Detailed Breakdown by Room]  [Expand All Tiers]     │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Get Your Detailed Estimate                           │  │
│  │  ───────────────────────────                          │  │
│  │                                                       │  │
│  │  First Name *          Last Name *                    │  │
│  │  [John           ]     [Smith            ]            │  │
│  │                                                       │  │
│  │  Email Address *                                      │  │
│  │  [john.smith@email.com                    ]           │  │
│  │                                                       │  │
│  │  Phone Number (optional)                              │  │
│  │  [(555) 123-4567                          ]           │  │
│  │                                                       │  │
│  │  ☑ Email me a PDF of this estimate                    │  │
│  │  ☐ I'd like to schedule a consultation                │  │
│  │                                                       │  │
│  │  [Submit & Get Estimate →]                            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  [← Edit Configuration]                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Mobile Layout
```
┌──────────────────────────────┐
│  [Logo]          Step 3 of 3 │
├──────────────────────────────┤
│  [████████████████] 100%     │
│                              │
│  Your Project Estimate       │
│  ──────────────────          │
│                              │
│  ┌────────────────────────┐ │
│  │  ESTIMATED RANGE       │ │
│  │  ════════════          │ │
│  │                        │ │
│  │  $85k — $650k          │ │
│  │  Budget to High-End    │ │
│  │                        │ │
│  │  8 rooms, 3,200 sqft   │ │
│  └────────────────────────┘ │
│                              │
│  Quality Tiers               │
│  ┌────────────────────────┐ │
│  │ Budget                 │ │
│  │ $85,000                │ │
│  │ Good value materials   │ │
│  │ [View Details ▼]       │ │
│  └────────────────────────┘ │
│  ┌────────────────────────┐ │
│  │ Mid-Range              │ │
│  │ $180,000               │ │
│  │ Balanced quality       │ │
│  │ [View Details ▼]       │ │
│  └────────────────────────┘ │
│  ┌────────────────────────┐ │
│  │ Mid/High               │ │
│  │ $350,000               │ │
│  │ Premium materials      │ │
│  │ [View Details ▼]       │ │
│  └────────────────────────┘ │
│  ┌────────────────────────┐ │
│  │ High-End               │ │
│  │ $650,000               │ │
│  │ Luxury designer        │ │
│  │ [View Details ▼]       │ │
│  └────────────────────────┘ │
│                              │
│  [Room Breakdown]            │
│                              │
│  Get Your Estimate           │
│  ──────────────              │
│  ┌────────────────────────┐ │
│  │ First Name *           │ │
│  │ [John              ]   │ │
│  │                        │ │
│  │ Last Name *            │ │
│  │ [Smith             ]   │ │
│  │                        │ │
│  │ Email *                │ │
│  │ [john@email.com    ]   │ │
│  │                        │ │
│  │ Phone (optional)       │ │
│  │ [(555) 123-4567    ]   │ │
│  │                        │ │
│  │ ☑ Email me PDF         │ │
│  │ ☐ Schedule consult     │ │
│  │                        │ │
│  │ [Submit & Get →]       │ │
│  └────────────────────────┘ │
│                              │
│  [← Edit Configuration]      │
│                              │
└──────────────────────────────┘
```

### Features
- **Large, prominent range** at top (Budget to High-End)
- **All quality tiers shown** with descriptions
- **Expandable room breakdown** for each tier
- **Compare tiers** side-by-side (optional modal)
- **Clear value proposition** ("Get Your Detailed Estimate")
- **Minimal required fields** (just first name, last name, email)
- **Optional checkboxes** for preferences
- **Edit link** to go back and adjust

### Expandable Room Breakdown
When user clicks "View Details" for a tier:
```
Budget Tier — $85,000
├─ Living Room (Large) × 1     $16,615
├─ Kitchen (Large) × 1          $5,920
├─ Dining Area (Medium) × 1     $6,680
├─ Single Bedroom (Med) × 3    $18,300
├─ Double Bedroom (Large) × 1  $12,790
├─ Bunk Room (Small) × 1        $7,335
├─ Rec Room (Medium) × 1       $15,805
│
├─ Subtotal                    $83,445
├─ Contingency (10%)            $8,345
└─ Total                       $91,790
```

### After Submission
```
┌─────────────────────────────────────────┐
│          ✓ Success!                     │
│                                         │
│     Your estimate has been sent!        │
│                                         │
│  We've emailed your detailed estimate   │
│  to john.smith@email.com                │
│                                         │
│  Check your inbox in the next few       │
│  minutes. We'll be in touch soon!       │
│                                         │
│  [Download PDF Now]                     │
│  [Start Another Estimate]               │
│                                         │
└─────────────────────────────────────────┘
```

---

## Component Library

### Button Variants
```jsx
// Primary Button
<button className="btn-primary">
  Continue →
</button>

// Secondary Button  
<button className="btn-secondary">
  Cancel
</button>

// Ghost Button
<button className="btn-ghost">
  Learn More
</button>

// Icon Button
<button className="btn-icon">
  <PlusIcon />
</button>
```

### Input Fields
```jsx
// Text Input
<div className="input-group">
  <label>Square Footage *</label>
  <input type="number" placeholder="3200" />
</div>

// Dropdown
<div className="input-group">
  <label>Property Type</label>
  <select>
    <option>Select...</option>
    <option>Vacation Rental</option>
  </select>
</div>

// Range Slider
<div className="input-group">
  <label>Guest Capacity</label>
  <input type="range" min="2" max="20" />
  <span className="range-value">12 guests</span>
</div>
```

### Cards
```jsx
// Room Card
<div className="room-card">
  <div className="room-card-header">
    <input type="checkbox" checked />
    <span>Living Room</span>
    <span className="room-price">$16k-$109k</span>
  </div>
  <div className="room-card-body">
    <div className="size-selector">
      <button>Small</button>
      <button className="active">Medium</button>
      <button>Large</button>
    </div>
    <div className="quantity-controls">
      <button>-</button>
      <span>1</span>
      <button>+</button>
    </div>
  </div>
</div>
```

### Progress Bar
```jsx
<div className="progress-bar">
  <div className="progress-fill" style={{width: '75%'}}></div>
</div>
<div className="progress-label">Step 3 of 4</div>
```

---

## Loading & Error States

### Loading State
```
┌──────────────────────┐
│                      │
│   ⏳ Calculating...  │
│                      │
│   Please wait while  │
│   we prepare your    │
│   estimate           │
│                      │
└──────────────────────┘
```

### Error State
```
┌──────────────────────┐
│   ⚠️ Oops!           │
│                      │
│   Something went     │
│   wrong.             │
│                      │
│   [Try Again]        │
└──────────────────────┘
```

### Empty State
```
┌──────────────────────┐
│   📋 No rooms        │
│   selected yet       │
│                      │
│   Select at least    │
│   one room to see    │
│   your estimate      │
└──────────────────────┘
```

---

## Animations & Transitions

### Page Transitions
```css
.page-enter {
  opacity: 0;
  transform: translateX(20px);
}

.page-enter-active {
  opacity: 1;
  transform: translateX(0);
  transition: all 300ms ease-out;
}
```

### Card Hover
```css
.card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
  transition: all 200ms ease-out;
}
```

### Number Counter Animation
```jsx
// Animate total from 0 to final value
<CountUp
  end={350000}
  duration={1.5}
  prefix="$"
  separator=","
/>
```

---

## Accessibility

### ARIA Labels
```jsx
<button aria-label="Increase quantity">+</button>
<input aria-required="true" aria-label="Square footage" />
<div role="progressbar" aria-valuenow="75" aria-valuemin="0" aria-valuemax="100" />
```

### Keyboard Navigation
- Tab through all interactive elements
- Enter/Space to activate buttons
- Arrow keys for quantity controls
- Escape to close modals

### Screen Reader Support
- Semantic HTML (header, nav, main, section)
- Proper heading hierarchy (h1 → h2 → h3)
- Form labels associated with inputs
- Alt text for all images

---

## Performance Optimizations

### Code Splitting
```javascript
// Lazy load admin panel
const AdminPanel = lazy(() => import('./pages/Admin'));

// Lazy load PDF generator
const PDFGenerator = lazy(() => import('./utils/pdfGenerator'));
```

### Image Optimization
```jsx
<img
  src="/images/logo.svg"
  loading="lazy"
  width="120"
  height="40"
  alt="1584 Interior Design"
/>
```

### Data Fetching
```javascript
// Cache room templates in memory
const roomTemplatesCache = new Map();

// Debounce live calculations
const debouncedCalculate = debounce(calculateEstimate, 300);
```

---

## Testing Checklist

### Cross-Browser
- [ ] Chrome (latest)
- [ ] Safari (latest)
- [ ] Firefox (latest)
- [ ] Edge (latest)

### Devices
- [ ] iPhone (Safari)
- [ ] Android (Chrome)
- [ ] iPad (Safari)
- [ ] Desktop (1920×1080)
- [ ] Laptop (1440×900)

### User Flows
- [ ] Complete estimate from start to finish
- [ ] Edit configuration and resubmit
- [ ] Try all room configurations
- [ ] Test all quality tiers
- [ ] Verify PDF generation
- [ ] Check email delivery

---

## Summary

**Total Screens:** 5 main screens + admin panel  
**Mobile-First:** All designs responsive  
**Accessibility:** WCAG 2.1 AA compliant  
**Performance:** < 3s initial load, < 1s interactions  

**Next Steps:**
1. Review and approve UI specifications
2. Gather brand assets (logo, colors)
3. Create high-fidelity mockups (optional)
4. Begin component development
5. Implement responsive layouts

---

**Last Updated:** October 13, 2025  
**Version:** 1.0  
**Status:** Ready for Development

