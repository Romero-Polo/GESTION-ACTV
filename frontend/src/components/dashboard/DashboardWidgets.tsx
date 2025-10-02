import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useActividades, Actividad } from '../../hooks/useActividades';
import { TodaysActivities } from './TodaysActivities';
import { OpenShifts } from './OpenShifts';
import { QuickStats } from './QuickStats';
import { ActiveWorks } from './ActiveWorks';

interface DashboardWidgetsProps {
  className?: string;
}

export const DashboardWidgets: React.FC<DashboardWidgetsProps> = ({ className = '' }) => {
  const { t } = useTranslation();
  const {
    getActividadStatistics,
    getActividadesAbiertas,
    getActividades,
    loading
  } = useActividades();

  const [statistics, setStatistics] = useState<any>(null);
  const [openShifts, setOpenShifts] = useState<Actividad[]>([]);
  const [todaysActivities, setTodaysActivities] = useState<Actividad[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Get data for dashboard
  const loadDashboardData = async () => {
    setRefreshing(true);
    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const todayString = today.toISOString().split('T')[0];

      const [stats, shifts, todayActivs] = await Promise.all([
        getActividadStatistics(
          startOfMonth.toISOString().split('T')[0],
          endOfMonth.toISOString().split('T')[0]
        ),
        getActividadesAbiertas(),
        getActividades({
          fechaDesde: todayString,
          fechaHasta: todayString
        }, 1, 50)
      ]);

      if (stats) setStatistics(stats);
      if (shifts) setOpenShifts(shifts);
      if (todayActivs?.actividades) setTodaysActivities(todayActivs.actividades);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Refresh data
  const handleRefresh = () => {
    loadDashboardData();
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {t('dashboard.quickStats')}
          </h2>
          <p className="text-sm text-gray-600">
            Resumen de la actividad actual
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading || refreshing}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <svg
            className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {refreshing ? t('common.loading') : 'Actualizar'}
        </button>
      </div>

      {/* Quick Stats Row */}
      <QuickStats
        statistics={statistics}
        openShiftsCount={openShifts.length}
        todaysActivitiesCount={todaysActivities.length}
        loading={loading || refreshing}
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Activities */}
        <TodaysActivities
          activities={todaysActivities}
          loading={loading || refreshing}
        />

        {/* Open Shifts */}
        <OpenShifts
          openShifts={openShifts}
          loading={loading || refreshing}
        />
      </div>

      {/* Active Works - Full Width */}
      <ActiveWorks
        statistics={statistics}
        loading={loading || refreshing}
      />
    </div>
  );
};