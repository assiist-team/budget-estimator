# HighLevel CRM Integration Strategy

## Overview
Integration plan for connecting the Project Estimator tool with HighLevel CRM for lead capture, follow-up automation, and client management.

---

## Phased Approach (RECOMMENDED)

### ✅ Phase 1: Build Core Tool (Weeks 1-2)
**No CRM integration - Focus on functionality**

```
Client Experience:
1. Land on estimator tool
2. Build estimate (all in browser, no login)
3. See results
4. Enter email to receive PDF
5. Done - simple contact form submission

Your Experience:
- Estimates saved to Firebase
- Email notifications when someone submits
- Basic list view in admin panel
```

**Why Start Here:**
- ✅ Fastest to build and test
- ✅ Validate the core tool works
- ✅ Get feedback from real users
- ✅ No CRM setup complexity during development
- ✅ Can manually copy leads to HighLevel if needed

---

### 🚀 Phase 2: Add HighLevel Integration (Week 3-4)
**Automatic lead sync to your CRM**

```
Enhanced Flow:
1. Client submits estimate
2. Lead automatically created in HighLevel
3. HighLevel triggers your follow-up automation
4. You see full lead details + estimate in HighLevel
5. HighLevel tracks engagement (emails opened, etc.)
```

---

## HighLevel Integration Architecture

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT SIDE                              │
│  [React App] → Build Estimate → Submit Contact Info        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                 FIREBASE CLOUD FUNCTION                     │
│  • Save to Firestore                                        │
│  • Generate PDF                                             │
│  • Email client                                             │
│  • ──→ Send to HighLevel API ─────┐                        │
└────────────────────────────────────┼─────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   HIGHLEVEL CRM                             │
│  • Create/Update Contact                                    │
│  • Add to "Estimator Leads" pipeline                        │
│  • Trigger automation workflow                              │
│  • Store estimate details in custom fields                  │
│  • Start follow-up sequence                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## HighLevel API Integration

### What Gets Sent to HighLevel:

```javascript
// When client submits estimate
POST https://rest.gohighlevel.com/v1/contacts/

{
  "email": "client@example.com",
  "firstName": "John",
  "lastName": "Smith",
  "phone": "(555) 123-4567",
  "source": "Project Estimator Tool",
  "tags": ["estimator-lead", "oct-2025"],
  
  // Custom fields (configure in HighLevel first)
  "customField": {
    "estimate_id": "est_abc123",
    "estimate_total_low": "$45,000",
    "estimate_total_high": "$125,000",
    "quality_tier": "Mid/High",
    "property_sqft": "3200",
    "guest_capacity": "12",
    "room_count": "7",
    "submission_date": "2025-10-13",
    "estimate_url": "https://estimator.1584design.com/view/est_abc123"
  },
  
  // Add to pipeline
  "pipelineId": "YOUR_PIPELINE_ID",
  "pipelineStageId": "NEW_LEAD_STAGE_ID"
}
```

### What You'll See in HighLevel:

```
Contact: John Smith
Email: client@example.com
Phone: (555) 123-4567
Source: Project Estimator Tool
Tags: estimator-lead, oct-2025

Custom Fields:
├─ Estimate Total Range: $45,000 - $125,000
├─ Quality Tier: Mid/High
├─ Property: 3,200 sqft, 12 guests
├─ Rooms: 7 total
└─ Estimate Link: [View Full Estimate]

Pipeline: Estimator Leads
Stage: New Lead → Follow Up → Proposal Sent → Closed

Last Activity: Submitted estimate on Oct 13, 2025
```

---

## HighLevel Automation Workflows

### Example Workflow: New Estimator Lead

```
TRIGGER: Contact tagged with "estimator-lead"
├─ WAIT: 5 minutes
├─ ACTION: Send SMS
│   "Hi {{firstName}}! Thanks for using our estimator. 
│    I'm reviewing your project details now. 
│    Any questions? Just reply here! - 1584 Design"
│
├─ WAIT: 2 hours
├─ ACTION: Send Email
│   Subject: "About Your {{property_sqft}} sqft Project"
│   Body: Personalized email with estimate recap
│
├─ WAIT: 2 days
├─ CONDITION: If not responded
│   ├─ ACTION: Send Follow-up Email
│   │   "Still interested in moving forward?"
│   └─ ACTION: Create Task for team
│       "Call {{firstName}} about estimate"
│
└─ WAIT: 7 days
    └─ CONDITION: If still no response
        └─ ACTION: Move to "Cold Lead" pipeline stage
```

---

## HighLevel Form Integration Options

### Option A: Standalone Estimator (Phase 1)
**Current plan - build independent tool first**

```
Your Site/Marketing:
- HighLevel forms for general contact
- HighLevel landing pages
- HighLevel calendars for bookings

Estimator Tool:
- Separate app (estimator.1584design.com)
- Submits leads back to HighLevel via API
- Can be embedded or linked from your site
```

