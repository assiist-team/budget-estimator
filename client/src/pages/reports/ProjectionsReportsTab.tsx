import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { Link } from 'react-router-dom';
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
  const [search, setSearch] = useState('');

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

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => {
      const fields = [
        r.inputs?.adrBefore,
        r.inputs?.adrAfter,
        r.inputs?.occupancyBefore,
        r.inputs?.occupancyAfter,
      ]
        .filter((v) => v !== undefined && v !== null)
        .map((v) => String(v).toLowerCase());
      return fields.some((v) => v.includes(term));
    });
  }, [rows, search]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input w-full md:w-80"
          placeholder="Search by ADR/occupancy"
        />
      </div>

      {loading ? (
        <div className="text-gray-600">Loading projections…</div>
      ) : filtered.length === 0 ? (
        <div className="card">No projections found.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((row) => (
            <div key={row.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-gray-900">ADR ${row.inputs?.adrBefore} → ${row.inputs?.adrAfter}</div>
                  <div className="text-sm text-gray-600">Occ {Math.round((row.inputs?.occupancyBefore ?? 0) * 100)}% → {Math.round((row.inputs?.occupancyAfter ?? 0) * 100)}%</div>
                  {typeof row.computed?.annualCashFlowGain === 'number' ? (
                    <div className="text-sm text-gray-700">
                      Cash Flow Gain: {row.computed.annualCashFlowGain.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
                    </div>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Link to={`/tools/roi-estimator/projection/view/${row.id}`} className="btn-secondary">View</Link>
                  <Link to={`/tools/roi-estimator/projection/edit/${row.id}`} className="btn-primary">Edit</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


