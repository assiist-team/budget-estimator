import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

initializeApp({ credential: applicationDefault() });

const db = getFirestore();

async function seedTools() {
  const toolsDocRef = db.collection('config').doc('tools');

  await toolsDocRef.set(
    {
      tools: [
        {
          id: 'budget-estimator',
          name: 'Budget Estimator',
          description: 'Estimates budgets for vacation rental projects.',
          routeBase: '/tools/budget-estimator',
          enabled: true,
          rolesAllowed: ['owner', 'admin', 'customer'],
          sortOrder: 1,
        },
        {
          id: 'roi-estimator',
          name: 'ROI Estimator',
          description: 'Estimate cash flow and enterprise value impact from design.',
          routeBase: '/tools/roi-estimator',
          enabled: true,
          rolesAllowed: ['owner', 'admin', 'customer'],
          sortOrder: 2,
        },
      ],
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  );

  console.log('Seeded config/tools');
}

seedTools().catch((error) => {
  console.error('Failed to seed tools config', error);
  process.exit(1);
});

