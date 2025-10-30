import { useEffect, useState, useMemo } from 'react';
import { collection, getDocs, doc, getDoc, limit, orderBy, query, where } from 'firebase/firestore';
import { Link, useLocation } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import type { Estimate, RoomTemplate, Item } from '../../types';
import { formatCurrency, calculateTotalRooms, calculateTotalItems, calculateEstimate } from '../../utils/calculations';
import { useRoomTemplates } from '../../hooks/useRoomTemplates';
import type { BudgetDefaults } from '../../types';

interface Props {
  onCountChange?: (count: number) => void;
}

export default function EstimatesReportsTab({ onCountChange }: Props) {
  const { firebaseUser, isAdmin } = useAuth();
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const { roomTemplates, items } = useRoomTemplates();
  const [budgetDefaults, setBudgetDefaults] = useState<BudgetDefaults | null>(null);
  const [defaultsLoading, setDefaultsLoading] = useState(true);

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
    const loadBudgetDefaults = async () => {
      setDefaultsLoading(true);
      try {
        const docRef = doc(collection(db, 'config'), 'budgetDefaults');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setBudgetDefaults({
            installationCents: data.installationCents || 0,
            fuelCents: data.fuelCents || 0,
            storageAndReceivingCents: data.storageAndReceivingCents || 0,
            kitchenCents: data.kitchenCents || 0,
            propertyManagementCents: data.propertyManagementCents || 0,
            designFeeRatePerSqftCents: data.designFeeRatePerSqftCents || 1000,
          });
        } else {
          setBudgetDefaults({
            installationCents: 0,
            fuelCents: 0,
            storageAndReceivingCents: 0,
            kitchenCents: 0,
            propertyManagementCents: 0,
            designFeeRatePerSqftCents: 1000,
          });
        }
      } catch (error) {
        console.error('Error loading budget defaults from Firestore:', error);
        setBudgetDefaults({
          installationCents: 0,
          fuelCents: 0,
          storageAndReceivingCents: 0,
          kitchenCents: 0,
          propertyManagementCents: 0,
          designFeeRatePerSqftCents: 1000,
        });
      } finally {
        setDefaultsLoading(false);
      }
    };

    void loadBudgetDefaults();
  }, []);

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
          } as unknown as Estimate);
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
      {loading || defaultsLoading ? (
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
              propertySpecs: estimate.propertySpecs,
              budgetDefaults: budgetDefaults || undefined,
            }) : null;

            const displayRangeLow = budget && 'projectRange' in budget ? budget.projectRange.low : budget?.rangeLow;
            const displayRangeHigh = budget && 'projectRange' in budget ? budget.projectRange.mid : budget?.rangeHigh;

            return (
              <div key={estimate.id} className="card">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between">
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
                    {budget && displayRangeLow != null && displayRangeHigh != null && (displayRangeLow > 0 || displayRangeHigh > 0) && (
                      <div className="mb-3">
                        <div className="text-lg font-semibold text-primary-700">
                          {formatCurrency(displayRangeLow)} — {formatCurrency(displayRangeHigh)}
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
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-4 md:mt-0 md:ml-4 justify-center md:justify-start">
                    <Link
                      to={`/tools/budget-estimator/estimate/view/${estimate.id}`}
                      state={{ from: { pathname: location.pathname, search: location.search } }}
                      className="btn-secondary w-full sm:w-auto"
                    >
                      View
                    </Link>
                    <Link
                      to={`/tools/budget-estimator/estimate/edit/${estimate.id}`}
                      state={{ from: { pathname: location.pathname, search: location.search } }}
                      className="btn-primary w-full sm:w-auto"
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


