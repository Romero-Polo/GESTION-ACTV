import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { LanguageSelector } from '../common/LanguageSelector';
import { AuthButton } from '../AuthButton';

interface HeaderProps {
  onMenuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-20">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4 h-16">
          {/* Mobile menu button */}
          <div className="flex items-center">
            <button
              type="button"
              className="lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              onClick={onMenuClick}
            >
              <span className="sr-only">Open main menu</span>
              <svg
                className="h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* App title - visible on mobile */}
            <h1 className="ml-3 text-xl font-semibold text-gray-900 lg:hidden">
              {t('app.title')}
            </h1>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* User welcome */}
            {user && (
              <div className="hidden sm:block">
                <span className="text-sm text-gray-600">
                  {t('app.welcome')}, <span className="font-medium text-gray-900">{user.name}</span>
                </span>
              </div>
            )}

            {/* Language selector */}
            <LanguageSelector />

            {/* Auth button */}
            <AuthButton />
          </div>
        </div>
      </div>
    </header>
  );
};