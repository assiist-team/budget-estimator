import { useEffect, useState } from 'react';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { Link, useLocation } from 'react-router-dom';
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
  const location = useLocation();

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

  if (!firebaseUser) {
    return null;
  }

  return (
    <div>
      {loading ? (
        <div className="text-gray-600">Loading estimates…</div>
      ) : estimates.length === 0 ? (
        <div className="card">No estimates found.</div>
      ) : (
        <div className="space-y-3">
          {estimates.map((estimate) => (
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
                    state={{ from: { pathname: location.pathname, search: location.search } }}
                    className="btn-secondary"
                  >
                    View
                  </Link>
                  <Link
                    to={`/tools/budget-estimator/estimate/edit/${estimate.id}`}
                    state={{ from: { pathname: location.pathname, search: location.search } }}
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