**Pros:**
- ✅ Full control over estimator UX
- ✅ Fast, custom-built experience
- ✅ Easy to iterate and improve
- ✅ Works independently of HighLevel

**Cons:**
- ⚠️ Separate tool to maintain
- ⚠️ Requires API integration

---

### Option B: Embedded in HighLevel Pages (Future)
**Could migrate later if desired**

```
HighLevel Funnel:
1. Landing Page (built in HighLevel)
2. → Embedded Estimator (iframe)
3. → Results page captures lead
4. → HighLevel form or webhook submission
```

**Pros:**
- ✅ All in one ecosystem
- ✅ HighLevel tracks full journey

**Cons:**
- ⚠️ Less flexible UX
- ⚠️ Iframe limitations
- ⚠️ Harder to build complex calculator

---

## HighLevel Custom Fields Setup

### Required Custom Fields in HighLevel:

Create these custom fields for contacts:

```
Field Name                  Type        Description
─────────────────────────────────────────────────────────────
estimate_id                 Text        Unique estimate ID
estimate_total_low          Currency    Low-end budget estimate
estimate_total_high         Currency    High-end budget estimate  
quality_tier                Dropdown    Budget/Mid/Mid-High/High
property_sqft               Number      Square footage
guest_capacity              Number      Max guests
property_type               Dropdown    Vacation/Primary/Commercial
room_count                  Number      Total rooms selected
rooms_selected              Text        Comma-separated room list
submission_date             Date        When estimate submitted
estimate_url                URL         Link to view full estimate
estimate_status             Dropdown    Draft/Sent/Viewed/Contacted
last_viewed_date            Date        Last time they viewed estimate
view_count                  Number      Times they've viewed it
```

---

## Implementation Details

### Firebase Cloud Function (Phase 2)

