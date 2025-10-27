import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthModal from './auth/AuthModal';

interface HeaderProps {
  showAdminLink?: boolean;
  currentStep?: number;
  totalSteps?: number;
}

export default function Header({ showAdminLink = true, currentStep, totalSteps }: HeaderProps) {
  const { firebaseUser, signOutUser, profile } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const renderNavLinks = (isMobile = false) => {
    const linkClass = isMobile
      ? 'block py-2 px-4 text-lg text-gray-700 hover:bg-gray-100'
      : 'text-sm text-gray-600 hover:text-primary-600 transition-colors';

    const buttonClass = isMobile
      ? 'block w-full text-left py-2 px-4 text-lg text-gray-700 hover:bg-gray-100'
      : 'text-sm text-gray-600 hover:text-primary-600 transition-colors';

    return (
      <>
        {currentStep && totalSteps && (
          <div className={isMobile ? 'py-2 px-4 text-lg text-gray-700' : 'text-sm text-gray-600'}>
            Step {currentStep} of {totalSteps}
          </div>
        )}
        {showAdminLink && (
          <>
            {profile && profile.role === 'admin' && (
              <Link to="/admin" className={linkClass}>
                Admin
              </Link>
            )}
            <Link to="/tools/reports" className={linkClass}>
              Reports
            </Link>
            <Link to="/tools" className={linkClass}>
              Toolkit
            </Link>
          </>
        )}
        {firebaseUser ? (
          <button
            onClick={() => {
              void signOutUser();
            }}
            className={buttonClass}
          >
            Sign out
          </button>
        ) : (
          <button onClick={() => setAuthModalOpen(true)} className={buttonClass}>
            Sign in
          </button>
        )}
      </>
    );
  };

  return (
    <>
      <header className="bg-white shadow-sm relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <Link to="/tools" className="text-2xl font-bold text-primary-800">
                1584 Vacation Rental Toolkit
              </Link>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-4">{renderNavLinks()}</div>

            {/* Mobile Nav Button */}
            <div className="md:hidden">
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div
            className="md:hidden absolute top-full left-0 w-full bg-white shadow-lg z-20"
            onClick={() => setMobileMenuOpen(false)}
          >
            <nav className="flex flex-col p-4">{renderNavLinks(true)}</nav>
          </div>
        )}
      </header>
      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} onAuthed={() => setAuthModalOpen(false)} />
    </>
  );
}

