# Project Information

## Project Identifiers

**Project Name:** 1584 Interior Design Project Estimator  
**Project ID:** `project-estimator-1584`  
**Company:** 1584 Interior Design  
**Project Type:** Web Application (React + Firebase)

---

## Repository & Hosting

### Firebase Project
```
Project ID: project-estimator-1584
Region: us-central1 (recommended)
```

### URLs (Production)
```
Web App: https://estimator.1584design.com
Admin Panel: https://estimator.1584design.com/admin
Firebase Hosting: https://project-estimator-1584.web.app
Firebase Console: https://console.firebase.google.com/project/project-estimator-1584
```

### URLs (Development)
```
Local: http://localhost:5173
Preview: https://project-estimator-1584--preview.web.app
```

---

## Technology Stack

### Frontend
```
Framework: React 18+
Language: JavaScript (can upgrade to TypeScript later)
Build Tool: Vite
CSS Framework: TailwindCSS
UI Components: shadcn/ui
Charts: Recharts
Animation: Framer Motion (optional)
PDF Generation: jsPDF or react-pdf
```

### Backend
```
Database: Firebase Firestore
Hosting: Firebase Hosting
Functions: Firebase Cloud Functions (Node.js)
Authentication: Firebase Auth (Phase 2+)
Storage: Firebase Storage (for PDFs, optional)
```

### External Services
```
Email: SendGrid or Firebase Email Extension
CRM: HighLevel (Phase 3)
Analytics: Google Analytics 4 (optional)
```

---

## Project Structure

```
project-estimator-1584/
├── public/
│   ├── favicon.ico
│   ├── logo.svg
│   └── images/
│
├── src/
│   ├── components/
│   │   ├── PropertyInput.jsx
│   │   ├── RoomConfigurator.jsx
│   │   ├── QualitySelector.jsx
│   │   ├── EstimateResults.jsx
│   │   ├── ContactForm.jsx
│   │   └── admin/
│   │       ├── Dashboard.jsx
│   │       ├── PricingManager.jsx
│   │       └── EstimatesList.jsx
│   │
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── Estimator.jsx
│   │   ├── Results.jsx
│   │   └── Admin.jsx
│   │
│   ├── hooks/
│   │   ├── useEstimateCalculator.js
│   │   ├── useFirestore.js
│   │   └── useRoomData.js
│   │
│   ├── utils/
│   │   ├── calculations.js
│   │   ├── pdfGenerator.js
│   │   └── formatters.js
│   │
│   ├── lib/
│   │   └── firebase.js
│   │
│   ├── styles/
│   │   └── globals.css
│   │
│   ├── App.jsx
│   └── main.jsx
│
├── functions/
│   ├── src/
│   │   ├── index.js
│   │   ├── emailEstimate.js
│   │   ├── syncToHighLevel.js (Phase 3)
│   │   └── generatePDF.js
│   │
│   └── package.json
│
├── scripts/
│   ├── importData.js (CSV → Firestore)
│   └── seedDatabase.js
│
├── planning_docs/
│   ├── 01_MASTER_PLAN.md
│   ├── 02_AUTHENTICATION_OPTIONS.md
│   ├── 03_ADMIN_PRICING_INTERFACE.md
│   ├── 04_HIGHLEVEL_INTEGRATION_STRATEGY.md
│   ├── 05_PROJECT_INFO.md (this file)
│   ├── 06_DATA_MODEL.md
│   └── 07_UI_SPECIFICATIONS.md
│
├── initial_dataset/
│   └── (CSV files)
│
├── .env.local
├── .gitignore
├── package.json
├── vite.config.js
├── tailwind.config.js
├── firebase.json
├── .firebaserc
└── README.md
```

---

## Environment Variables

### `.env.local` (Development)
```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=project-estimator-1584.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=project-estimator-1584
VITE_FIREBASE_STORAGE_BUCKET=project-estimator-1584.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# SendGrid (for emails)
VITE_SENDGRID_API_KEY=your_sendgrid_key

# Admin Emails (comma-separated)
VITE_ADMIN_EMAILS=benjamin@1584design.com,team@1584design.com

# HighLevel (Phase 3)
VITE_HIGHLEVEL_API_KEY=your_highlevel_key
VITE_HIGHLEVEL_LOCATION_ID=your_location_id
```

### Firebase Functions Config (Phase 3)
```bash
firebase functions:config:set \
  sendgrid.api_key="YOUR_KEY" \
  highlevel.api_key="YOUR_KEY" \
  highlevel.location_id="YOUR_ID" \
  admin.emails="benjamin@1584design.com,team@1584design.com"
```

---

## Firebase Collections

Quick reference (see `06_DATA_MODEL.md` for full details):

