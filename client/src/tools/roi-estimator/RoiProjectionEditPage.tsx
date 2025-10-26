import { useEffect, useMemo, useState } from 'react';
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../../components/Header';
import { db } from '../../lib/firebase';
import { computeProjection, type RoiInputs } from '../../utils/roi';

interface ProjectionDoc {
  inputs: RoiInputs;
}

export default function RoiProjectionEditPage() {
  const navigate = useNavigate();
  const { projectionId } = useParams<{ projectionId: string }>();
  const [inputs, setInputs] = useState<RoiInputs | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjection = async () => {
      if (!projectionId) return;
      setLoading(true);
      try {
        const ref = doc(db, 'projections', projectionId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data() as ProjectionDoc;
          setInputs(data.inputs);
        }
      } finally {
        setLoading(false);
      }
    };
    void fetchProjection();
  }, [projectionId]);

  const computed = useMemo(() => (inputs ? computeProjection(inputs) : null), [inputs]);

  const updateNumber = (path: string, value: number) => {
    setInputs((prev) => {
      if (!prev) return prev;
      if (path.startsWith('fixed.')) {
        const key = path.replace('fixed.', '') as keyof typeof prev.fixed;
        return { ...prev, fixed: { ...prev.fixed, [key]: value } } as RoiInputs;
      }
      return { ...prev, [path]: value } as RoiInputs;
    });
  };

  const save = async () => {
    if (!projectionId || !inputs) return;
    setSaving(true);
    try {
      const ref = doc(db, 'projections', projectionId);
      await updateDoc(ref, {
        inputs,
        computed: computeProjection(inputs),
        updatedAt: serverTimestamp(),
      });
      navigate(`/tools/roi-estimator/projection/view/${projectionId}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !inputs) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading projection…</p>
        </div>
      </div>
    );
  }

  const numInput = (
    id: string,
    label: string,
    value: number,
    onChange: (v: number) => void,
    step = 1
  ) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm text-gray-700">{label}</label>
      <input
        id={id}
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="input"
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate(-1)} className="btn-secondary">← Back</button>
          <button onClick={save} className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {numInput('adrBefore', 'ADR Before ($/night)', inputs.adrBefore, (v) => updateNumber('adrBefore', v))}
          {numInput('adrAfter', 'ADR After ($/night)', inputs.adrAfter, (v) => updateNumber('adrAfter', v))}
          {numInput('occBefore', 'Occupancy Before (0..1)', inputs.occupancyBefore, (v) => updateNumber('occupancyBefore', v), 0.01)}
          {numInput('occAfter', 'Occupancy After (0..1)', inputs.occupancyAfter, (v) => updateNumber('occupancyAfter', v), 0.01)}
          {numInput('pmPct', 'Property Mgmt % (0..1)', inputs.propertyManagementPct, (v) => updateNumber('propertyManagementPct', v), 0.01)}
          {numInput('sdeMultiple', 'SDE Multiple', inputs.sdeMultiple, (v) => updateNumber('sdeMultiple', v), 0.1)}

          {numInput('mortgage', 'Mortgage ($/yr)', inputs.fixed.mortgage, (v) => updateNumber('fixed.mortgage', v))}
          {numInput('taxes', 'Property Taxes ($/yr)', inputs.fixed.propertyTaxes, (v) => updateNumber('fixed.propertyTaxes', v))}
          {numInput('insurance', 'Insurance ($/yr)', inputs.fixed.insurance, (v) => updateNumber('fixed.insurance', v))}
          {numInput('utilities', 'Utilities ($/yr)', inputs.fixed.utilities, (v) => updateNumber('fixed.utilities', v))}
          {numInput('maintenance', 'Maintenance ($/yr)', inputs.fixed.maintenance, (v) => updateNumber('fixed.maintenance', v))}
          {numInput('supplies', 'Supplies ($/yr)', inputs.fixed.supplies, (v) => updateNumber('fixed.supplies', v))}
        </div>

        {computed && (
          <div className="card mt-8">
            <div className="font-semibold mb-2">Recomputed Summary</div>
            <div className="grid md:grid-cols-2 gap-3 text-sm text-gray-700">
              <div>Gross Before: {computed.grossBefore.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}</div>
              <div>Gross After: {computed.grossAfter.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}</div>
              <div>Cash Flow Before: {computed.netCashFlowBefore.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}</div>
              <div>Cash Flow After: {computed.netCashFlowAfter.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}</div>
              <div>Annual Cash Flow Gain: {computed.annualCashFlowGain.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}</div>
              <div>EV Gain: {computed.enterpriseValueGain.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}</div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}


