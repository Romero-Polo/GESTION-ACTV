import React from 'react';
import { SyncStats } from '../../hooks/useSync';

interface SyncControlsProps {
  stats: SyncStats | null;
  onManualSync: (type: 'obras' | 'recursos') => void;
  loading: boolean;
}

export const SyncControls: React.FC<SyncControlsProps> = ({
  stats,
  onManualSync,
  loading
}) => {
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">
        Controles de Sincronización
      </h3>

      <div className="space-y-6">
        {/* Obras Controls */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex-1">
            <h4 className="text-base font-medium text-gray-900">Sincronización de Obras</h4>
            <p className="text-sm text-gray-500 mt-1">
              Sincronizar obras desde n8n. Última sincronización: {
                stats?.obras.lastSync
                  ? new Date(stats.obras.lastSync).toLocaleString()
                  : 'Nunca'
              }
            </p>
          </div>
          <button
            onClick={() => onManualSync('obras')}
            disabled={loading || !stats?.enabled.obras}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Sincronizando...
              </>
            ) : (
              <>
                <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Sincronizar Obras
              </>
            )}
          </button>
        </div>

        {/* Recursos Controls */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex-1">
            <h4 className="text-base font-medium text-gray-900">Sincronización de Recursos</h4>
            <p className="text-sm text-gray-500 mt-1">
              Sincronizar recursos desde n8n. Última sincronización: {
                stats?.recursos.lastSync
                  ? new Date(stats.recursos.lastSync).toLocaleString()
                  : 'Nunca'
              }
            </p>
          </div>
          <button
            onClick={() => onManualSync('recursos')}
            disabled={loading || !stats?.enabled.recursos}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Sincronizando...
              </>
            ) : (
              <>
                <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Sincronizar Recursos
              </>
            )}
          </button>
        </div>

        {/* Both Controls */}
        <div className="flex items-center justify-between p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
          <div className="flex-1">
            <h4 className="text-base font-medium text-gray-900">Sincronización Completa</h4>
            <p className="text-sm text-gray-500 mt-1">
              Sincronizar tanto obras como recursos en secuencia
            </p>
          </div>
          <button
            onClick={async () => {
              await onManualSync('obras');
              await onManualSync('recursos');
            }}
            disabled={loading || (!stats?.enabled.obras && !stats?.enabled.recursos)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Sincronizando...
              </>
            ) : (
              <>
                <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Sincronizar Todo
              </>
            )}
          </button>
        </div>
      </div>

      {/* Status info */}
      {stats && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h5 className="text-sm font-medium text-blue-900 mb-2">Estado del Sistema</h5>
          <div className="text-sm text-blue-700 space-y-1">
            <p>• Sincronización general: {stats.enabled.sync ? 'Habilitada' : 'Deshabilitada'}</p>
            <p>• Obras: {stats.enabled.obras ? 'Habilitadas' : 'Deshabilitadas'} (Programación: {stats.schedules.obras})</p>
            <p>• Recursos: {stats.enabled.recursos ? 'Habilitados' : 'Deshabilitados'} (Programación: {stats.schedules.recursos})</p>
          </div>
        </div>
      )}
    </div>
  );
};