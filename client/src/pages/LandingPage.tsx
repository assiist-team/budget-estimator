import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';

export default function LandingPage() {
  const navigate = useNavigate();

  const handleStartEstimate = () => {
    navigate('/property');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-primary-800 mb-6">
            Get Your Project Budget Estimate
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Professional interior design estimates in minutes. 
            See costs across all quality levels instantly.
          </p>
          <button 
            onClick={handleStartEstimate}
            className="btn-primary inline-flex items-center gap-2"
          >
            Start Your Estimate
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="card text-center">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Fast & Easy</h3>
            <p className="text-gray-600">
              Get instant estimates with just a few clicks. No lengthy forms or complicated processes.
            </p>
          </div>

          <div className="card text-center">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Complete Range</h3>
            <p className="text-gray-600">
              See estimates from budget-friendly to high-end luxury across all quality tiers.
            </p>
          </div>

          <div className="card text-center">
            <div className="text-4xl mb-4">🎨</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Fully Custom</h3>
            <p className="text-gray-600">
              Tailored to your exact property specifications and design requirements.
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
            How It Works
          </h2>
          
          <div className="space-y-6">
            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-10 h-10 bg-accent-600 text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold text-lg text-gray-900 mb-1">
                  Tell us about your property
                </h3>
                <p className="text-gray-600">
                  Enter basic details like square footage and guest capacity
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-10 h-10 bg-accent-600 text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold text-lg text-gray-900 mb-1">
                  Select your rooms and sizes
                </h3>
                <p className="text-gray-600">
                  Choose which rooms to furnish and their sizes
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-10 h-10 bg-accent-600 text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold text-lg text-gray-900 mb-1">
                  Get estimates across all quality levels
                </h3>
                <p className="text-gray-600">
                  Receive a detailed PDF with budget ranges from $X to $Y
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <div className="inline-block bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-gray-600 mb-6">
              It only takes a few minutes to get your estimate
            </p>
            <button 
              onClick={handleStartEstimate}
              className="btn-primary"
            >
              Start Your Estimate →
            </button>
          </div>
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

