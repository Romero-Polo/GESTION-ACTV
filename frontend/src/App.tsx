import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthButton } from './components/AuthButton';
import { AuthCallback } from './pages/AuthCallback';
import { LanguageSelector } from './components/common/LanguageSelector';
import { SyncAdminPage } from './pages/SyncAdminPage';
import { ExportPage } from './pages/ExportPage';
import ChangelogPage from './pages/ChangelogPage';
import { VERSION } from './config/version';
import './i18n';

function App() {
  const { t } = useTranslation();

  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white shadow-sm border-b border-gray-light">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center py-6">
                <div className="flex items-center space-x-4">
                  <h1 className="text-2xl font-bold text-gray-dark">
                    {t('app.title')}
                  </h1>
                  <a
                    href="/changelog.html"
                    className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                    title="Ver registro de cambios"
                  >
                    v{VERSION}
                  </a>
                </div>
                <div className="flex items-center space-x-8">
                  <nav className="flex space-x-8">
                    <a href="/" className="text-gray-medium hover:text-primary transition-colors">
                      {t('navigation.dashboard')}
                    </a>
                    <a href="/actividades" className="text-gray-medium hover:text-primary transition-colors">
                      {t('navigation.activities')}
                    </a>
                    <a href="/export" className="text-gray-medium hover:text-primary transition-colors">
                      Exportación ERP
                    </a>
                    <a href="/sync" className="text-gray-medium hover:text-primary transition-colors">
                      Sincronización
                    </a>
                    <a href="/changelog" className="text-gray-medium hover:text-primary transition-colors">
                      📋 Changelog
                    </a>
                  </nav>
                  <LanguageSelector className="mr-4" />
                  <AuthButton />
                </div>
              </div>
            </div>
          </header>

          <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <Routes>
              <Route path="/auth/success" element={<AuthCallback />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              } />
              <Route path="/actividades" element={
                <ProtectedRoute>
                  <ActividadesPage />
                </ProtectedRoute>
              } />
              <Route path="/admin" element={
                <ProtectedRoute roles={['administrador']}>
                  <AdminPage />
                </ProtectedRoute>
              } />
              <Route path="/export" element={
                <ProtectedRoute>
                  <ExportPage />
                </ProtectedRoute>
              } />
              <Route path="/sync" element={
                <ProtectedRoute roles={['administrador']}>
                  <SyncAdminPage />
                </ProtectedRoute>
              } />
              <Route path="/changelog" element={<ChangelogPage />} />
            </Routes>
          </main>

          {/* Footer with version info */}
          <footer className="bg-white border-t border-gray-200 mt-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex justify-between items-center text-sm text-gray-500">
                <div>
                  © 2025 Sistema de Gestión de Actividades
                </div>
                <div className="flex items-center space-x-4">
                  <span>Versión {VERSION}</span>
                  <a href="/changelog" className="hover:text-primary transition-colors">
                    Ver cambios
                  </a>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </Router>
    </AuthProvider>
  );
}

function HomePage() {
  const { t } = useTranslation();

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="text-xl font-semibold text-gray-dark">{t('dashboard.title')}</h2>
      </div>
      <div className="card-body">
        <p className="text-gray-medium mb-4">
          {t('app.welcome')} al sistema de {t('app.title').toLowerCase()}.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-primary-lighter p-4 rounded-button">
            <h3 className="font-semibold text-gray-dark mb-2">{t('dashboard.todaysActivities')}</h3>
            <p className="text-2xl font-bold text-primary">0</p>
          </div>
          <div className="bg-primary-lighter p-4 rounded-button">
            <h3 className="font-semibold text-gray-dark mb-2">{t('dashboard.openShifts')}</h3>
            <p className="text-2xl font-bold text-primary">0</p>
          </div>
          <div className="bg-primary-lighter p-4 rounded-button">
            <h3 className="font-semibold text-gray-dark mb-2">{t('dashboard.monthlyHours')}</h3>
            <p className="text-2xl font-bold text-primary">0</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActividadesPage() {
  return (
    <div className="card">
      <div className="card-header">
        <h2 className="text-xl font-semibold text-gray-dark">Gestión de Actividades</h2>
      </div>
      <div className="card-body">
        <p className="text-gray-medium">
          Aquí se mostrará el listado y formularios de actividades.
        </p>
        <button className="btn btn-primary mt-4">
          Nueva Actividad
        </button>
      </div>
    </div>
  );
}

function AdminPage() {
  return (
    <div className="card">
      <div className="card-header">
        <h2 className="text-xl font-semibold text-gray-dark">Panel de Administración</h2>
      </div>
      <div className="card-body">
        <p className="text-gray-medium mb-4">
          Panel exclusivo para administradores del sistema.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-red-50 p-4 rounded-button border border-red-200">
            <h3 className="font-semibold text-gray-dark mb-2">Gestión de Usuarios</h3>
            <p className="text-sm text-gray-medium">Administrar roles y permisos</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-button border border-blue-200">
            <h3 className="font-semibold text-gray-dark mb-2">Configuración del Sistema</h3>
            <p className="text-sm text-gray-medium">Configuraciones avanzadas</p>
          </div>
          <div className="bg-green-50 p-4 rounded-button border border-green-200">
            <h3 className="font-semibold text-gray-dark mb-2">Reportes y Estadísticas</h3>
            <p className="text-sm text-gray-medium">Analíticas del sistema</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
