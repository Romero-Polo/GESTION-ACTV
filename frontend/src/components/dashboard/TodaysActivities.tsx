import React from 'react';
import { useTranslation } from 'react-i18next';
import { Actividad } from '../../hooks/useActividades';

interface TodaysActivitiesProps {
  activities: Actividad[];
  loading?: boolean;
  onActivityClick?: (activityId: number) => void;
}

export const TodaysActivities: React.FC<TodaysActivitiesProps> = ({
  activities,
  loading = false,
  onActivityClick
}) => {
  const { t, i18n } = useTranslation();

  const getActivityStatusColor = (activity: Actividad) => {
    if (!activity.fechaFin || !activity.horaFin) {
      return 'bg-yellow-100 text-yellow-800';
    }
    return 'bg-green-100 text-green-800';
  };

  const getActivityStatusText = (activity: Actividad) => {
    if (!activity.fechaFin || !activity.horaFin) {
      return t('activities.abierta');
    }
    return t('activities.cerrada');
  };

  const formatTimeRange = (activity: Actividad) => {
    const start = activity.horaInicio;
    const end = activity.horaFin;

    if (end) {
      return `${start} - ${end}`;
    }
    return `${start} - ${t('activities.noEndTime')}`;
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            {t('dashboard.todaysActivities')}
          </h3>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {activities.length}
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="text-gray-500">
              {t('common.loading')}
            </div>
          </div>
        ) : activities.length > 0 ? (
          <div className="flow-root">
            <ul className="divide-y divide-gray-200 max-h-80 overflow-y-auto">
              {activities.map((activity) => (
                <li key={activity.id} className="py-3">
                  <div
                    className="flex items-center space-x-4 cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors duration-200"
                    onClick={() => onActivityClick && onActivityClick(activity.id)}
                  >
                    {/* Status indicator */}
                    <div className="flex-shrink-0">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getActivityStatusColor(activity)}`}>
                        {getActivityStatusText(activity)}
                      </span>
                    </div>

                    {/* Activity info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {activity.obra.descripcion}
                        </p>
                        <span className="text-xs text-gray-500">•</span>
                        <p className="text-xs text-gray-500">
                          {activity.tipoActividad.nombre}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <p className="text-sm text-gray-500">
                          {activity.recurso.nombre}
                        </p>
                        <span className="text-xs text-gray-400">•</span>
                        <p className="text-xs text-gray-400">
                          {formatTimeRange(activity)}
                        </p>
                      </div>
                    </div>

                    {/* Duration */}
                    {activity.fechaFin && activity.horaFin && (
                      <div className="flex-shrink-0 text-right">
                        <p className="text-sm text-gray-500">
                          {(() => {
                            const start = new Date(`${activity.fechaInicio}T${activity.horaInicio}`);
                            const end = new Date(`${activity.fechaFin}T${activity.horaFin}`);
                            const diffMs = end.getTime() - start.getTime();
                            const hours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
                            return `${hours}h`;
                          })()}
                        </p>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {t('dashboard.noActivities')}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              No hay actividades programadas para hoy
            </p>
          </div>
        )}
      </div>
    </div>
  );
};