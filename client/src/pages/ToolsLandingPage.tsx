import { useEffect, useMemo, useState } from 'react';
import { collection, doc, getDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';

interface ToolDescriptor {
  id: string;
  name: string;
  description: string;
  routeBase: string;
  enabled: boolean;
  rolesAllowed: string[];
}

interface ToolsConfig {
  tools: ToolDescriptor[];
}

export default function ToolsLandingPage() {
  const { profile, loading, hasToolAccess } = useAuth();
  const [toolsConfig, setToolsConfig] = useState<ToolsConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  useEffect(() => {
    const fetchToolsConfig = async () => {
      try {
        setLoadingConfig(true);
        const configRef = doc(collection(db, 'config'), 'tools');
        const snapshot = await getDoc(configRef);

        if (!snapshot.exists()) {
          setToolsConfig({
            tools: [
              {
                id: 'budget-estimator',
                name: 'Budget Estimator',
                description: 'Estimate budget for vacation rental projects.',
                routeBase: '/tools/budget-estimator',
                enabled: true,
                rolesAllowed: ['owner', 'admin', 'customer'],
              },
            ],
          });
          return;
        }

        const data = snapshot.data() as ToolsConfig;
        setToolsConfig(data);
      } catch (err) {
        console.error('Failed to load tools config', err);
        setError('Unable to load toolkit configuration. Please try again later.');
      } finally {
        setLoadingConfig(false);
      }
    };

    void fetchToolsConfig();
  }, []);

  const accessibleTools = useMemo(() => {
    if (!toolsConfig) return [];
    if (!profile) return [];

    return toolsConfig.tools.filter((tool) => {
      if (!tool.enabled) {
        return false;
      }

      if (!hasToolAccess(tool.id)) {
        return false;
      }

      if (tool.rolesAllowed && tool.rolesAllowed.length > 0) {
        return tool.rolesAllowed.includes(profile.role);
      }

      return true;
    });
  }, [toolsConfig, profile, hasToolAccess]);

  const totalCards = accessibleTools.length;

  if (loading || loadingConfig) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading toolkit...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Access required</h1>
          <p className="text-gray-600">Please sign in to see your available tools.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">1584 Toolkit</h1>
          <p className="text-lg text-gray-600">
            Access estimators and workflows enabled for your account.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {totalCards === 0 ? (
          <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">No tools assigned yet</h2>
            <p className="text-gray-600 mb-6">
              Your account does not currently have access to any tools. Contact an administrator if you believe this is an error.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {accessibleTools.map((tool) => (
              <div key={tool.id} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="p-6">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">{tool.name}</h2>
                  <p className="text-gray-600 mb-4">{tool.description}</p>
                  <Link
                    to={tool.routeBase}
                    className="btn-primary inline-flex items-center gap-2"
                  >
                    Open tool →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}