```
/items                  - Master item catalog
/roomTemplates          - Room configurations
/estimates              - Client submissions
/priceHistory          - Price change log (Phase 2)
/adminUsers            - Admin access control (Phase 2)
```

---

## Dependencies

### Frontend (`package.json`)
```json
{
  "name": "project-estimator-1584",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "deploy": "npm run build && firebase deploy"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.20.0",
    "firebase": "^10.7.0",
    "recharts": "^2.10.0",
    "jspdf": "^2.5.0",
    "date-fns": "^2.30.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

### Firebase Functions (`functions/package.json`)
```json
{
  "name": "functions",
  "version": "1.0.0",
  "engines": {
    "node": "18"
  },
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^4.5.0",
    "@sendgrid/mail": "^8.1.0",
    "axios": "^1.6.0"
  }
}
```

---

## Git Repository

### `.gitignore`
```
# Dependencies
node_modules/
functions/node_modules/

# Environment
.env
.env.local
.env.*.local

# Firebase
.firebase/
firebase-debug.log
firestore-debug.log
ui-debug.log

# Build
dist/
build/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Firebase Functions
functions/lib/
```

### Git Setup
```bash
git init
git add .
git commit -m "Initial commit: Project Estimator setup"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

---

## Firebase Setup Commands

### Initial Setup
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize project
firebase init

# Select:
# - Firestore
# - Functions
# - Hosting

# Set project
firebase use project-estimator-1584
```

### Development Workflow
```bash
# Run locally
npm run dev

# Test functions locally
cd functions && npm run serve

# Deploy everything
firebase deploy

# Deploy only hosting
firebase deploy --only hosting

# Deploy only functions
firebase deploy --only functions

# Deploy only Firestore rules
firebase deploy --only firestore:rules
```

---

## Domain Setup

### Custom Domain Configuration

**Primary Domain:** `estimator.1584design.com`

1. In Firebase Console → Hosting → Add Custom Domain
2. Add DNS records:
   ```
   Type: A
   Name: estimator
   Value: [Firebase IP addresses provided]
   
   Type: A  
   Name: estimator
   Value: [Firebase IP addresses provided]
   ```

3. SSL Certificate: Auto-provisioned by Firebase

---

## Branding Assets Needed

### Logo Files
```
/public/images/
├── logo.svg              # Main logo (color)
├── logo-white.svg        # White version (for dark backgrounds)
├── logo-icon.svg         # Icon only
└── favicon.ico           # Browser favicon
```

### Brand Colors (Example - adjust to 1584 branding)
```css
:root {
  /* Primary */
  --color-primary: #2C3E50;      /* Deep navy/slate */
  --color-primary-light: #34495E;
  --color-primary-dark: #1A252F;
  
  /* Accent */
  --color-accent: #C9A868;        /* Gold/bronze */
  --color-accent-light: #D4B878;
  --color-accent-dark: #B89858;
  
  /* Neutrals */
  --color-gray-50: #F9FAFB;
  --color-gray-100: #F3F4F6;
  --color-gray-200: #E5E7EB;
  --color-gray-300: #D1D5DB;
  --color-gray-400: #9CA3AF;
  --color-gray-500: #6B7280;
  --color-gray-600: #4B5563;
  --color-gray-700: #374151;
  --color-gray-800: #1F2937;
  --color-gray-900: #111827;
  
  /* Semantic */
  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-error: #EF4444;
  --color-info: #3B82F6;
}
```

### Typography
```css
/* Headings */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Body */
font-family: 'Inter', sans-serif;

