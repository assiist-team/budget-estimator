# Admin Pricing Management Interface

## Overview
A simple, secure interface for 1584 team members to update item pricing and room configurations without needing to edit CSV files or database directly.

---

## Access & Security

### Who Can Access:
- Password-protected admin route: `/admin`
- Firebase Authentication required
- Specific email whitelist (your team only)

### Implementation:
```javascript
// In Firebase
const ADMIN_EMAILS = [
  'benjamin@1584design.com',
  'team@1584design.com',
  // Add team members
];

function isAdmin(userEmail) {
  return ADMIN_EMAILS.includes(userEmail);
}
```

---

## Interface Layout

### Main Admin Dashboard

```
┌─────────────────────────────────────────────────────┐
│  1584 Interior Design - Admin Panel                │
│  Logged in as: benjamin@1584design.com     [Logout] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  📊 Dashboard        🏷️ Pricing        📋 Estimates │
│                                                     │
│  Quick Stats:                                       │
│  • 47 Total Items in Database                      │
│  • 8 Room Templates                                │
│  • 23 Estimates This Month                         │
│  • Last Price Update: Oct 10, 2025                 │
│                                                     │
│  Recent Activity:                                   │
│  • King Bed Frame updated (Oct 12)                 │
│  • New estimate from client@example.com (Oct 13)   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 1. PRICING MANAGER TAB

### Master Item Pricing View

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Master Item Pricing                                  [+ Add New Item]  │
├─────────────────────────────────────────────────────────────────────────┤
│  🔍 Search items...                    Filter: [All Categories ▼]       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Category: Bedroom Furniture                                            │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ King Bed Frame                                        [Edit] [Del]│  │
│  │ Budget: $500    Mid: $1,500    Mid/High: $3,000    High: $8,000  │  │
│  │ Last updated: Oct 12, 2025 by benjamin@1584design.com            │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Mattress                                              [Edit] [Del]│  │
│  │ Budget: $1,300  Mid: $2,800    Mid/High: $5,000    High: $12,000 │  │
│  │ Last updated: Aug 15, 2025 by team@1584design.com                │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  Category: Decorative Items                                             │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Throw Pillows                                         [Edit] [Del]│  │
│  │ Budget: $35     Mid: $80       Mid/High: $125      High: $300    │  │
│  │ Last updated: Sep 1, 2025 by benjamin@1584design.com             │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Edit Item Modal

```
┌────────────────────────────────────────────┐
│  Edit Item: King Bed Frame       [×]      │
├────────────────────────────────────────────┤
│                                            │
│  Item Name:                                │
│  [King Bed Frame                        ]  │
│                                            │
│  Category:                                 │
│  [Bedroom Furniture              ▼]       │
│                                            │
│  Pricing Tiers:                            │
│  Budget:      $[500.00          ]          │
│  Mid-Range:   $[1,500.00        ]          │
│  Mid/High:    $[3,000.00        ]          │
│  High-End:    $[8,000.00        ]          │
│                                            │
│  Notes (optional):                         │
│  [                                      ]  │
│  [                                      ]  │
│                                            │
│  ⚠️  This will update pricing for all      │
│     future estimates. Active estimates     │
│     will show original pricing.            │
│                                            │
│           [Cancel]  [Save Changes]         │
└────────────────────────────────────────────┘
```

### Bulk Update Feature

```
┌────────────────────────────────────────────────────┐
│  Bulk Price Adjustment                    [×]     │
├────────────────────────────────────────────────────┤
│                                                    │
│  Apply to: [All Items          ▼]                 │
│            Options: All Items, Selected Category,  │
│                     Selected Items                 │
│                                                    │
│  Adjustment Type:                                  │
│  ○ Percentage    ● Fixed Amount                    │
│                                                    │
│  Which Tiers:                                      │
│  ☑ Budget  ☑ Mid-Range  ☑ Mid/High  ☑ High-End   │
│                                                    │
│  Adjustment:                                       │
│  [○ Increase  ● Decrease]  by  [10] %             │
│                                                    │
│  Preview:                                          │
│  • King Bed Frame (Budget): $500 → $450           │
│  • Mattress (Budget): $1,300 → $1,170             │
│  • ... (23 more items)                            │
│                                                    │
│  Reason for adjustment (optional):                 │
│  [Seasonal discount - Fall 2025             ]     │
│                                                    │
│           [Cancel]  [Apply to X Items]             │
└────────────────────────────────────────────────────┘
```

---

## 2. ROOM TEMPLATES TAB

### Room Template Manager

```
┌─────────────────────────────────────────────────────────────────┐
│  Room Templates                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Living Room                                           [Edit]   │
│  ┌────────────────────────────────────────────────────────────┐│
│  │  Small Room (Budget: $8,285 - High: $58,840)              ││
│  │  • Sofa/Sectional (qty: 1)                                ││
│  │  • Accent Chairs (qty: 2)                                 ││
│  │  • Coffee Table (qty: 1)                                  ││
│  │  ... 15 more items                    [View Full Details] ││
│  │                                                            ││
│  │  Medium Room (Budget: $11,215 - High: $75,880)            ││
│  │  • Sofa/Sectional (qty: 1)                                ││
│  │  • Accent Chairs (qty: 3)                                 ││
│  │  ... 18 items                         [View Full Details] ││
│  │                                                            ││
│  │  Large Room (Budget: $16,615 - High: $109,220)            ││
│  │  ... 21 items                         [View Full Details] ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Kitchen                                                [Edit]  │
│  ┌────────────────────────────────────────────────────────────┐│
│  │  Small Room (Budget: $1,480 - High: $18,460)              ││
│  │  • Bar Stools (qty: 4)                                    ││
│  │  ... 6 items                          [View Full Details] ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Edit Room Template Modal

