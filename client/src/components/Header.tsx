import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  showAdminLink?: boolean;
  currentStep?: number;
  totalSteps?: number;
}

export default function Header({ showAdminLink = true, currentStep, totalSteps }: HeaderProps) {
  const { firebaseUser, signOutUser, profile } = useAuth();

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <Link to="/" className="text-2xl font-bold text-primary-800">
              1584 Project Estimator
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {currentStep && totalSteps && (
              <div className="text-sm text-gray-600">
                Step {currentStep} of {totalSteps}
              </div>
            )}
            {showAdminLink && profile && (
              <>
                {['owner', 'admin'].includes(profile.role) && (
                  <Link
                    to="/admin"
                    className="text-sm text-gray-600 hover:text-primary-600 transition-colors"
                  >
                    Admin
                  </Link>
                )}
                <Link
                  to="/tools/reports"
                  className="text-sm text-gray-600 hover:text-primary-600 transition-colors"
                >
                  Reports
                </Link>
                <Link
                  to="/tools"
                  className="text-sm text-gray-600 hover:text-primary-600 transition-colors"
                >
                  Toolkit
                </Link>
              </>
            )}
            {firebaseUser ? (
              <button
                onClick={() => {
                  void signOutUser();
                }}
                className="text-sm text-gray-600 hover:text-primary-600 transition-colors"
              >
                Sign out
              </button>
            ) : (
              <Link
                to="/sign-in"
                className="text-sm text-gray-600 hover:text-primary-600 transition-colors"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