```javascript
// functions/src/sendToHighLevel.js

const functions = require('firebase-functions');
const axios = require('axios');

exports.onEstimateSubmit = functions.firestore
  .document('estimates/{estimateId}')
  .onCreate(async (snap, context) => {
    const estimate = snap.data();
    const estimateId = context.params.estimateId;
    
    // Prepare HighLevel API request
    const highlevelData = {
      email: estimate.email,
      firstName: estimate.firstName,
      lastName: estimate.lastName,
      phone: estimate.phone,
      source: 'Project Estimator Tool',
      tags: ['estimator-lead', getMonthTag()],
      customField: {
        estimate_id: estimateId,
        estimate_total_low: estimate.budgetRange.low,
        estimate_total_high: estimate.budgetRange.high,
        quality_tier: estimate.qualityTier,
        property_sqft: estimate.propertySpecs.squareFootage,
        guest_capacity: estimate.propertySpecs.guestCapacity,
        room_count: estimate.rooms.length,
        rooms_selected: getRoomsList(estimate.rooms),
        submission_date: new Date().toISOString(),
        estimate_url: `https://estimator.1584design.com/view/${estimateId}`,
        estimate_status: 'Sent'
      }
    };
    
    try {
      // Send to HighLevel
      const response = await axios.post(
        'https://rest.gohighlevel.com/v1/contacts/',
        highlevelData,
        {
          headers: {
            'Authorization': `Bearer ${functions.config().highlevel.api_key}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Update estimate with HighLevel contact ID
      await snap.ref.update({
        highlevelContactId: response.data.contact.id,
        syncedToHighLevel: true,
        syncedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log('Successfully synced to HighLevel:', estimateId);
    } catch (error) {
      console.error('Error syncing to HighLevel:', error);
      // Don't fail the estimate submission if HighLevel sync fails
      // Log error for manual follow-up
    }
  });
```

---

## Two-Way Sync (Optional - Phase 3)

### Sync Status Updates Back to Estimator

When you update a lead in HighLevel, sync status back:

```
HighLevel Status        →    Estimator Tool
─────────────────────────────────────────────
"Proposal Sent"         →    Show "Proposal sent" badge
"Meeting Scheduled"     →    Show scheduled date
"Project Started"       →    Mark as "Active Project"
"Closed Won"            →    Celebrate! 🎉
"Closed Lost"           →    Archive estimate
```

**Implementation:**
- HighLevel webhook → Firebase Function
- Update estimate status in Firestore
- Client can see status when they view estimate

---

## HighLevel Webhooks Setup

### Webhooks to Listen For:

```javascript
// In HighLevel, configure webhooks for:

1. Contact Updated
   → Update estimate status in Firebase
   
2. Pipeline Stage Changed
   → Trigger email to client if needed
   
3. Task Completed
   → Log activity in Firebase
   
4. Appointment Scheduled
   → Send calendar invite through estimator
```

---

## Benefits of This Integration

### For You:
✅ **Automatic lead capture** - no manual entry  
✅ **Full CRM history** - see all client interactions  
✅ **Automated follow-up** - HighLevel sequences  
✅ **Pipeline tracking** - where each lead is  
✅ **Analytics** - conversion rates, lead sources  
✅ **Team collaboration** - assign leads, tasks  

### For Clients:
✅ **Fast response** - automated initial contact  
✅ **Personalized follow-up** - based on their estimate  
✅ **Easy scheduling** - HighLevel calendar links  
✅ **Status updates** - know where their project stands  

---

## Cost Considerations

### HighLevel API:
- **Included** in HighLevel subscription
- No per-API-call fees
- Rate limits: 60 requests/minute (plenty for this use case)

### Firebase Functions:
- Free tier: 2M invocations/month
- Estimate submissions likely < 1,000/month
- Well within free tier

### Development Time:
- Phase 1 (No integration): Weeks 1-2
- Phase 2 (HighLevel sync): +3-5 days
- Phase 3 (Two-way sync): +2-3 days (optional)

---

## Recommended Phase 1 Approach

### Build Tool With Integration In Mind

**What to build now:**
```javascript
// Structure data in a HighLevel-friendly format
const estimateData = {
  // Standard fields
  email: '',
  firstName: '',
  lastName: '',
  phone: '',
  
  // Estimate details (ready for HighLevel custom fields)
  propertySpecs: {
    squareFootage: 0,
    guestCapacity: 0,
    propertyType: ''
  },
  
  // Calculate ranges
  budgetRange: {
    low: 0,
    high: 0
  },
  
  qualityTier: '',
  rooms: []
};
```

**What to skip for now:**
- HighLevel API calls
- Webhook endpoints
- Two-way sync
- Custom authentication (use simple email form)

**Make it easy to add later:**
```javascript
// Create a placeholder function
async function syncToHighLevel(estimateData) {
  // TODO: Implement in Phase 2
  console.log('Would sync to HighLevel:', estimateData);
  return { success: true };
}

// Call it (currently does nothing)
await syncToHighLevel(estimate);
```

---

## Testing Strategy

### Phase 1 Testing:
```
✓ Build and test estimator tool
✓ Verify calculations are accurate
✓ Test on mobile devices
✓ Ensure PDFs generate correctly
✓ Manual follow-up with leads
```

### Phase 2 Testing (HighLevel Integration):
```
1. Create HighLevel test account/sandbox
2. Set up custom fields
3. Test API connection
4. Submit test estimate
5. Verify lead appears in HighLevel
6. Test automation workflows
7. Go live with real integration
```

---

## HighLevel Setup Checklist (Phase 2)

When you're ready to integrate:

- [ ] Get HighLevel API key (Settings → API)
- [ ] Create custom fields in HighLevel
- [ ] Create "Estimator Leads" pipeline
- [ ] Set up pipeline stages (New Lead → Follow Up → etc.)
- [ ] Create automation workflows
- [ ] Set up email templates
- [ ] Create SMS templates (if using)
- [ ] Test API connection
- [ ] Test with sample lead
- [ ] Verify automation triggers
- [ ] Go live!

---

## Alternative: Zapier Integration (Easier Start)

If you want integration sooner without custom code:

### Use Zapier as Bridge:
```
Estimator Tool (Webhook)
    ↓
Zapier (middleware)
    ↓
HighLevel (Create Contact)
```

**Pros:**
- ✅ No code required for integration
- ✅ Visual workflow builder
- ✅ Can add other apps (Slack notifications, etc.)
- ✅ Quick to set up

**Cons:**
- ⚠️ Monthly Zapier cost (~$20-30)
- ⚠️ Extra step in the chain
- ⚠️ Less customization

**Later:** Replace with direct API integration

---

## My Recommendation

### Phase 1 (NOW - Weeks 1-2):
```
Build core estimator tool:
✓ Property input form
✓ Room configuration
✓ Budget calculation
✓ Results display
✓ Simple email capture (no CRM)
✓ PDF generation
✓ Basic admin panel

Manual Process:
- Get email notifications
- Manually add to HighLevel if desired
- Test tool with real users
- Validate calculations
```

### Phase 2 (NEXT - Week 3):
```
Add HighLevel integration:
✓ Set up custom fields
✓ Configure API connection
✓ Automatic lead sync
✓ Basic automation workflows

Result:
- Automatic lead capture
- Immediate follow-up
- Full CRM tracking
```

### Phase 3 (LATER - Week 4+):
```
Enhanced integration:
✓ Two-way sync
✓ Status updates
✓ Advanced automations
✓ Analytics dashboard
```

---

## Next Steps

1. ✅ Agree on phased approach
2. Build Phase 1 (core tool without CRM)
3. Test with real users
4. Gather feedback
5. Then layer in HighLevel integration

**This approach means:**
- You can start using the tool in 2 weeks
- No dependency on CRM setup for initial testing
- Integration adds value without complexity
- Can launch even if HighLevel integration takes longer

Sound good? Ready to start building Phase 1?

