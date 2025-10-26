import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import type { Estimate } from '../../types';

interface Props {
  onCountChange?: (count: number) => void;
}

export default function EstimatesReportsTab({ onCountChange }: Props) {
  const { firebaseUser, isAdmin } = useAuth();
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchEstimates = async () => {
      if (!firebaseUser) return;
      setLoading(true);
      try {
        const base = collection(db, 'estimates');
        const q = isAdmin
          ? query(
              base,
              where('toolId', '==', 'budget-estimator'),
              orderBy('createdAt', 'desc'),
              limit(50)
            )
          : query(
              base,
              where('ownerUid', '==', firebaseUser.uid),
              where('toolId', '==', 'budget-estimator'),
              orderBy('createdAt', 'desc'),
              limit(50)
            );
        const snap = await getDocs(q);
        const rows: Estimate[] = [] as any;
        snap.forEach((doc) => rows.push({ id: doc.id, ...(doc.data() as any) }));
        setEstimates(rows);
        onCountChange?.(rows.length);
      } finally {
        setLoading(false);
      }
    };
    void fetchEstimates();
  }, [firebaseUser, isAdmin, onCountChange]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return estimates;
    return estimates.filter((e) =>
      [
        e.clientInfo.firstName,
        e.clientInfo.lastName,
        e.clientInfo.email,
        String(e.propertySpecs?.squareFootage ?? ''),
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term))
    );
  }, [search, estimates]);

  if (!firebaseUser) {
    return null;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input w-full md:w-80"
          placeholder="Search by name, email, or sqft"
        />
      </div>

      {loading ? (
        <div className="text-gray-600">Loading estimates…</div>
      ) : filtered.length === 0 ? (
        <div className="card">No estimates found.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((estimate) => (
            <div key={estimate.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-gray-900">
                    {estimate.clientInfo.firstName} {estimate.clientInfo.lastName}
                  </div>
                  <div className="text-sm text-gray-600">
                    {estimate.clientInfo.email}
                    {estimate.propertySpecs?.squareFootage ? (
                      <span> • {estimate.propertySpecs.squareFootage.toLocaleString()} sqft</span>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/tools/budget-estimator/estimate/view/${estimate.id}`}
                    className="btn-secondary"
                  >
                    View
                  </Link>
                  <Link
                    to={`/tools/budget-estimator/estimate/edit/${estimate.id}`}
                    className="btn-primary"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


