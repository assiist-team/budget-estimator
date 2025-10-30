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

const toolBgImages = [
  '/src/assets/tool-bgs/1--w800.webp',
  '/src/assets/tool-bgs/2--w800.webp',
  '/src/assets/tool-bgs/3--w800.webp',
];

export default function ToolsLandingPage() {
  const { loading } = useAuth();
  const [imageAspectMap, setImageAspectMap] = useState<Record<string, number>>({});
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
                rolesAllowed: ['admin', 'user'],
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

  // Compute intrinsic aspect ratios for our selected background images
  useEffect(() => {
    let mounted = true;
    const map: Record<string, number> = {};

    const loadPromises = toolBgImages.map((src) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.src = src;
        img.onload = () => {
          if (!mounted) return resolve();
          // padding-top expects height/width as a percentage of width, so compute (height/width)
          map[src] = img.height / img.width;
          resolve();
        };
        img.onerror = () => resolve();
      })
    );

    void Promise.all(loadPromises).then(() => {
      if (mounted) setImageAspectMap(map);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const accessibleTools = useMemo(() => {
    if (!toolsConfig) return [];

    // All users get access to all enabled tools.
    return toolsConfig.tools.filter((tool) => tool.enabled);
  }, [toolsConfig]);

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

  // With public access after opt-in, we always render the list

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          
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
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-3">
            {accessibleTools.map((tool, idx) => {
              const bg = toolBgImages[idx % toolBgImages.length];
              const aspect = imageAspectMap[bg];

              return (
                <div key={tool.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden relative" style={{
                  boxShadow: '0 12px 30px rgba(0,0,0,0.20), 0 6px 12px rgba(0,0,0,0.12)'
                }}>
                  {/* Image container preserves intrinsic aspect ratio using padding-top trick */}
                  <div className="w-full bg-gray-100">
                    <div
                      className="w-full bg-center bg-cover relative"
                      style={{
                        backgroundImage: `url(${bg})`,
                        // If we have the computed aspect ratio, use it; otherwise fall back to 16:9
                        paddingTop: aspect ? `${aspect * 100}%` : '56.25%',
                      }}
                    >
                      {/* Overlay content positioned absolute over the image; black gradient from bottom up */}
                      <div className="absolute inset-0 flex flex-col justify-end pl-4 pb-6 pr-2 pt-2" style={{
                        background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.85) 15%, rgba(0,0,0,0.7) 30%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0) 100%)'
                      }}>
                          <h2 className="text-lg font-semibold text-white leading-tight">{tool.name}</h2>
                        <p className="text-sm text-white/90 mt-1">{tool.description}</p>
                        <div className="mt-3">
                          <Link to={tool.routeBase} className="btn-primary inline-flex items-center gap-2 text-sm">
                            Open tool →
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {/* Static ROI Design Guide card (uses remaining background image) */}
            <div key="roi-design-guide" className="bg-white border border-gray-200 rounded-xl overflow-hidden relative" style={{
              boxShadow: '0 12px 30px rgba(0,0,0,0.20), 0 6px 12px rgba(0,0,0,0.12)'
            }}>
              <div className="w-full bg-gray-100">
                <div
                  className="w-full bg-center bg-cover relative"
                  style={{
                    backgroundImage: `url(${toolBgImages[2]})`,
                    paddingTop: imageAspectMap[toolBgImages[2]] ? `${imageAspectMap[toolBgImages[2]] * 100}%` : '56.25%',
                  }}
                >
                  <div className="absolute inset-0 flex flex-col justify-end pl-4 pb-6 pr-2 pt-2" style={{
                    background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.85) 15%, rgba(0,0,0,0.7) 30%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0) 100%)'
                  }}>
                    <h2 className="text-lg font-semibold text-white leading-tight">Interior Design ROI Guide</h2>
                    <p className="text-sm text-white/90 mt-1">Our method for high-ROI interior design</p>
                    <div className="mt-3">
                      <a href="/roi-design-guide" className="btn-primary inline-flex items-center gap-2 text-sm">
                        Open Guide →
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}


