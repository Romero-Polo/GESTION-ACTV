import React from 'react';
import { useTranslation } from 'react-i18next';

interface SyncStatusCardProps {
  title: string;
  type: 'obras' | 'recursos';
  stats: {
    lastSync: string | null;
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
  };
  enabled: boolean;
  schedule: string;
  taskStatus?: {
    running: boolean;
    nextRun?: string;
  };
  onManualSync: () => void;
  loading: boolean;
}

export const SyncStatusCard: React.FC<SyncStatusCardProps> = ({
  title,
  type,
  stats,
  enabled,
  schedule,
  taskStatus,
  onManualSync,
  loading
}) => {
  const { t, i18n } = useTranslation();

  const formatLastSync = (dateString: string | null) => {
    if (!dateString) return 'Nunca';

    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffHours < 1) return 'Hace menos de 1 hora';
    if (diffHours < 24) return `Hace ${diffHours} horas`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;

    return new Intl.DateTimeFormat(i18n.language).format(date);
  };

  const getSuccessRate = () => {
    if (stats.totalSyncs === 0) return 0;
    return Math.round((stats.successfulSyncs / stats.totalSyncs) * 100);
  };

  const getStatusColor = () => {
    if (!enabled) return 'bg-gray-100 text-gray-800';
    if (stats.failedSyncs === 0 && stats.successfulSyncs > 0) return 'bg-green-100 text-green-800';
    if (stats.failedSyncs > stats.successfulSyncs) return 'bg-red-100 text-red-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  const getStatusText = () => {
    if (!enabled) return 'Deshabilitado';
    if (stats.totalSyncs === 0) return 'Sin sincronizaciones';
    if (stats.failedSyncs === 0) return 'Funcionando';
    if (stats.failedSyncs > stats.successfulSyncs) return 'Con errores';
    return 'Parcialmente funcionando';
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            {title}
          </h3>
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </span>
            {taskStatus && (
              <div className={`h-3 w-3 rounded-full ${taskStatus.running ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.totalSyncs}</div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.successfulSyncs}</div>
            <div className="text-xs text-gray-500">Exitosas</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.failedSyncs}</div>
            <div className="text-xs text-gray-500">Fallidas</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{getSuccessRate()}%</div>
            <div className="text-xs text-gray-500">Éxito</div>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Última sincronización:</span>
            <span className="text-gray-900">{formatLastSync(stats.lastSync)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Programación:</span>
            <span className="text-gray-900 font-mono text-xs">{schedule}</span>
          </div>
          {taskStatus && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Estado de tarea:</span>
              <span className={`text-sm font-medium ${taskStatus.running ? 'text-green-600' : 'text-gray-600'}`}>
                {taskStatus.running ? 'Ejecutándose' : 'Detenida'}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center">
          <button
            onClick={onManualSync}
            disabled={loading || !enabled}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {loading ? (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            ) : (
              <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            {loading ? 'Sincronizando...' : 'Sincronizar Ahora'}
          </button>

          <div className="text-xs text-gray-400">
            Tipo: {type}
          </div>
        </div>
      </div>
    </div>
  );
};