import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';

export default function LandingPage() {
  const navigate = useNavigate();

  const handleStartEstimate = () => {
    navigate('/tools/budget-estimator/property');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            Let's Create Your Project Budget
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            We'll walk through your property details and room configurations to create a comprehensive budget that covers furnishings, design fees, and all project services.
          </p>

          {/* Process Cards */}
          <div className="max-w-6xl mx-auto mb-12">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="card text-center p-6">
                <div className="flex-shrink-0 w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-xl mx-auto mb-4">
                  1
                </div>
                <h3 className="font-semibold text-lg text-gray-900 mb-2">
                  Define Your Property
                </h3>
                <p className="text-gray-600">
                  We'll start by understanding your property's size, guest capacity, and basic requirements
                </p>
              </div>

              <div className="card text-center p-6">
                <div className="flex-shrink-0 w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-xl mx-auto mb-4">
                  2
                </div>
                <h3 className="font-semibold text-lg text-gray-900 mb-2">
                  Design Your Spaces
                </h3>
                <p className="text-gray-600">
                  Next, we'll configure each room, select appropriate sizes, and define your complete project scope
                </p>
              </div>

              <div className="card text-center p-6">
                <div className="flex-shrink-0 w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-xl mx-auto mb-4">
                  3
                </div>
                <h3 className="font-semibold text-lg text-gray-900 mb-2">
                  See Your Complete Budget
                </h3>
                <p className="text-gray-600">
                  You'll get a comprehensive budget covering furnishings, design fees, and all project services in one clear estimate
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleStartEstimate}
            className="btn-primary inline-flex items-center gap-2 text-lg px-6 py-3"
          >
            Start Creating Your Budget
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

