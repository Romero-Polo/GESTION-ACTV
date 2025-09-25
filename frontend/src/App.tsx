import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b border-gray-light">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-gray-dark">
                  Gestión de Actividad Laboral
                </h1>
              </div>
              <nav className="flex space-x-8">
                <a href="/" className="text-gray-medium hover:text-primary transition-colors">
                  Dashboard
                </a>
                <a href="/actividades" className="text-gray-medium hover:text-primary transition-colors">
                  Actividades
                </a>
              </nav>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/actividades" element={<ActividadesPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

function HomePage() {
  return (
    <div className="card">
      <div className="card-header">
        <h2 className="text-xl font-semibold text-gray-dark">Dashboard</h2>
      </div>
      <div className="card-body">
        <p className="text-gray-medium mb-4">
          Bienvenido al sistema de gestión de actividad laboral.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-primary-lighter p-4 rounded-button">
            <h3 className="font-semibold text-gray-dark mb-2">Actividades de Hoy</h3>
            <p className="text-2xl font-bold text-primary">0</p>
          </div>
          <div className="bg-primary-lighter p-4 rounded-button">
            <h3 className="font-semibold text-gray-dark mb-2">Jornadas Abiertas</h3>
            <p className="text-2xl font-bold text-primary">0</p>
          </div>
          <div className="bg-primary-lighter p-4 rounded-button">
            <h3 className="font-semibold text-gray-dark mb-2">Total Horas Mes</h3>
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

export default App;