```
┌──────────────────────────────────────────────────────────────┐
│  Edit Room Template: Living Room - Medium Size      [×]     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Items in this room:                    [+ Add Item]        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Sofa/Sectional              Qty: [1] [△][▽]  [Remove] │ │
│  │ Current prices: $4,000 (Mid) - $15,000 (High)         │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Accent Chairs               Qty: [3] [△][▽]  [Remove] │ │
│  │ Current prices: $1,600 (Mid) - $5,000 (High)          │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ... (scroll for 16 more items)                             │
│                                                              │
│  Estimated Totals:                                          │
│  Budget: $11,215  |  Mid: $22,030  |  High: $75,880        │
│                                                              │
│            [Cancel]  [Save Template]                         │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. ESTIMATES VIEWER TAB

### All Estimates List

```
┌────────────────────────────────────────────────────────────────────────┐
│  Client Estimates                                                      │
├────────────────────────────────────────────────────────────────────────┤
│  Filter: [All ▼]  Date: [Last 30 Days ▼]  Sort: [Most Recent ▼]      │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Oct 13, 2025 - 2:30 PM                                                │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │ john.smith@email.com                                    [View]   │ │
│  │ John Smith • (555) 123-4567                                      │ │
│  │                                                                  │ │
│  │ Estimate: $45,000 - $125,000 (Mid/High tier)                    │ │
│  │ Property: 3,200 sqft, 12 guests                                 │ │
│  │ Rooms: Living (Lg), Kitchen (Lg), 3× Bedroom, Bunk Room        │ │
│  │                                                                  │ │
│  │ Status: Sent • Views: 3 • Last viewed: Oct 13, 4:15 PM         │ │
│  │ [📧 Email] [📄 Download PDF] [✓ Mark Contacted] [🗑 Archive]   │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  Oct 12, 2025 - 10:45 AM                                               │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │ sarah.jones@email.com                                   [View]   │ │
│  │ Sarah Jones • No phone provided                                 │ │
│  │                                                                  │ │
│  │ Estimate: $22,000 - $48,000 (Budget tier)                       │ │
│  │ Property: 1,800 sqft, 6 guests                                  │ │
│  │ Rooms: Living (Med), Kitchen (Sm), Dining, 2× Bedroom          │ │
│  │                                                                  │ │
│  │ Status: Contacted ✓ • Views: 1 • Last viewed: Oct 12, 11:02 AM │ │
│  │ [📧 Email] [📄 Download PDF] [Note: "Called, left voicemail"]  │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. SETTINGS TAB

### Admin Settings

