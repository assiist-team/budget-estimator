import { useEffect, useState, useMemo } from 'react';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { Link, useLocation } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import type { Estimate, RoomTemplate, Item } from '../../types';
import { formatCurrency, calculateTotalRooms, calculateTotalItems, calculateEstimate } from '../../utils/calculations';
import { useRoomTemplates } from '../../hooks/useRoomTemplates';

interface Props {
  onCountChange?: (count: number) => void;
}

export default function EstimatesReportsTab({ onCountChange }: Props) {
  const { firebaseUser, isAdmin } = useAuth();
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const { roomTemplates, items } = useRoomTemplates();

  // Convert arrays to Maps for calculation functions
  const roomTemplatesMap = useMemo(() => {
    const map = new Map<string, RoomTemplate>();
    roomTemplates.forEach(template => map.set(template.id, template));
    return map;
  }, [roomTemplates]);

  const itemsMap = useMemo(() => {
    const map = new Map<string, Item>();
    items.forEach(item => map.set(item.id, item));
    return map;
  }, [items]);

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
        const rows: Estimate[] = [];
        snap.forEach((doc) => {
          const docData = doc.data();
          rows.push({
            id: doc.id,
            ...docData,
            toolId: docData.toolId ?? 'budget-estimator',
            createdAt: docData.createdAt?.toDate ? docData.createdAt.toDate() : docData.createdAt,
            updatedAt: docData.updatedAt?.toDate ? docData.updatedAt.toDate() : docData.updatedAt,
            submittedAt: docData.submittedAt?.toDate ? docData.submittedAt.toDate() : docData.submittedAt,
          } as Estimate);
        });
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
          {estimates.map((estimate) => {
            // Calculate metrics for this estimate
            const totalRooms = calculateTotalRooms(estimate.rooms || []);
            const totalItems = calculateTotalItems(estimate.rooms || [], roomTemplatesMap, itemsMap);

            // Calculate budget using the same function as the rest of the system
            const budget = estimate.rooms?.length ? calculateEstimate(estimate.rooms, roomTemplatesMap, itemsMap, {
              propertySpecs: estimate.propertySpecs
            }) : null;

            return (
              <div key={estimate.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Date and Client Info */}
                    <div className="mb-2">
                      <div className="text-sm text-gray-500 mb-1">
                        {estimate.createdAt ? new Date(estimate.createdAt).toLocaleDateString() : 'No date'}
                      </div>
                      <div className="font-semibold text-gray-900">
                        {estimate.clientInfo.firstName} {estimate.clientInfo.lastName}
                      </div>
                    </div>

                    {/* Email */}
                    <div className="text-sm text-gray-600 mb-3">
                      {estimate.clientInfo.email}
                    </div>

                    {/* Budget Range */}
                    {budget && budget.rangeLow >= 0 && budget.rangeHigh >= 0 && (budget.rangeLow > 0 || budget.rangeHigh > 0) && (
                      <div className="mb-3">
                        <div className="text-lg font-semibold text-primary-700">
                          {formatCurrency(budget.rangeLow)} — {formatCurrency(budget.rangeHigh)}
                        </div>
                        <div className="text-xs text-gray-500">Estimated Budget Range</div>
                      </div>
                    )}

                    {/* Property Details */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="font-medium text-gray-700">Square Footage</div>
                        <div className="text-gray-600">
                          {estimate.propertySpecs?.squareFootage
                            ? `${estimate.propertySpecs.squareFootage.toLocaleString()} sqft`
                            : 'Not specified'}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-700">Guest Capacity</div>
                        <div className="text-gray-600">
                          {estimate.propertySpecs?.guestCapacity
                            ? estimate.propertySpecs.guestCapacity
                            : 'Not specified'}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-700">Rooms</div>
                        <div className="text-gray-600">
                          {totalRooms} room{totalRooms !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-700">Items</div>
                        <div className="text-gray-600">
                          {totalItems} item{totalItems !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 ml-4">
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
            );
          })}
        </div>
      )}
    </div>
  );
}


