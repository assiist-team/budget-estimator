import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import { useAuth } from '../../context/AuthContext';

export default function RoiEstimatorLandingPage() {
  const navigate = useNavigate();
  const { firebaseUser } = useAuth();

  const handleStartCalculation = () => {
    if (!firebaseUser) {
      navigate('/sign-in', { state: { from: { pathname: '/tools/roi-estimator/inputs' } } });
      return;
    }

    navigate('/tools/roi-estimator/inputs');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            Let's Calculate Your Interior Design ROI
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-4xl mx-auto">
            Discover how interior design can boost your property's performance and create significant value through increased occupancy rates and average daily rates.
          </p>

          {/* ROI Process Cards */}
          <div className="max-w-6xl mx-auto mb-12">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="card text-center p-6">
                <div className="flex-shrink-0 w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-xl mx-auto mb-4">
                  1
                </div>
                <h3 className="font-semibold text-lg text-gray-900 mb-2">
                  Enter Your Current Performance
                </h3>
                <p className="text-gray-600">
                  Input your current occupancy rate, average daily rate, and fixed costs to establish your baseline
                </p>
              </div>

              <div className="card text-center p-6">
                <div className="flex-shrink-0 w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-xl mx-auto mb-4">
                  2
                </div>
                <h3 className="font-semibold text-lg text-gray-900 mb-2">
                  Project Your Improvements
                </h3>
                <p className="text-gray-600">
                  Set your post-interior design performance metrics to see potential impact
                </p>
              </div>

              <div className="card text-center p-6">
                <div className="flex-shrink-0 w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-xl mx-auto mb-4">
                  3
                </div>
                <h3 className="font-semibold text-lg text-gray-900 mb-2">
                  See Your ROI Results
                </h3>
                <p className="text-gray-600">
                  Get a detailed breakdown of your ROI, expressed as the expected value added by interior design services
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleStartCalculation}
            className="btn-primary inline-flex items-center gap-2 text-lg px-6 py-3"
          >
            Start ROI Calculation
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-24 py-8 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-600">
            © 2025 1584 Interior Design. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
