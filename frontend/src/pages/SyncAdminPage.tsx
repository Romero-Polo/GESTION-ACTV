import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useSync, SyncStats, SyncLog } from '../hooks/useSync';
import { SyncStatusCard } from '../components/sync/SyncStatusCard';
import { SyncControls } from '../components/sync/SyncControls';
import { SyncLogs } from '../components/sync/SyncLogs';
import { ConnectionTest } from '../components/sync/ConnectionTest';

export const SyncAdminPage: React.FC = () => {
  const { t } = useTranslation();
  const {
    getSyncStats,
    getSyncLogs,
    syncObras,
    syncRecursos,
    testConnection,
    loading,
    error
  } = useSync();

  const [stats, setStats] = useState<SyncStats | null>(null);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);

  // Load initial data
  const loadData = async () => {
    setRefreshing(true);
    try {
      const [statsData, logsData] = await Promise.all([
        getSyncStats(),
        getSyncLogs(1, 10)
      ]);

      if (statsData) setStats(statsData);
      if (logsData) setLogs(logsData.logs);
    } catch (error) {
      console.error('Error loading sync data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle manual sync
  const handleManualSync = async (type: 'obras' | 'recursos') => {
    try {
      const result = type === 'obras' ? await syncObras() : await syncRecursos();
      if (result) {
        // Reload data to show updated stats
        await loadData();
      }
    } catch (error) {
      console.error(`Error syncing ${type}:`, error);
    }
  };

  // Test connection
  const handleTestConnection = async () => {
    try {
      const result = await testConnection();
      console.log('Connection test result:', result);
    } catch (error) {
      console.error('Error testing connection:', error);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Vista General' },
    { id: 'controls', label: 'Controles' },
    { id: 'logs', label: 'Registros' },
    { id: 'settings', label: 'Configuración' }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Sincronización con n8n
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Panel de administración para sincronización de datos externos
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={loadData}
              disabled={refreshing}
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
              {refreshing ? 'Actualizando...' : 'Actualizar'}
            </button>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === 'overview' && stats && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SyncStatusCard
                  title="Sincronización de Obras"
                  type="obras"
                  stats={stats.obras}
                  enabled={stats.enabled.obras}
                  schedule={stats.schedules.obras}
                  taskStatus={stats.scheduledTasks['obras-sync']}
                  onManualSync={() => handleManualSync('obras')}
                  loading={loading}
                />

                <SyncStatusCard
                  title="Sincronización de Recursos"
                  type="recursos"
                  stats={stats.recursos}
                  enabled={stats.enabled.recursos}
                  schedule={stats.schedules.recursos}
                  taskStatus={stats.scheduledTasks['recursos-sync']}
                  onManualSync={() => handleManualSync('recursos')}
                  loading={loading}
                />
              </div>

              {/* Webhooks Stats */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Estadísticas de Webhooks
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {stats.webhooks.totalWebhooks}
                    </div>
                    <div className="text-sm text-blue-600">Total Webhooks</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {stats.webhooks.successfulWebhooks}
                    </div>
                    <div className="text-sm text-green-600">Exitosos</div>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {stats.webhooks.failedWebhooks}
                    </div>
                    <div className="text-sm text-red-600">Fallidos</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'controls' && (
            <div className="space-y-6">
              <ConnectionTest
                onTest={handleTestConnection}
                loading={loading}
              />

              <SyncControls
                stats={stats}
                onManualSync={handleManualSync}
                loading={loading}
              />
            </div>
          )}

          {activeTab === 'logs' && (
            <SyncLogs
              logs={logs}
              loading={loading || refreshing}
              onRefresh={loadData}
            />
          )}

          {activeTab === 'settings' && (
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Configuración de Sincronización
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Sincronización Habilitada</h4>
                    <p className="text-sm text-gray-500">Estado general del sistema de sincronización</p>
                  </div>
                  <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    stats?.enabled.sync
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {stats?.enabled.sync ? 'Activa' : 'Inactiva'}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Sincronización de Obras</h4>
                    <p className="text-sm text-gray-500">Programación: {stats?.schedules.obras}</p>
                  </div>
                  <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    stats?.enabled.obras
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {stats?.enabled.obras ? 'Activa' : 'Inactiva'}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Sincronización de Recursos</h4>
                    <p className="text-sm text-gray-500">Programación: {stats?.schedules.recursos}</p>
                  </div>
                  <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    stats?.enabled.recursos
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {stats?.enabled.recursos ? 'Activa' : 'Inactiva'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};