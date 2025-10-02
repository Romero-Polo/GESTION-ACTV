import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useActividades } from '../hooks/useActividades';
import { Calendar } from '../components/calendar/Calendar';
import { DashboardWidgets } from '../components/dashboard/DashboardWidgets';
import { ActivityFilters } from '../components/filters/ActivityFilters';

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { getActividadStatistics, getActividadesAbiertas, loading, error } = useActividades();
  const [statistics, setStatistics] = useState<any>(null);
  const [openShifts, setOpenShifts] = useState<any[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setConnectionError(null);

      // Get today's date range for statistics
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      const [stats, shifts] = await Promise.all([
        getActividadStatistics(
          startOfMonth.toISOString().split('T')[0],
          endOfMonth.toISOString().split('T')[0]
        ),
        getActividadesAbiertas()
      ]);

      if (stats) {
        setStatistics(stats);
      } else if (error) {
        setConnectionError(error);
      }

      if (shifts) {
        setOpenShifts(shifts);
      } else if (error && !stats) {
        setConnectionError(error);
      }
    };

    fetchDashboardData();
  }, [getActividadStatistics, getActividadesAbiertas, error]);

  const today = new Date();
  const todayString = today.toISOString().split('T')[0];

  // Calculate today's activities from statistics
  const todaysActivities = statistics?.dailyStats?.find((day: any) =>
    day.fecha === todayString
  )?.totalActividades || 0;

  const monthlyHours = statistics?.totalHours || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {t('app.welcome')} al sistema de gestión de actividades
          </p>
        </div>

        {/* Connection Error Alert */}
        {connectionError && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Error de Conexión con la Base de Datos
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>
                    No se pudo conectar con el servidor de base de datos. Verifica que SQL Server esté ejecutándose y accesible.
                  </p>
                  <p className="mt-2 font-mono text-xs bg-red-100 p-2 rounded">
                    {connectionError}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {t('dashboard.todaysActivities')}
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {loading ? '...' : todaysActivities}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {t('dashboard.openShifts')}
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {loading ? '...' : openShifts.length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {t('dashboard.monthlyHours')}
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {loading ? '...' : `${monthlyHours.toFixed(1)}h`}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {t('dashboard.activeWorks')}
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {loading ? '...' : statistics?.activeWorks || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Open shifts section */}
        {openShifts.length > 0 && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                {t('dashboard.openShifts')}
              </h3>
              <div className="flow-root">
                <ul className="divide-y divide-gray-200">
                  {openShifts.slice(0, 5).map((actividad) => (
                    <li key={actividad.id} className="py-3">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            {t('activities.abierta')}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {actividad.obra.descripcion}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {actividad.recurso.nombre} - {actividad.tipoActividad.nombre}
                          </p>
                        </div>
                        <div className="flex-shrink-0 text-sm text-gray-500">
                          {new Date(`${actividad.fechaInicio}T${actividad.horaInicio}`).toLocaleString()}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              {openShifts.length > 5 && (
                <div className="mt-4 text-sm text-gray-500">
                  Y {openShifts.length - 5} más...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty states */}
        {!loading && openShifts.length === 0 && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {t('dashboard.noOpenShifts')}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Todas las jornadas están cerradas
              </p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};