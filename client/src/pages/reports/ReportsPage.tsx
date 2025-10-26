import { useEffect, useMemo, useState } from 'react';
import Header from '../../components/Header';
import { useSearchParams } from 'react-router-dom';
import EstimatesReportsTab from './EstimatesReportsTab';
import ProjectionsReportsTab from './ProjectionsReportsTab';
import { useAuth } from '../../context/AuthContext';
import { useAuthModal } from '../../components/auth/AuthModalProvider';

export default function ReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [estimatesCount, setEstimatesCount] = useState(0);
  const [projectionsCount, setProjectionsCount] = useState(0);
  const { firebaseUser } = useAuth();
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
      void requireAccount({ reason: 'Sign in to view your saved reports.' });
    }
  }, [firebaseUser, requireAccount]);

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


