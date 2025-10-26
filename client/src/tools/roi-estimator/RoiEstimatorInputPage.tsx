import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import ProgressBar from '../../components/ProgressBar';
import Methodology from './components/Methodology';
import { useRoiEstimatorStore } from '../../store/roiEstimatorStore';
import { computeProjection } from '../../utils/roi';
import { HelpIcon } from '../../components/Icons';

export default function RoiEstimatorInputPage() {
  const navigate = useNavigate();
  const { inputs, setInputs, setCurrentStep } = useRoiEstimatorStore();

  const computed = useMemo(() => computeProjection(inputs), [inputs]);

  const updateNumber = (path: string, value: number) => {
    setInputs((prev) => {
      if (path.startsWith('fixed.')) {
        const key = path.replace('fixed.', '') as keyof typeof prev.fixed;
        return { ...prev, fixed: { ...prev.fixed, [key]: value } };
      }
      return { ...prev, [path]: value } as typeof prev;
    });
  };

  const usd = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  const goToResults = () => {
    setCurrentStep(1);
    navigate('/tools/roi-estimator/results');
  };

  const previewMetrics = [
    { label: 'Annual Net Cash Flow Gain', formattedValue: usd(computed.annualCashFlowGain) },
    { label: 'Enterprise Value Gain', formattedValue: usd(computed.enterpriseValueGain) },
    { label: 'Total Year One Gain', formattedValue: usd(computed.totalYearOneGain) },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <Link to="/tools" className="btn-secondary">← Back</Link>
          <div className="w-64"><ProgressBar currentStep={1} totalSteps={2} /></div>
        </div>

        <div className="grid grid-cols-1 gap-6 mb-8">
          <div className="card">
            <div className="grid gap-8 md:grid-cols-[minmax(0,1.5fr),minmax(0,1.25fr)]">
              <div className="grid gap-6 md:grid-rows-[auto,1fr]">
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900 mb-4">Interior Design ROI Estimator</h1>
                  <p className="text-sm text-gray-600">Enter your current and projected performance metrics and adjust annual fixed costs and key assumptions as needed to calculate your expected ROI from Interior Design, expressed as <span className="font-semibold">Annual Net Cash Flow Gain</span> and <span className="font-semibold">Enterprise Value Gain</span>.</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-gray-50/30 p-4 rounded-lg items-start">
                  {/* Left Column: Performance + Assumptions */}
                  <div className="space-y-6 lg:border-r lg:border-gray-200 lg:pr-6">
                    <div>
                      <h3 className="font-medium text-gray-800 mb-4">Performance</h3>

                      {/* Occupancy Before/After */}
                      <div className="space-y-6">
                        <div>
                          <div className="flex items-center gap-1 mb-2">
                            <label className="block text-sm text-gray-600">Occupancy %</label>
                            <HelpIcon title="The average occupancy rate as the percentage of days booked" className="text-gray-400 hover:text-gray-700 cursor-help ml-1" />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Before</label>
                              <input type="number" className="input-field-roi" value={Math.round(inputs.occupancyBefore * 1000) / 10}
                                onChange={(e) => updateNumber('occupancyBefore', Math.max(0, Math.min(1, Number(e.target.value) / 100)))} />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">After</label>
                              <input type="number" className="input-field-roi" value={Math.round(inputs.occupancyAfter * 1000) / 10}
                                onChange={(e) => updateNumber('occupancyAfter', Math.max(0, Math.min(1, Number(e.target.value) / 100)))} />
                            </div>
                          </div>
                        </div>

                        {/* ADR Before/After */}
                        <div>
                          <label className="block text-sm text-gray-600 mb-2">Average Daily Rate ($)</label>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Before</label>
                              <input type="number" className="input-field-roi" value={inputs.adrBefore}
                                onChange={(e) => updateNumber('adrBefore', Number(e.target.value))} />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">After</label>
                              <input type="number" className="input-field-roi" value={inputs.adrAfter}
                                onChange={(e) => updateNumber('adrAfter', Number(e.target.value))} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-6">
                      <h3 className="font-medium text-gray-800 mb-2">Assumptions</h3>
                      <div className="flex items-center gap-1 mb-1">
                        <label className="block text-sm text-gray-600">Property Management Fee %</label>
                        <HelpIcon title="The percentage of gross revenue paid to the property management company" className="text-gray-400 hover:text-gray-700 cursor-help ml-1" />
                      </div>
                      <input type="number" className="input-field-roi" value={Math.round(inputs.propertyManagementPct * 1000) / 10}
                        onChange={(e) => updateNumber('propertyManagementPct', Math.max(0, Number(e.target.value) / 100))} />
                      <div className="flex items-center gap-1 mt-4 mb-1">
                        <label className="block text-sm text-gray-600">SDE Multiple</label>
                        <HelpIcon title="The multiple used to determine enterprise value based on Seller's Discretionary Earnings (SDE)" className="text-gray-400 hover:text-gray-700 cursor-help ml-1" />
                      </div>
                      <input type="number" className="input-field-roi" value={inputs.sdeMultiple}
                        onChange={(e) => updateNumber('sdeMultiple', Math.max(0, Number(e.target.value)))} />
                    </div>
                  </div>

                  {/* Right Column: Fixed Costs */}
                  <div className="lg:pl-6">
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
                </div>
              </div>

              {/* Right Column: Methodology and Summary */}
              <div className="flex flex-col gap-4 md:self-stretch">
                <div className="bg-white rounded-md p-4 border border-gray-100">
                  <Methodology />
                </div>

                {/* Gains Preview Card */}
                <div className="bg-white rounded-md p-4 border border-gray-100">
                  <div className="rounded-md bg-gray-50 p-4 text-base text-center text-black space-y-3">
                    {previewMetrics.map(({ label, formattedValue }) => (
                      <p key={label} className="text-lg leading-tight">
                        {`${label}: `}
                        <span className="font-semibold text-black">{formattedValue}</span>
                      </p>
                    ))}
                  </div>
                </div>

                <button onClick={goToResults} className="btn-primary w-full text-lg">Generate Full Report</button>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}


