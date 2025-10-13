# Deployment Checklist

## Pre-Deployment Setup

### 1. Firebase Configuration ☑️

- [ ] Create Firebase project
- [ ] Enable Firestore Database
- [ ] Set up Firestore security rules
- [ ] Import room template data
- [ ] Create required indexes
- [ ] Test Firestore connection

**Guide**: See `SETUP_FIREBASE.md`

---

### 2. Environment Variables ☑️

- [ ] Copy `.env.example` to `.env`
- [ ] Add Firebase API key
- [ ] Add Firebase Auth Domain
- [ ] Add Firebase Project ID
- [ ] Add Firebase Storage Bucket
- [ ] Add Firebase Messaging Sender ID
- [ ] Add Firebase App ID
- [ ] Verify all variables are correct

**File**: `client/.env`

---

### 3. Data Import ☑️

- [ ] Navigate to `scripts/` directory
- [ ] Run `npm install`
- [ ] Run `npm run import`
- [ ] Review generated JSON files in `scripts/output/`
- [ ] Import data to Firestore (via console or script)
- [ ] Verify data appears in Firestore

---

### 4. Testing ☑️

#### Local Testing
- [ ] Run `npm run dev`
- [ ] Test landing page loads
- [ ] Complete full estimate flow
- [ ] Test property input validation
- [ ] Test room configuration
- [ ] Test budget calculations
- [ ] Submit test estimate
- [ ] Verify estimate saves to Firestore
- [ ] Check admin dashboard shows estimate
- [ ] Test on mobile device
- [ ] Test in different browsers (Chrome, Safari, Firefox)

#### Build Testing
- [ ] Run `npm run build`
- [ ] Run `npm run preview`
- [ ] Test production build locally
- [ ] Verify no console errors
- [ ] Check bundle size is acceptable

---

### 5. Production Build ☑️

```bash
cd client
npm run build
```

- [ ] Build completes without errors
- [ ] Review `dist/` folder
- [ ] Check file sizes
- [ ] Verify all assets included

---

## Deployment Options

### Option 1: Firebase Hosting (Recommended)

#### Setup
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
```

#### Configuration
- Select your Firebase project
- Set public directory: `dist`
- Configure as single-page app: Yes
- Set up automatic builds with GitHub: Optional

#### Deploy
```bash
cd client
npm run build
firebase deploy --only hosting
```

- [ ] Deploy completes successfully
- [ ] Visit provided URL
- [ ] Test live site
- [ ] Verify Firebase connection works

---

### Option 2: Vercel

```bash
npm install -g vercel
vercel login
vercel
```

- [ ] Import from Git or deploy directly
- [ ] Set build command: `npm run build`
- [ ] Set output directory: `dist`
- [ ] Add environment variables in Vercel dashboard
- [ ] Deploy
- [ ] Test live site

---

### Option 3: Netlify

```bash
npm install -g netlify-cli
netlify login
netlify deploy
```

Or use Netlify's web interface:
- [ ] Connect GitHub repository
- [ ] Set build command: `npm run build`
- [ ] Set publish directory: `dist`
- [ ] Add environment variables
- [ ] Deploy
- [ ] Test live site

---

## Post-Deployment

### 1. Verify Functionality ☑️

- [ ] Landing page loads correctly
- [ ] All routes work
- [ ] Images and assets load
- [ ] Firebase connection works
- [ ] Forms submit successfully
- [ ] Estimates save to Firestore
- [ ] Admin dashboard loads
- [ ] Mobile responsive works
- [ ] No console errors

---

### 2. Performance Checks ☑️

- [ ] Run Lighthouse audit
- [ ] Check page load times
- [ ] Verify bundle size
- [ ] Test on slow 3G
- [ ] Check Core Web Vitals

**Target Metrics**:
- Performance: >90
- Accessibility: >90
- Best Practices: >90
- SEO: >80

---

### 3. Security ☑️

- [ ] Review Firestore security rules
- [ ] Verify API keys are in environment variables
- [ ] Check no sensitive data in client code
- [ ] Test unauthorized access attempts
- [ ] Enable HTTPS (automatic with Firebase/Vercel/Netlify)

---

### 4. Monitoring Setup ☑️

- [ ] Set up Firebase Analytics (optional)
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Set up uptime monitoring
- [ ] Configure alerts for errors
- [ ] Set up performance monitoring

---

### 5. Documentation ☑️

- [ ] Update README with live URL
- [ ] Document deployment process
- [ ] Create admin user guide
- [ ] Document troubleshooting steps
- [ ] Share credentials with team (securely)

---

## Rollback Plan

If deployment has issues:

1. **Immediate Rollback** (Firebase):
```bash
firebase hosting:rollback
```

2. **Vercel/Netlify**: Use dashboard to rollback to previous deployment

3. **Manual**: Keep backup of working `dist/` folder

---

## Common Issues & Solutions

### Issue: Firebase connection fails
- **Solution**: Verify `.env` variables are correct and deployed
- Check Firebase project ID matches

### Issue: 404 on routes
- **Solution**: Configure host for SPA
  - Firebase: Set `rewrites` in `firebase.json`
  - Vercel/Netlify: Automatic with SPA detection

### Issue: Build fails
- **Solution**: Check Node version matches local
- Verify all dependencies in `package.json`
- Run `npm ci` for clean install

### Issue: Slow performance
- **Solution**: Enable compression
- Check bundle size with `npm run build -- --report`
- Consider code splitting

---

## DNS Configuration (Custom Domain)

If using custom domain:

1. **Purchase domain** from registrar
2. **Add domain** in hosting provider dashboard
3. **Update DNS records**:
   - Firebase: Add A records provided
   - Vercel/Netlify: Add CNAME or A records
4. **Wait for propagation** (up to 48 hours)
5. **Verify SSL certificate** is issued
6. **Test domain** works

---

## Production Environment Variables

For production, ensure these are set in hosting provider:

```env
VITE_FIREBASE_API_KEY=your_production_key
VITE_FIREBASE_AUTH_DOMAIN=your_production_domain
VITE_FIREBASE_PROJECT_ID=your_production_project
VITE_FIREBASE_STORAGE_BUCKET=your_production_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_production_sender
VITE_FIREBASE_APP_ID=your_production_app_id
```

**Never commit `.env` to version control!**

---

## Maintenance

### Regular Tasks
- [ ] Monitor Firestore usage
- [ ] Check error logs weekly
- [ ] Review submitted estimates
- [ ] Update dependencies monthly
- [ ] Backup Firestore data
- [ ] Review security rules

### Updates
- [ ] Test updates in staging first
- [ ] Keep dependencies up to date
- [ ] Monitor for security vulnerabilities
- [ ] Update documentation as features change

---

## Support Contacts

- **Firebase Support**: https://firebase.google.com/support
- **Vercel Support**: https://vercel.com/support
- **Netlify Support**: https://www.netlify.com/support

---

## Success Criteria

Deployment is successful when:

✅ All routes accessible
✅ Firebase connection working
✅ Forms submitting successfully
✅ Data saving to Firestore
✅ Admin dashboard functional
✅ Mobile responsive
✅ Performance >90 on Lighthouse
✅ No console errors
✅ SSL enabled
✅ Monitoring active

---

**Ready to deploy?** Follow this checklist step-by-step. Good luck! 🚀

