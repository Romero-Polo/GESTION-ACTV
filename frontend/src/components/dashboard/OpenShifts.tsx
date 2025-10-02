import React from 'react';
import { useTranslation } from 'react-i18next';
import { Actividad } from '../../hooks/useActividades';

interface OpenShiftsProps {
  openShifts: Actividad[];
  loading?: boolean;
  onShiftClick?: (activityId: number) => void;
  onCloseShift?: (activityId: number) => void;
}

export const OpenShifts: React.FC<OpenShiftsProps> = ({
  openShifts,
  loading = false,
  onShiftClick,
  onCloseShift
}) => {
  const { t, i18n } = useTranslation();

  const formatElapsedTime = (activity: Actividad) => {
    const start = new Date(`${activity.fechaInicio}T${activity.horaInicio}`);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getElapsedTimeColor = (activity: Actividad) => {
    const start = new Date(`${activity.fechaInicio}T${activity.horaInicio}`);
    const now = new Date();
    const diffHours = (now.getTime() - start.getTime()) / (1000 * 60 * 60);

    if (diffHours > 10) return 'text-red-600';
    if (diffHours > 8) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            {t('dashboard.openShifts')}
          </h3>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              {openShifts.length}
            </span>
            {openShifts.length > 0 && (
              <div className="h-2 w-2 bg-yellow-500 rounded-full animate-pulse" />
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="text-gray-500">
              {t('common.loading')}
            </div>
          </div>
        ) : openShifts.length > 0 ? (
          <div className="flow-root">
            <ul className="divide-y divide-gray-200 max-h-80 overflow-y-auto">
              {openShifts.map((activity) => (
                <li key={activity.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <div
                      className="flex-1 cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors duration-200"
                      onClick={() => onShiftClick && onShiftClick(activity.id)}
                    >
                      <div className="flex items-center space-x-4">
                        {/* Warning indicator */}
                        <div className="flex-shrink-0">
                          <div className="h-3 w-3 bg-yellow-400 rounded-full animate-pulse" />
                        </div>

                        {/* Activity info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {activity.recurso.nombre}
                            </p>
                            <span className="text-xs text-gray-500">•</span>
                            <p className="text-xs text-gray-500 truncate">
                              {activity.tipoActividad.nombre}
                            </p>
                          </div>
                          <div className="mt-1">
                            <p className="text-sm text-gray-600 truncate">
                              {activity.obra.descripcion}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <p className="text-xs text-gray-500">
                              Inicio: {activity.horaInicio}
                            </p>
                            <span className="text-xs text-gray-400">•</span>
                            <p className={`text-xs font-medium ${getElapsedTimeColor(activity)}`}>
                              {formatElapsedTime(activity)} transcurrido
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Close button */}
                    <div className="flex-shrink-0 ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCloseShift && onCloseShift(activity.id);
                        }}
                        className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors duration-200"
                      >
                        <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Cerrar
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="text-center py-8">
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
        )}
      </div>
    </div>
  );
};