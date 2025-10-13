import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Link } from 'react-router-dom';
import type { Estimate } from '../types';
import { formatCurrency } from '../utils/calculations';

export default function AdminPage() {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEstimates() {
      try {
        const q = query(
          collection(db, 'estimates'),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
        
        const querySnapshot = await getDocs(q);
        const data: Estimate[] = [];
        
        querySnapshot.forEach((doc) => {
          const docData = doc.data();
          data.push({
            id: doc.id,
            ...docData,
            createdAt: docData.createdAt?.toDate ? docData.createdAt.toDate() : docData.createdAt,
            updatedAt: docData.updatedAt?.toDate ? docData.updatedAt.toDate() : docData.updatedAt,
            submittedAt: docData.submittedAt?.toDate ? docData.submittedAt.toDate() : docData.submittedAt,
          } as Estimate);
        });
        
        setEstimates(data);
      } catch (error) {
        console.error('Error fetching estimates:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchEstimates();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading estimates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-primary-800">
              Admin Dashboard
            </h1>
            <Link to="/" className="btn-secondary">
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Recent Estimates
          </h2>
          <p className="text-gray-600">
            {estimates.length} estimate{estimates.length !== 1 ? 's' : ''} submitted
          </p>
        </div>

        {estimates.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-600 text-lg">
              No estimates submitted yet
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {estimates.map((estimate) => (
              <div key={estimate.id} className="card hover:shadow-xl transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {estimate.clientInfo.firstName} {estimate.clientInfo.lastName}
                      </h3>
                      <span className={`
                        px-3 py-1 rounded-full text-xs font-medium
                        ${estimate.status === 'submitted' ? 'bg-blue-100 text-blue-800' : ''}
                        ${estimate.status === 'viewed' ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${estimate.status === 'contacted' ? 'bg-green-100 text-green-800' : ''}
                      `}>
                        {estimate.status}
                      </span>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">
                          <span className="font-medium">Email:</span> {estimate.clientInfo.email}
                        </p>
                        {estimate.clientInfo.phone && (
                          <p className="text-gray-600">
                            <span className="font-medium">Phone:</span> {estimate.clientInfo.phone}
                          </p>
                        )}
                        <p className="text-gray-600">
                          <span className="font-medium">Property:</span>{' '}
                          {estimate.propertySpecs.squareFootage.toLocaleString()} sqft, 
                          {' '}{estimate.propertySpecs.guestCapacity} guests
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-gray-600">
                          <span className="font-medium">Rooms:</span> {estimate.rooms.length}
                        </p>
                        <p className="text-gray-600">
                          <span className="font-medium">Budget Range:</span>{' '}
                          {formatCurrency(estimate.budget.rangeLow)} - {formatCurrency(estimate.budget.rangeHigh)}
                        </p>
                        <p className="text-gray-600">
                          <span className="font-medium">Submitted:</span>{' '}
                          {estimate.submittedAt?.toLocaleDateString() || 'N/A'}
                        </p>
                      </div>
                    </div>

                    {estimate.propertySpecs.notes && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Notes:</span> {estimate.propertySpecs.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

