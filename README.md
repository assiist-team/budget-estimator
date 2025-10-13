# 1584 Interior Design Project Estimator

A professional web application for generating interior design project estimates across multiple quality tiers.

## 🎯 Features (Phase 1)

- **3-Step Estimate Process**
  - Property information input (square footage, guest capacity)
  - Room configuration with size selection
  - Complete budget breakdown across 4 quality tiers

- **Quality Tiers**
  - Budget: Good value materials and furnishings
  - Mid-Range: Balanced quality and investment
  - Mid/High: Premium materials and designer pieces
  - High-End: Luxury, high-end designer furnishings

- **Intelligent Suggestions**
  - Smart room recommendations based on property specs
  - Real-time budget calculations
  - Complete range from Budget to High-End quality

- **Admin Dashboard**
  - View all submitted estimates
  - Track client information and project details

## 🚀 Getting Started

### Prerequisites

- Node.js 20.10.0 or higher
- npm 10.2.3 or higher
- Firebase project (for database)

### Installation

1. **Clone the repository**
   ```bash
   cd "/Users/benjaminmackenzie/Dev/1584/Project Estimator 2"
   ```

2. **Install client dependencies**
   ```bash
   cd client
   npm install
   ```

3. **Set up Firebase configuration**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your Firebase configuration:
   ```
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=project-estimator-1584
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

4. **Import data to Firestore**
   ```bash
   cd ../scripts
   npm install
   npm run import
   ```
   
   This will generate JSON files in `scripts/output/` that you can import to Firestore.

5. **Start the development server**
   ```bash
   cd ../client
   npm run dev
   ```

   The app will be available at `http://localhost:5173`

## 📁 Project Structure

```
Project Estimator 2/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components (Landing, Property, Rooms, Results, Admin)
│   │   ├── hooks/         # Custom React hooks
│   │   ├── store/         # Zustand state management
│   │   ├── types/         # TypeScript type definitions
│   │   ├── utils/         # Utility functions (calculations, formatting)
│   │   ├── lib/           # Third-party library configs (Firebase)
│   │   ├── App.tsx        # Main app component with routing
│   │   └── main.tsx       # Application entry point
│   ├── public/            # Static assets
│   └── package.json       # Dependencies and scripts
│
├── scripts/               # Data import and utility scripts
│   ├── importData.js      # CSV to Firestore import script
│   └── package.json       # Script dependencies
│
├── initial_dataset/       # CSV files with pricing data
│   ├── Item Pricing.csv
│   └── [Room-specific CSVs]
│
└── planning_docs/         # Project planning and specifications
    ├── 01_MASTER_PLAN.md
    ├── 06_DATA_MODEL.md
    └── 07_UI_SPECIFICATIONS.md
```

## 🔧 Tech Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **TailwindCSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **React Hook Form** - Form handling
- **Zustand** - State management
- **Framer Motion** - Animations (planned)

### Backend
- **Firebase Firestore** - NoSQL database
- **Firebase Hosting** - Static hosting (planned)
- **Firebase Cloud Functions** - Serverless functions (Phase 2)

## 📊 Data Model

### Collections

1. **items** - Master item pricing catalog
   - Individual furniture and decor items
   - Pricing across 4 quality tiers (in cents)
   - Categories and metadata

2. **roomTemplates** - Pre-configured room templates
   - Room types (Living Room, Kitchen, Bedrooms, etc.)
   - 3 sizes per room (Small, Medium, Large)
   - Item lists and quantities for each size
   - Pre-calculated totals

3. **estimates** - Client estimate submissions
   - Client contact information
   - Property specifications
   - Selected rooms and configurations
   - Complete budget calculations
   - Submission tracking

## 🎨 Design System

### Colors
- **Primary**: Navy blue (#1A252F, #2C3E50, #34495E)
- **Accent**: Gold/Bronze (#C9A868, #D4B878)
- **Neutrals**: Warm grays

### Typography
- **Font**: Inter (with system fallbacks)
- **Headings**: 600 weight
- **Body**: 400 weight

## 📝 Available Scripts

### Client

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

### Scripts

```bash
npm run import   # Import CSV data to Firestore
```

## 🔐 Environment Variables

Create a `.env` file in the `client/` directory:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

## 📖 User Flow

1. **Landing Page** - Welcome and feature overview
2. **Step 1: Property Input** - Enter square footage and guest capacity
3. **Step 2: Room Configuration** - Select rooms, sizes, and quantities
4. **Step 3: Results & Contact** - View estimates and submit contact info

## 🚧 Roadmap

### Phase 1 (Current) ✅
- [x] Core estimator functionality
- [x] Property input form
- [x] Room configuration UI
- [x] Budget calculations (all tiers)
- [x] Results display
- [x] Contact form and submission
- [x] Basic admin dashboard
- [x] Data import script

### Phase 2 (Next)
- [ ] PDF generation and download
- [ ] Email delivery (SendGrid integration)
- [ ] Enhanced admin interface
- [ ] Price management UI
- [ ] Beautiful branded design
- [ ] Mobile optimization
- [ ] Testing and bug fixes

### Phase 3 (Future)
- [ ] HighLevel CRM integration
- [ ] Automatic lead sync
- [ ] Workflow automation
- [ ] Two-way CRM sync

### Phase 4 (Optional)
- [ ] AI-powered natural language input
- [ ] Smart item suggestions
- [ ] Historical analytics
- [ ] Client collaboration portal

## 🐛 Known Issues

- Firebase configuration required before first run
- PDF generation not yet implemented
- Email delivery not yet implemented
- Need to add comprehensive error handling

## 📞 Support

For questions or issues, contact:
- Benjamin Mackenzie
- 1584 Interior Design

## 📄 License

Proprietary - © 2025 1584 Interior Design. All rights reserved.

