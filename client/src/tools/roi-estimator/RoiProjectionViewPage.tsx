import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Header from '../../components/Header';
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
          <button onClick={() => navigate('/tools/roi-estimator')} className="btn-primary mt-6">Back</button>
        </div>
      </div>
    );
  }

  const { inputs, computed } = projection;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <Link to="/tools/roi-estimator" className="btn-secondary">← Back</Link>
        </div>

        <div className="card mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between"><span>Occupancy</span><span>{pct(inputs.occupancyBefore)} → {pct(inputs.occupancyAfter)}</span></div>
              <div className="flex justify-between"><span>ADR</span><span>{usd(inputs.adrBefore)} → {usd(inputs.adrAfter)}</span></div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between"><span>PM Fee %</span><span>{pct(inputs.propertyManagementPct)}</span></div>
              <div className="flex justify-between"><span>SDE Multiple</span><span>{inputs.sdeMultiple}×</span></div>
            </div>
          </div>
          <div className="mt-4 border-t pt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex justify-between"><span>Total Year One Gain</span><span className="font-semibold text-primary-700">{usd(computed.totalYearOneGain ?? (computed.annualCashFlowGain + computed.enterpriseValueGain))}</span></div>
            <div className="flex justify-between">
              <span className="flex items-center gap-1">
                Annual Cash Flow Gain
                <HelpIcon title="Annual cash flow from your property after all operating and financing expenses" className="text-gray-400 hover:text-gray-700 cursor-help" />
              </span>
              <span className="font-semibold text-primary-700">{usd(computed.annualCashFlowGain)}</span>
            </div>
            <div className="flex justify-between">
              <span className="flex items-center gap-1">
                Enterprise Value Gain
                <HelpIcon title="The added value of your property as a cash-generating asset, beyond its real estate value" className="text-gray-400 hover:text-gray-700 cursor-help" />
              </span>
              <span className="font-semibold text-primary-700">{usd(computed.enterpriseValueGain)}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Without Interior Design</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Gross</span><span>{usd(computed.grossBefore)}</span></div>
              <div className="flex justify-between"><span>PM Fee</span><span>{usd(computed.pmBefore)}</span></div>
              <div className="flex justify-between"><span>Other Fixed (ex Mortgage)</span><span>{usd(computed.otherFixed)}</span></div>
              <div className="flex justify-between"><span>Mortgage</span><span>{usd(inputs.fixed.mortgage)}</span></div>
              <div className="flex justify-between">
                <span className="flex items-center gap-1">
                  Net Cash Flow
                  <HelpIcon title="Cash flow from your property after all operating and financing expenses" className="text-gray-400 hover:text-gray-700 cursor-help" />
                </span>
                <span>{usd(computed.netCashFlowBefore)}</span>
              </div>
              <div className="flex justify-between"><span>SDE</span><span>{usd(computed.sdeBefore)}</span></div>
              <div className="flex justify-between"><span>Enterprise Value</span><span>{usd(computed.evBefore)}</span></div>
            </div>
          </div>
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">With Interior Design</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Gross</span><span>{usd(computed.grossAfter)}</span></div>
              <div className="flex justify-between"><span>PM Fee</span><span>{usd(computed.pmAfter)}</span></div>
              <div className="flex justify-between"><span>Other Fixed (ex Mortgage)</span><span>{usd(computed.otherFixed)}</span></div>
              <div className="flex justify-between"><span>Mortgage</span><span>{usd(inputs.fixed.mortgage)}</span></div>
              <div className="flex justify-between">
                <span className="flex items-center gap-1">
                  Net Cash Flow
                  <HelpIcon title="Cash flow from your property after all operating and financing expenses" className="text-gray-400 hover:text-gray-700 cursor-help" />
                </span>
                <span>{usd(computed.netCashFlowAfter)}</span>
              </div>
              <div className="flex justify-between"><span>SDE</span><span>{usd(computed.sdeAfter)}</span></div>
              <div className="flex justify-between"><span>Enterprise Value</span><span>{usd(computed.evAfter)}</span></div>
            </div>
          </div>
        </div>
        <div className="mt-6">
          <Methodology />
        </div>
      </main>
    </div>
  );
}


