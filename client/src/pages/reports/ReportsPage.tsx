import { useEffect, useMemo, useState } from 'react';
import { collection, getCountFromServer, query, where } from 'firebase/firestore';
import Header from '../../components/Header';
import { useSearchParams } from 'react-router-dom';
import EstimatesReportsTab from './EstimatesReportsTab';
import ProjectionsReportsTab from './ProjectionsReportsTab';
import { useAuth } from '../../context/AuthContext';
import { useAuthModal, AuthModalCancelledError } from '../../components/auth/AuthModalProvider';
import { db } from '../../lib/firebase';

export default function ReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [estimatesCount, setEstimatesCount] = useState(0);
  const [projectionsCount, setProjectionsCount] = useState(0);
  const { firebaseUser, isAdmin } = useAuth();
  const { requireAccount } = useAuthModal();

  const activeTab = useMemo<'estimates' | 'projections'>(() => {
    const tab = searchParams.get('tab');
    return tab === 'projections' ? 'projections' : 'estimates';
  }, [searchParams]);

  const setActiveTab = (tab: 'estimates' | 'projections') => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    if (!firebaseUser) {
      void requireAccount({ reason: 'Sign in to view your saved reports.' }).catch((error) => {
        if (error instanceof AuthModalCancelledError) {
          return;
        }
        throw error;
      });
    }
  }, [firebaseUser, requireAccount]);

  // Fetch tab counts immediately so badges are populated without needing to click tabs
  useEffect(() => {
    let cancelled = false;

    const fetchCounts = async () => {
      // If no user and not admin, do not attempt to fetch user-scoped counts
      if (!firebaseUser && !isAdmin) return;

      try {
        const estimatesBase = collection(db, 'estimates');
        const estimatesQuery = isAdmin
          ? query(
              estimatesBase,
              where('toolId', '==', 'budget-estimator')
            )
          : query(
              estimatesBase,
              where('ownerUid', '==', firebaseUser!.uid),
              where('toolId', '==', 'budget-estimator')
            );

        const projectionsBase = collection(db, 'projections');
        const projectionsQuery = isAdmin
          ? query(
              projectionsBase,
              where('toolId', '==', 'roi-estimator')
            )
          : query(
              projectionsBase,
              where('ownerUid', '==', firebaseUser!.uid),
              where('toolId', '==', 'roi-estimator')
            );

        const [estimatesSnap, projectionsSnap] = await Promise.all([
          getCountFromServer(estimatesQuery),
          getCountFromServer(projectionsQuery),
        ]);

        if (!cancelled) {
          setEstimatesCount(estimatesSnap.data().count ?? 0);
          setProjectionsCount(projectionsSnap.data().count ?? 0);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch report counts', error);
      }
    };

    void fetchCounts();
    return () => {
      cancelled = true;
    };
  }, [firebaseUser, isAdmin]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600 mt-2">Budget Estimates and ROI Projections</p>
        </div>

        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('estimates')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'estimates'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Budget Estimates ({estimatesCount})
            </button>
            <button
              onClick={() => setActiveTab('projections')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'projections'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              ROI Projections ({projectionsCount})
            </button>
          </nav>
        </div>

        {activeTab === 'estimates' ? (
          <EstimatesReportsTab onCountChange={setEstimatesCount} />
        ) : (
          <ProjectionsReportsTab onCountChange={setProjectionsCount} />)
        }
      </main>
    </div>
  );
}


