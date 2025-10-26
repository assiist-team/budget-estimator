import { useMemo, useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import { db, auth } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { computeProjection, type RoiInputs } from '../../utils/roi';
import { HelpIcon } from '../../components/Icons';

export default function RoiEstimatorPage() {
  const navigate = useNavigate();
  const { firebaseUser } = useAuth();

  const [inputs, setInputs] = useState<RoiInputs>({
    fixed: {
      mortgage: 30000,
      propertyTaxes: 3300,
      insurance: 1400,
      utilities: 10800,
      maintenance: 6000,
      supplies: 2000,
    },
    occupancyBefore: 0.43,
    occupancyAfter: 0.7,
    adrBefore: 300,
    adrAfter: 300,
    propertyManagementPct: 0.15,
    sdeMultiple: 3,
  });

  const computed = useMemo(() => computeProjection(inputs), [inputs]);

  const updateNumber = (path: (keyof RoiInputs) | string, value: number) => {
    setInputs((prev) => {
      // shallow immutable update for nested fixed
      if (path.startsWith('fixed.')) {
        const key = path.replace('fixed.', '') as keyof typeof prev.fixed;
        return { ...prev, fixed: { ...prev.fixed, [key]: value } };
      }
      return { ...prev, [path]: value } as RoiInputs;
    });
  };

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
    navigate(`/tools/roi-estimator/projection/view/${docRef.id}`);
  };

  const pct = (n: number) => `${Math.round(n * 1000) / 10}%`;
  const usd = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <Link to="/tools" className="btn-secondary">← Back</Link>
          <button onClick={saveProjection} className="btn-primary" disabled={!firebaseUser}>Save Projection</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="card lg:col-span-2">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Inputs</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="pr-4">
                <h3 className="font-medium text-gray-800 mb-2">Without Interior Design</h3>
                <label className="block text-sm text-gray-600 mb-1">Occupancy % (Without Interior Design)</label>
                <input type="number" className="input-field-roi" value={Math.round(inputs.occupancyBefore * 1000) / 10}
                  onChange={(e) => updateNumber('occupancyBefore', Math.max(0, Math.min(1, Number(e.target.value) / 100)))} />
                <label className="block text-sm text-gray-600 mt-4 mb-1">Average Daily Rate ($) (Without Interior Design)</label>
                <input type="number" className="input-field-roi" value={inputs.adrBefore}
                  onChange={(e) => updateNumber('adrBefore', Number(e.target.value))} />
              </div>
              <div className="pr-4">
                <h3 className="font-medium text-gray-800 mb-2">With Interior Design</h3>
                <label className="block text-sm text-gray-600 mb-1">Occupancy % (With Interior Design)</label>
                <input type="number" className="input-field-roi" value={Math.round(inputs.occupancyAfter * 1000) / 10}
                  onChange={(e) => updateNumber('occupancyAfter', Math.max(0, Math.min(1, Number(e.target.value) / 100)))} />
                <label className="block text-sm text-gray-600 mt-4 mb-1">Average Daily Rate ($) (With Interior Design)</label>
                <input type="number" className="input-field-roi" value={inputs.adrAfter}
                  onChange={(e) => updateNumber('adrAfter', Number(e.target.value))} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="pr-4">
                <h3 className="font-medium text-gray-800 mb-2">Fixed Costs (Annual)</h3>
                {([
                  ['mortgage', 'Mortgage'],
                  ['propertyTaxes', 'Property Taxes'],
                  ['insurance', 'Insurance'],
                  ['utilities', 'Utilities'],
                  ['maintenance', 'Maintenance'],
                  ['supplies', 'Supplies'],
                ] as const).map(([key, label]) => (
                  <div key={key} className="mb-3">
                    <label className="block text-sm text-gray-600 mb-1">{label}</label>
                    <input type="number" className="input-field-roi" value={inputs.fixed[key]}
                      onChange={(e) => updateNumber(`fixed.${key}`, Number(e.target.value))} />
                  </div>
                ))}
              </div>
              <div className="pr-4">
                <h3 className="font-medium text-gray-800 mb-2">Assumptions</h3>
                <label className="block text-sm text-gray-600 mb-1">Property Management Fee %</label>
                <input type="number" className="input-field-roi" value={Math.round(inputs.propertyManagementPct * 1000) / 10}
                  onChange={(e) => updateNumber('propertyManagementPct', Math.max(0, Number(e.target.value) / 100))} />
                <label className="block text-sm text-gray-600 mt-4 mb-1">SDE Multiple</label>
                <input type="number" className="input-field-roi" value={inputs.sdeMultiple}
                  onChange={(e) => updateNumber('sdeMultiple', Math.max(0, Number(e.target.value)))} />
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Occupancy</span><span>{pct(inputs.occupancyBefore)} → {pct(inputs.occupancyAfter)}</span></div>
              <div className="flex justify-between"><span>ADR</span><span>{usd(inputs.adrBefore)} → {usd(inputs.adrAfter)}</span></div>
              <div className="flex justify-between"><span>PM Fee %</span><span>{pct(inputs.propertyManagementPct)}</span></div>
              <div className="flex justify-between"><span>SDE Multiple</span><span>{inputs.sdeMultiple}×</span></div>
            </div>
            <div className="mt-4 border-t pt-4 space-y-2 text-sm">
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
      </main>
    </div>
  );
}


