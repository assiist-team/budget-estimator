export default function Methodology() {
  return (
    <div className="rounded-md bg-gray-50 p-4 text-sm text-gray-700">
      <h3 className="text-base font-semibold text-gray-900 mb-2">Methodology</h3>
      <p className="mb-2">
      Gains reflect the difference between the After and Before scenarios.
      </p>
      <ul className="list-disc pl-5 space-y-1 mb-2 text-[13px]">
        <li>Gross revenue: G = ADR × Occupancy × 365</li>
        <li>Property management fee: PM = G × PM%</li>
        <li>Other fixed costs: sum of annual taxes, insurance, utilities, maintenance, supplies</li>
        <li>Net cash flow: Net = G − PM − Mortgage − OtherFixed</li>
        <li>SDE (adds back PM and mortgage): SDE = G − OtherFixed</li>
        <li>Enterprise Value: EV = SDE × Multiple</li>
      </ul>
    </div>
  );
}


