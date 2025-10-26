import { useMemo } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import Header from '../../components/Header';
import ProgressBar from '../../components/ProgressBar';
import Methodology from './components/Methodology';
import { useRoiEstimatorStore } from '../../store/roiEstimatorStore';
import { computeProjection } from '../../utils/roi';
import { db, auth } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';

export default function RoiEstimatorResultsPage() {
  const { inputs } = useRoiEstimatorStore();
  const computed = useMemo(() => computeProjection(inputs), [inputs]);
  const { firebaseUser } = useAuth();

  const usd = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const pct = (n: number) => `${Math.round(n * 1000) / 10}%`;

  const saveProjection = async () => {
    if (!firebaseUser) return;
    const docRef = await addDoc(collection(db, 'projections'), {
      toolId: 'roi-estimator',
      ownerUid: auth.currentUser?.uid ?? null,
      inputs,
      computed,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    window.location.assign(`/tools/roi-estimator/projection/view/${docRef.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <Link to="/tools/roi-estimator" className="btn-secondary">← Back to Input</Link>
          <div className="w-64"><ProgressBar currentStep={2} totalSteps={2} /></div>
        </div>

        <div className="card mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Results Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-4 rounded bg-white border">
              <div className="text-gray-600">Total Year One Gain</div>
              <div className="text-2xl font-bold text-primary-700">{usd(computed.totalYearOneGain)}</div>
            </div>
            <div className="p-4 rounded bg-white border">
              <div className="text-gray-600">Annual Cash Flow Gain</div>
              <div className="text-2xl font-semibold">{usd(computed.annualCashFlowGain)}</div>
            </div>
            <div className="p-4 rounded bg-white border">
              <div className="text-gray-600">Enterprise Value Gain</div>
              <div className="text-2xl font-semibold">{usd(computed.enterpriseValueGain)}</div>
            </div>
          </div>
          <button onClick={saveProjection} className="btn-primary mt-4" disabled={!firebaseUser}>Save Projection</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Before</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Occupancy</span><span>{pct(inputs.occupancyBefore)}</span></div>
              <div className="flex justify-between"><span>ADR</span><span>{usd(inputs.adrBefore)}</span></div>
              <div className="flex justify-between"><span>Gross</span><span>{usd(computed.grossBefore)}</span></div>
              <div className="flex justify-between"><span>PM Fee</span><span>{usd(computed.pmBefore)}</span></div>
              <div className="flex justify-between"><span>Other Fixed (ex Mortgage)</span><span>{usd(computed.otherFixed)}</span></div>
              <div className="flex justify-between"><span>Mortgage</span><span>{usd(inputs.fixed.mortgage)}</span></div>
              <div className="flex justify-between"><span>Net Cash Flow</span><span>{usd(computed.netCashFlowBefore)}</span></div>
              <div className="flex justify-between"><span>SDE</span><span>{usd(computed.sdeBefore)}</span></div>
              <div className="flex justify-between"><span>Enterprise Value</span><span>{usd(computed.evBefore)}</span></div>
            </div>
          </div>
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">After</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Occupancy</span><span>{pct(inputs.occupancyAfter)}</span></div>
              <div className="flex justify-between"><span>ADR</span><span>{usd(inputs.adrAfter)}</span></div>
              <div className="flex justify-between"><span>Gross</span><span>{usd(computed.grossAfter)}</span></div>
              <div className="flex justify-between"><span>PM Fee</span><span>{usd(computed.pmAfter)}</span></div>
              <div className="flex justify-between"><span>Other Fixed (ex Mortgage)</span><span>{usd(computed.otherFixed)}</span></div>
              <div className="flex justify-between"><span>Mortgage</span><span>{usd(inputs.fixed.mortgage)}</span></div>
              <div className="flex justify-between"><span>Net Cash Flow</span><span>{usd(computed.netCashFlowAfter)}</span></div>
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


