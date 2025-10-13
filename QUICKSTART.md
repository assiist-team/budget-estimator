# Quick Start Guide

Get the 1584 Project Estimator running in 5 minutes!

## Prerequisites

- Node.js 20.10.0+
- npm 10.2.3+

## Quick Setup

### 1. Install Dependencies

```bash
cd "/Users/benjaminmackenzie/Dev/1584/Project Estimator 2/client"
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

The app will open at: `http://localhost:5173`

## That's It!

The app will run with mock data. You can:
- ✅ Navigate through all 3 steps
- ✅ Configure rooms and see calculations
- ✅ Submit estimates (will fail without Firebase)
- ✅ View the admin dashboard (empty without Firebase)

## To Enable Full Functionality

Follow these guides:
1. **`SETUP_FIREBASE.md`** - Set up Firebase and connect to real database
2. **`README.md`** - Complete feature documentation
3. **`PHASE1_SUMMARY.md`** - What's built and what's next

## Common Commands

```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build

# Linting
npm run lint         # Check for code issues
```

## Project Structure

```
client/
├── src/
│   ├── pages/           # Main pages
│   ├── components/      # Reusable components
│   ├── hooks/          # Custom hooks
│   ├── store/          # State management
│   ├── types/          # TypeScript types
│   ├── utils/          # Helper functions
│   └── lib/            # Firebase config
└── package.json
```

## Testing the App

1. **Landing Page** - Click "Start Your Estimate"
2. **Property Input** - Enter: 3200 sqft, 12 guests
3. **Room Configuration** - Select rooms and sizes
4. **Results** - View budget breakdown
5. **Admin** - Click "Admin" in header to see dashboard

## Need Help?

- See `README.md` for full documentation
- Check `SETUP_FIREBASE.md` for database setup
- Review `PHASE1_SUMMARY.md` for feature list

## Ready for Production?

Before deploying:
1. ✅ Set up Firebase (see `SETUP_FIREBASE.md`)
2. ✅ Configure `.env` with real credentials
3. ✅ Test full user flow
4. ✅ Run `npm run build`
5. ✅ Deploy to hosting provider

---

**Questions?** Contact Benjamin Mackenzie at 1584 Interior Design