/* Mono */
font-family: 'JetBrains Mono', monospace;
```

---

## Development Team Access

### Admin Emails (Can Access Admin Panel)
```
benjamin@1584design.com
team@1584design.com
```

### Firebase Project Roles
```
Owner: benjamin@1584design.com
Editor: team@1584design.com (if needed)
```

---

## Deployment Strategy

### Phase 1: Development
```
Environment: Development
URL: http://localhost:5173
Database: Firestore (development data)
Email: Console.log only (no actual emails)
```

### Phase 2: Staging/Preview
```
Environment: Staging
URL: https://project-estimator-1584--preview.web.app
Database: Firestore (test data)
Email: SendGrid (test mode)
Purpose: Client review, testing
```

### Phase 3: Production
```
Environment: Production
URL: https://estimator.1584design.com
Database: Firestore (production data)
Email: SendGrid (live)
Purpose: Live client use
```

---

## Testing Strategy

### Phase 1 Testing
```
✓ Manual testing in browser
✓ Mobile device testing (real devices)
✓ Calculation accuracy verification
✓ PDF generation testing
✓ Email delivery testing
✓ Cross-browser testing (Chrome, Safari, Firefox)
```

### Phase 2+ Testing
```
✓ All Phase 1 tests
✓ Admin panel functionality
✓ HighLevel integration testing
✓ Load testing (if needed)
✓ Security testing
```

---

## Monitoring & Analytics

### Firebase Analytics (Optional)
```
Events to Track:
- page_view (automatic)
- estimate_started
- room_added
- quality_tier_selected
- estimate_submitted
- pdf_downloaded
- admin_login
```

### Error Logging
```
Tool: Firebase Crashlytics or Sentry (optional)
Purpose: Track JavaScript errors
```

### Performance Monitoring
```
Tool: Firebase Performance Monitoring
Purpose: Track load times, API latency
```

---

## Security Considerations

### Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Public read for items and templates
    match /items/{itemId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    match /roomTemplates/{templateId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    // Anyone can create estimates
    match /estimates/{estimateId} {
      allow create: if true;
      allow read: if isAdmin();
      allow update, delete: if isAdmin();
    }
    
    // Admin only
    match /priceHistory/{historyId} {
      allow read, write: if isAdmin();
    }
  }
  
  function isAdmin() {
    return request.auth != null && 
           request.auth.token.email in [
             'benjamin@1584design.com',
             'team@1584design.com'
           ];
  }
}
```

### API Keys
- Never commit API keys to git
- Use environment variables
- Restrict Firebase API keys by domain in Firebase Console
- Use Firebase App Check (optional, Phase 2+)

---

## Backup Strategy

### Firestore Backups
```bash
# Automated daily backups (set up in Firebase Console)
# Or manual export:
gcloud firestore export gs://project-estimator-1584-backups
```

### Data Export
- Admin panel has "Export to CSV" functionality
- Manual exports as needed
- Keep CSV files in safe location

---

## Support & Maintenance

### Bug Reports
- Track in GitHub Issues or Notion
- Priority levels: Critical, High, Medium, Low

### Feature Requests
- Maintain backlog of enhancement ideas
- Prioritize based on user feedback

### Update Schedule
- Pricing updates: As needed via admin panel
- Feature updates: Monthly or as needed
- Security updates: Immediately

---

## Cost Estimates

### Firebase Free Tier (Likely Sufficient for Phase 1)
```
Firestore:
- 20,000 document reads/day
- 20,000 document writes/day
- 1 GB storage

Functions:
- 2M invocations/month
- 400,000 GB-seconds/month

Hosting:
- 10 GB storage
- 360 MB/day transfer

Estimated Usage (100 estimates/month):
- Reads: ~5,000/month
- Writes: ~500/month
- Function calls: ~500/month
→ Well within free tier
```

### Paid Services
```
SendGrid: Free (100 emails/day) or $20/month (40k emails)
HighLevel: Existing subscription
Domain: ~$12/year
```

### Estimated Monthly Cost (Phase 1-2)
```
Firebase: $0 (free tier)
SendGrid: $0-20
Total: $0-20/month
```

---

## Launch Checklist

### Pre-Launch
- [ ] All Phase 1 features complete
- [ ] Data imported to Firestore
- [ ] Tested on multiple devices
- [ ] PDF generation working
- [ ] Email delivery working
- [ ] Admin panel accessible
- [ ] Branding/logo added
- [ ] Custom domain configured
- [ ] Analytics set up (optional)
- [ ] Error logging configured
- [ ] Backup strategy in place

### Launch Day
- [ ] Deploy to production
- [ ] Verify all functionality
- [ ] Test complete user flow
- [ ] Send test estimate
- [ ] Monitor for errors
- [ ] Notify team

### Post-Launch
- [ ] Monitor usage daily (first week)
- [ ] Collect user feedback
- [ ] Fix any bugs immediately
- [ ] Plan Phase 2 enhancements
- [ ] Document any issues/learnings

---

## Contact & Access

### Project Owner
```
Name: Benjamin Mackenzie
Email: benjamin@1584design.com
Company: 1584 Interior Design
```

### Firebase Project
```
Console: https://console.firebase.google.com/project/project-estimator-1584
Project ID: project-estimator-1584
```

### Important Links
```
Planning Docs: /planning_docs
Repository: [To be added]
Production URL: https://estimator.1584design.com [Phase 3]
Admin Panel: https://estimator.1584design.com/admin
Firebase Console: https://console.firebase.google.com/project/project-estimator-1584
```

---

## Next Steps

1. ✅ Review this project info
2. Create Firebase project with ID: `project-estimator-1584`
3. Initialize local development environment
4. Import data from CSV to Firestore
5. Start building Phase 1 features

---

**Last Updated:** October 13, 2025  
**Version:** 1.0  
**Status:** Planning Complete → Ready for Development

