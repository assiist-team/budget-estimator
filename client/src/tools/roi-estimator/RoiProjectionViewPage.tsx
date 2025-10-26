import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Header from '../../components/Header';
import ProgressBar from '../../components/ProgressBar';
import Methodology from './components/Methodology';
import { db } from '../../lib/firebase';
import { HelpIcon } from '../../components/Icons';

interface ProjectionDoc {
  inputs: any;
  computed: any;
}

export default function RoiProjectionViewPage() {
  const navigate = useNavigate();
  const { projectionId } = useParams<{ projectionId: string }>();
  const [projection, setProjection] = useState<ProjectionDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjection = async () => {
      if (!projectionId) return;
      try {
        const ref = doc(db, 'projections', projectionId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data() as ProjectionDoc;
          setProjection(data);
        }
      } finally {
        setLoading(false);
      }
    };
    void fetchProjection();
  }, [projectionId]);

  const usd = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const pct = (n: number) => `${Math.round(n * 1000) / 10}%`;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading projection...</p>
        </div>
      </div>
    );
  }

  if (!projection) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Projection not found</h1>
          <button onClick={() => navigate('/tools/roi-estimator')} className="btn-secondary mt-6">← Back</button>
        </div>
      </div>
    );
  }

  const { inputs, computed } = projection;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <Link to="/tools/roi-estimator" className="btn-secondary">← Back to Input</Link>
          <div className="w-64"><ProgressBar currentStep={2} totalSteps={2} /></div>
        </div>

        <div className="grid grid-cols-1 gap-6 mb-8">
          <div className="card">
            <div className="grid gap-8 md:grid-cols-[minmax(0,1.5fr),minmax(0,1.25fr)]">
              <div className="grid gap-6">
                {/* Results Summary */}
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900 mb-4">Interior Design ROI Results</h1>
                  <p className="text-sm text-gray-600 mb-6">Based on your inputs, here are the projected gains from interior design services.</p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                      <div className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                        Net Cash Flow Gain
                        <HelpIcon title="Annual cash flow from your property after all operating and financing expenses" className="text-gray-400 hover:text-gray-700 cursor-help" />
                      </div>
                      <div className="text-2xl font-semibold text-primary-700">{usd(computed.annualCashFlowGain)}</div>
                    </div>
                    <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                      <div className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                        Enterprise Value Gain
                        <HelpIcon title="The added value of your property as a cash-generating asset, beyond its real estate value" className="text-gray-400 hover:text-gray-700 cursor-help" />
                      </div>
                      <div className="text-2xl font-semibold text-primary-700">{usd(computed.enterpriseValueGain)}</div>
                    </div>
                    <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                      <div className="text-xs text-gray-600 mb-1">Total Year One Gain</div>
                      <div className="text-2xl font-bold text-green-600">{usd(computed.totalYearOneGain ?? (computed.annualCashFlowGain + computed.enterpriseValueGain))}</div>
                    </div>
                  </div>

                </div>

                {/* Without/With Interior Design Comparison */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-gray-50/30 p-4 rounded-lg">
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-800">Without Interior Design</h3>
                    <div className="bg-white rounded-md p-4 border border-gray-100 space-y-3">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">Occupancy</span>
                        <span className="font-medium">{pct(inputs.occupancyBefore)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">ADR</span>
                        <span className="font-medium">{usd(inputs.adrBefore)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">Gross Revenue</span>
                        <span className="font-medium">{usd(computed.grossBefore)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">PM Fee</span>
                        <span className="font-medium">{usd(computed.pmBefore)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">Other Fixed Costs</span>
                        <span className="font-medium">{usd(computed.otherFixed)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">Mortgage</span>
                        <span className="font-medium">{usd(inputs.fixed.mortgage)}</span>
                      </div>
                      <div className="flex justify-between text-xs border-t border-gray-200 pt-3">
                        <span className="text-gray-700 font-medium flex items-center gap-1">
                          Net Cash Flow
                          <HelpIcon title="Cash flow from your property after all operating and financing expenses" className="text-gray-400 hover:text-gray-700 cursor-help" />
                        </span>
                        <span className="font-semibold">{usd(computed.netCashFlowBefore)}</span>
                      </div>
                      <div className="flex justify-between text-xs border-t border-gray-200 pt-3">
                        <span className="text-gray-700 font-medium">SDE</span>
                        <span className="font-semibold">{usd(computed.sdeBefore)}</span>
                      </div>
                      <div className="flex justify-between text-xs border-t border-gray-200 pt-3">
                        <span className="text-gray-700 font-medium">Enterprise Value</span>
                        <span className="font-semibold">{usd(computed.evBefore)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-800">With Interior Design</h3>
                    <div className="bg-white rounded-md p-4 border border-gray-100 space-y-3">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">Occupancy</span>
                        <span className="font-medium">{pct(inputs.occupancyAfter)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">ADR</span>
                        <span className="font-medium">{usd(inputs.adrAfter)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">Gross Revenue</span>
                        <span className="font-medium">{usd(computed.grossAfter)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">PM Fee</span>
                        <span className="font-medium">{usd(computed.pmAfter)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">Other Fixed Costs</span>
                        <span className="font-medium">{usd(computed.otherFixed)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">Mortgage</span>
                        <span className="font-medium">{usd(inputs.fixed.mortgage)}</span>
                      </div>
                      <div className="flex justify-between text-xs border-t border-gray-200 pt-3">
                        <span className="text-gray-700 font-medium flex items-center gap-1">
                          Net Cash Flow
                          <HelpIcon title="Cash flow from your property after all operating and financing expenses" className="text-gray-400 hover:text-gray-700 cursor-help" />
                        </span>
                        <span className="font-semibold">{usd(computed.netCashFlowAfter)}</span>
                      </div>
                      <div className="flex justify-between text-xs border-t border-gray-200 pt-3">
                        <span className="text-gray-700 font-medium">SDE</span>
                        <span className="font-semibold">{usd(computed.sdeAfter)}</span>
                      </div>
                      <div className="flex justify-between text-xs border-t border-gray-200 pt-3">
                        <span className="text-gray-700 font-medium">Enterprise Value</span>
                        <span className="font-semibold">{usd(computed.evAfter)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Methodology */}
              <div className="flex flex-col gap-4 md:self-stretch">
                <div className="bg-white rounded-md p-4 border border-gray-100">
                  <Methodology />
                </div>
                {/* No save button on the view page */}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}


