import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';

export default function LandingPage() {
  const navigate = useNavigate();

  const handleStartEstimate = () => {
    navigate('/property');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            Get Your Project Budget Estimate
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Discover a complete project budget—including furnishings, design fees, and every key service—for your vacation rental.
          </p>
          <button
            onClick={handleStartEstimate}
            className="btn-primary inline-flex items-center gap-2 text-lg px-6 py-3"
          >
            Get Your Estimate
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* How It Works */}
        <div className="max-w-6xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            How It Works
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="card text-center p-6">
              <div className="flex-shrink-0 w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-xl mx-auto mb-4">
                1
              </div>
              <h3 className="font-semibold text-lg text-gray-900 mb-2">
                Tell us about your property
              </h3>
              <p className="text-gray-600">
                Enter basic details like square footage and guest capacity
              </p>
            </div>

            <div className="card text-center p-6">
              <div className="flex-shrink-0 w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-xl mx-auto mb-4">
                2
              </div>
              <h3 className="font-semibold text-lg text-gray-900 mb-2">
                Configure your spaces
              </h3>
              <p className="text-gray-600">
                Select the rooms you need, tailor their sizes, and capture the complete project scope
              </p>
            </div>

            <div className="card text-center p-6">
              <div className="flex-shrink-0 w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-xl mx-auto mb-4">
                3
              </div>
              <h3 className="font-semibold text-lg text-gray-900 mb-2">
                Review your complete project budget
              </h3>
              <p className="text-gray-600">
                Instantly see complete project budgets with design fees and all service costs in one shareable estimate
              </p>
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
              It only takes a few minutes to get your complete project budget
            </p>
            <button
              onClick={handleStartEstimate}
              className="btn-primary text-lg px-6 py-3"
            >
              Get Your Project Budget →
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

