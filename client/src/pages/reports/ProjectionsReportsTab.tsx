import { useEffect, useState } from 'react';
import { collection, getDocs, doc, deleteDoc, limit, orderBy, query, where } from 'firebase/firestore';
import { Link, useLocation } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';

interface ProjectionRow {
  id: string;
  inputs: any;
  computed: any;
  createdAt?: any;
  ownerUid?: string;
}

interface Props {
  onCountChange?: (count: number) => void;
}

export default function ProjectionsReportsTab({ onCountChange }: Props) {
  const { firebaseUser, isAdmin } = useAuth();
  const [rows, setRows] = useState<ProjectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

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

  useEffect(() => {
    void fetchRows();
  }, [firebaseUser, isAdmin, onCountChange]);

  const handleDeleteProjection = async (projectionId: string, occupancyInfo: string) => {
    if (!confirm(`Are you sure you want to delete this projection (${occupancyInfo})? This action cannot be undone.`)) {
      return;
    }

    try {
      const projectionRef = doc(db, 'projections', projectionId);
      await deleteDoc(projectionRef);
      
      // Refresh the list
      await fetchRows();
    } catch (error) {
      console.error('Error deleting projection:', error);
      alert('Failed to delete projection. Please try again.');
    }
  };

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
              <div className="flex flex-col md:flex-row md:items-start md:justify-between">
                <div className="flex-1">
                  {row.createdAt?.seconds && (
                    <div className="text-sm text-gray-500 mb-1">
                      {new Date(row.createdAt.seconds * 1000).toLocaleDateString()}
                    </div>
                  )}
                  <div className="font-semibold text-gray-800">
                    <span className="block sm:inline">
                      Occupancy: {Math.round((row.inputs?.occupancyBefore ?? 0) * 100)}% →{' '}
                      {Math.round((row.inputs?.occupancyAfter ?? 0) * 100)}%
                    </span>
                    <span className="hidden sm:inline font-normal text-gray-400 mx-2">|</span>
                    <span className="block sm:inline">
                      ADR: ${row.inputs?.adrBefore} → ${row.inputs?.adrAfter}
                    </span>
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
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-4 md:mt-0 justify-center md:justify-start">
                  <Link
                    to={`/tools/roi-estimator/projection/view/${row.id}`}
                    state={{ from: { pathname: location.pathname, search: location.search } }}
                    className="btn-secondary w-full sm:w-auto"
                  >
                    View
                  </Link>
                  <Link
                    to={`/tools/roi-estimator/projection/edit/${row.id}`}
                    state={{ from: { pathname: location.pathname, search: location.search } }}
                    className="btn-primary w-full sm:w-auto"
                  >
                    Edit
                  </Link>
                  {(isAdmin || row.ownerUid === firebaseUser?.uid) && (
                    <button
                      onClick={() => handleDeleteProjection(row.id, `${Math.round((row.inputs?.occupancyBefore ?? 0) * 100)}% → ${Math.round((row.inputs?.occupancyAfter ?? 0) * 100)}%`)}
                      className="btn-danger w-full sm:w-auto"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


