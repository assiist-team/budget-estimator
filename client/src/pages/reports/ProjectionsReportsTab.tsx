import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { Link, useLocation } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';

interface ProjectionRow {
  id: string;
  inputs: any;
  computed: any;
  createdAt?: any;
}

interface Props {
  onCountChange?: (count: number) => void;
}

export default function ProjectionsReportsTab({ onCountChange }: Props) {
  const { firebaseUser, isAdmin } = useAuth();
  const [rows, setRows] = useState<ProjectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const fetchRows = async () => {
      if (!firebaseUser) return;
      setLoading(true);
      try {
        const base = collection(db, 'projections');
        const q = isAdmin
          ? query(
              base,
              where('toolId', '==', 'roi-estimator'),
              orderBy('createdAt', 'desc'),
              limit(50)
            )
          : query(
              base,
              where('ownerUid', '==', firebaseUser.uid),
              where('toolId', '==', 'roi-estimator'),
              orderBy('createdAt', 'desc'),
              limit(50)
            );
        const snap = await getDocs(q);
        const list: ProjectionRow[] = [];
        snap.forEach((doc) => list.push({ id: doc.id, ...(doc.data() as any) }));
        setRows(list);
        onCountChange?.(list.length);
      } finally {
        setLoading(false);
      }
    };
    void fetchRows();
  }, [firebaseUser, isAdmin, onCountChange]);

  return (
    <div>
      {loading ? (
        <div className="text-gray-600">Loading projections…</div>
      ) : rows.length === 0 ? (
        <div className="card">No projections found.</div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  {row.createdAt?.seconds && (
                    <div className="text-sm text-gray-500 mb-1">
                      {new Date(row.createdAt.seconds * 1000).toLocaleDateString()}
                    </div>
                  )}
                  <div className="font-semibold text-gray-800">
                    Occupancy: {Math.round((row.inputs?.occupancyBefore ?? 0) * 100)}% →{' '}
                    {Math.round((row.inputs?.occupancyAfter ?? 0) * 100)}%
                    <span className="font-normal text-gray-400 mx-2">|</span>
                    ADR: ${row.inputs?.adrBefore} → ${row.inputs?.adrAfter}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {typeof row.computed?.annualCashFlowGain === 'number' && (
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-gray-600">Cash Flow Gain:</span>
                        <span className="text-gray-900">
                          {row.computed.annualCashFlowGain.toLocaleString('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            maximumFractionDigits: 0,
                          })}
                        </span>
                      </div>
                    )}
                    {typeof row.computed?.enterpriseValueGain === 'number' && (
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-gray-600">Ent. Value Gain:</span>
                        <span className="text-gray-900">
                          {row.computed.enterpriseValueGain.toLocaleString('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            maximumFractionDigits: 0,
                          })}
                        </span>
                      </div>
                    )}
                    {typeof row.computed?.totalYearOneGain === 'number' && (
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-gray-600">Total Y1 Gain:</span>
                        <span className="font-bold text-green-700">
                          {row.computed.totalYearOneGain.toLocaleString('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            maximumFractionDigits: 0,
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/tools/roi-estimator/projection/view/${row.id}`}
                    state={{ from: { pathname: location.pathname, search: location.search } }}
                    className="btn-secondary"
                  >
                    View
                  </Link>
                  <Link
                    to={`/tools/roi-estimator/projection/edit/${row.id}`}
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