```
┌────────────────────────────────────────────────┐
│  Admin Settings                                │
├────────────────────────────────────────────────┤
│                                                │
│  Authorized Admin Users:                       │
│  • benjamin@1584design.com (Owner)             │
│  • team@1584design.com                         │
│  [+ Add Admin User]                            │
│                                                │
│  Email Notifications:                          │
│  ☑ New estimate submitted                      │
│  ☑ Client views estimate                       │
│  ☐ Weekly summary report                       │
│                                                │
│  Send notifications to:                        │
│  [benjamin@1584design.com              ]       │
│                                                │
│  Default Settings:                             │
│  Contingency Buffer: [10] %                    │
│  Estimate Expiration: [30] days                │
│                                                │
│  Data Management:                              │
│  [📥 Export All Data (CSV)]                    │
│  [📊 Download Database Backup]                 │
│  [🔄 Import Price Updates]                     │
│                                                │
│  Danger Zone:                                  │
│  [🗑 Clear Old Estimates (>90 days)]           │
│  [⚠️ Reset All Prices (Requires Backup)]       │
│                                                │
└────────────────────────────────────────────────┘
```

---

## Key Features

### 1. Real-Time Updates
- Changes to pricing immediately reflected in new estimates
- Existing saved estimates maintain their original pricing (locked)
- Clear audit trail of who changed what and when

### 2. Smart Validation
```javascript
// Before saving price changes
- Ensure all four tiers are filled
- Warn if prices decrease (potential error)
- Require confirmation for >20% price changes
- Prevent accidental $0 or negative prices
```

### 3. Price History
```
View Price History: King Bed Frame

Oct 12, 2025 - benjamin@1584design.com
  Budget: $450 → $500 (+$50)
  Reason: "Supplier price increase"

Aug 5, 2025 - team@1584design.com  
  High: $7,500 → $8,000 (+$500)
  Reason: "Market adjustment for luxury tier"

Jun 1, 2025 - benjamin@1584design.com
  Initial pricing set
```

### 4. CSV Import/Export
- Export current pricing to CSV for external review
- Bulk import pricing updates from spreadsheet
- Validate before applying changes
- Preview changes before committing

### 5. Mobile Responsive
- All admin features work on tablet/phone
- Quick edits on the go
- View estimates from anywhere

---

## Implementation Complexity

### Phase 1 (Essential - Week 3):
✅ **Must Have:**
- View all items with current pricing
- Edit individual item prices
- View estimate submissions
- Basic authentication

### Phase 2 (Enhanced - Week 4):
✅ **Should Have:**
- Edit room templates
- Bulk price updates
- Export to CSV
- Email notifications

### Phase 3 (Advanced - Later):
⏰ **Nice to Have:**
- Price history tracking
- Automated backups
- Advanced analytics
- Bulk CSV import

---

## Security Considerations

### Access Control:
```javascript
// Firebase Security Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Only admins can read/write items and room templates
    match /items/{itemId} {
      allow read: if true;  // Public can read for estimates
      allow write: if isAdmin();
    }
    
    match /roomTemplates/{templateId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    // Admins can see all estimates
    match /estimates/{estimateId} {
      allow read: if isAdmin();
      allow create: if true;  // Anyone can create
      allow update, delete: if isAdmin();
    }
  }
}

function isAdmin() {
  return request.auth != null && 
         request.auth.token.email in [
           'benjamin@1584design.com',
           'team@1584design.com'
         ];
}
```

### Change Logging:
Every price change is logged:
```javascript
{
  itemId: "king_bed_frame",
  field: "highPrice",
  oldValue: 7500,
  newValue: 8000,
  changedBy: "benjamin@1584design.com",
  changedAt: timestamp,
  reason: "Supplier price increase"
}
```

---

## Benefits of This Approach

✅ **No technical skills required** - team members can update prices  
✅ **Audit trail** - know who changed what and when  
✅ **Safe** - validation prevents accidental errors  
✅ **Fast** - update prices in seconds, not minutes  
✅ **Flexible** - bulk updates or individual changes  
✅ **Accessible** - works on any device  
✅ **Professional** - clean, branded interface  

---

## Alternative: Spreadsheet Sync (Optional)

If your team prefers working in Google Sheets:

### Option: Google Sheets Integration
1. Maintain pricing in a Google Sheet
2. One-click "Sync Prices" button in admin panel
3. Pulls latest pricing from authorized Google Sheet
4. Preview changes before applying
5. Maintains same validation and history

**Pros:** Team can use familiar spreadsheet interface  
**Cons:** More complex integration, potential sync issues

---

## Next Steps

1. ✅ Approve this admin interface design
2. Build authentication system
3. Create admin dashboard (Phase 1 features)
4. Add enhanced features (Phase 2)
5. Train team on using the interface

Would you like me to proceed with this design, or would you prefer modifications?

