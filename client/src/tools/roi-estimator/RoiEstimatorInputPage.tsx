import { useMemo, useEffect, useState } from 'react';
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
  const [localInputs, setLocalInputs] = useState(inputs);

  useEffect(() => {
    setLocalInputs(inputs);
  }, [inputs]);

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
    setInputs(() => localInputs);
    setCurrentStep(1);
    navigate('/tools/roi-estimator/results');
  };

  const previewMetrics = [
    { label: 'Annual Net Cash Flow Gain', formattedValue: usd(computed.annualCashFlowGain), tooltip: 'Annual cash flow from your property after all operating and financing expenses' },
    { label: 'Enterprise Value Gain', formattedValue: usd(computed.enterpriseValueGain), tooltip: 'The added value of your property as a cash-generating asset, beyond its real estate value' },
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
                  <p className="text-sm text-gray-600">Enter your current and projected performance metrics and adjust annual fixed costs and key assumptions as needed to calculate your expected ROI from Interior Design, expressed as <span className="font-semibold flex items-center gap-1 inline-flex">Annual Net Cash Flow Gain<HelpIcon title="Annual cash flow from your property after all operating and financing expenses" className="text-gray-400 hover:text-gray-700 cursor-help" /></span> and <span className="font-semibold flex items-center gap-1 inline-flex">Enterprise Value Gain<HelpIcon title="The added value of your property as a cash-generating asset, beyond its real estate value" className="text-gray-400 hover:text-gray-700 cursor-help" /></span>.</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-gray-50/30 p-4 rounded-lg items-start">
                  {/* Left Column: Performance + Assumptions */}
                  <div className="space-y-6 lg:border-r lg:border-gray-200 lg:pr-6">
                    <div>
                      <h3 className="font-medium text-gray-800 mb-4">Performance</h3>

                      {/* Occupancy Without/With Interior Design */}
                      <div className="space-y-6">
                        <div>
                          <div className="flex items-center gap-1 mb-2">
                            <label className="block text-sm text-gray-600">Occupancy %</label>
                            <HelpIcon title="The average occupancy rate as the percentage of days booked" className="text-gray-400 hover:text-gray-700 cursor-help ml-1" />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Without Interior Design</label>
                              <input type="number" className="input-field-roi" value={Math.round(localInputs.occupancyBefore * 1000) / 10}
                                onChange={(e) => updateNumber('occupancyBefore', Math.max(0, Math.min(1, Number(e.target.value) / 100)))} />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">With Interior Design</label>
                              <input type="number" className="input-field-roi" value={Math.round(localInputs.occupancyAfter * 1000) / 10}
                                onChange={(e) => updateNumber('occupancyAfter', Math.max(0, Math.min(1, Number(e.target.value) / 100)))} />
                            </div>
                          </div>
                        </div>

                        {/* ADR Without/With Interior Design */}
                        <div>
                          <label className="block text-sm text-gray-600 mb-2">Average Daily Rate ($)</label>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Without Interior Design</label>
                              <input type="number" className="input-field-roi" value={localInputs.adrBefore}
                                onChange={(e) => updateNumber('adrBefore', Number(e.target.value))} />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">With Interior Design</label>
                              <input type="number" className="input-field-roi" value={localInputs.adrAfter}
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
                      <input type="number" className="input-field-roi" value={Math.round(localInputs.propertyManagementPct * 1000) / 10}
                        onChange={(e) => updateNumber('propertyManagementPct', Math.max(0, Number(e.target.value) / 100))} />
                      <div className="flex items-center gap-1 mt-4 mb-1">
                        <label className="block text-sm text-gray-600">SDE Multiple</label>
                        <HelpIcon title="The multiple used to determine enterprise value based on Seller's Discretionary Earnings (SDE)" className="text-gray-400 hover:text-gray-700 cursor-help ml-1" />
                      </div>
                      <input type="number" className="input-field-roi" value={localInputs.sdeMultiple}
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
                        <input type="number" className="input-field-roi" value={localInputs.fixed[key]}
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
                  <div className="rounded-md bg-gray-50 p-4 text-base text-left text-black space-y-3 pl-6">
                    {previewMetrics.map(({ label, formattedValue, tooltip }) => (
                      <p key={label} className={`text-base leading-tight ${label === 'Total Year One Gain' ? 'font-semibold text-green-600' : 'text-black'}`}>
                        <span className="flex items-center gap-1">
                          {`${label}${tooltip ? ':' : ':'}`}
                          {tooltip && <HelpIcon title={tooltip} className="text-gray-400 hover:text-gray-700 cursor-help" />}
                        </span>
                        <span>{formattedValue}</span>
                      </p>
                    ))}
                  </div>
                </div>

                <button onClick={goToResults} className="btn-primary w-full">Generate Full Report →</button>
                <p className="text-sm text-gray-600 text-center">
                  The full report gives you a side-by-side comparison of cash flow, SDE, enterprise value, expenses, and other key metrics for both "Without Interior Design" and "With Interior Design" scenarios.
                </p>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}


