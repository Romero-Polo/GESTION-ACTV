import React from 'react';
import { useTranslation } from 'react-i18next';
import { Actividad } from '../../hooks/useActividades';

interface DayViewProps {
  currentDate: Date;
  activities: Actividad[];
  onActivityClick?: (activityId: number) => void;
  onTimeSlotClick?: (date: Date) => void;
  loading?: boolean;
}

export const DayView: React.FC<DayViewProps> = ({
  currentDate,
  activities,
  onActivityClick,
  onTimeSlotClick,
  loading = false
}) => {
  const { t, i18n } = useTranslation();

  // Generate hours (6 AM to 10 PM)
  const hours = Array.from({ length: 17 }, (_, i) => i + 6);

  // Get activities for the current date
  const dayActivities = activities.filter(activity => {
    const activityDate = new Date(activity.fechaInicio);
    return activityDate.toDateString() === currentDate.toDateString();
  });

  // Get activity position and height based on time
  const getActivityPosition = (activity: Actividad) => {
    const startTime = activity.horaInicio.split(':');
    const startHour = parseInt(startTime[0]);
    const startMinute = parseInt(startTime[1]);

    const endTime = activity.horaFin ? activity.horaFin.split(':') : null;
    let duration = 1; // Default 1 hour

    if (endTime) {
      const endHour = parseInt(endTime[0]);
      const endMinute = parseInt(endTime[1]);
      duration = (endHour - startHour) + (endMinute - startMinute) / 60;
    }

    const top = ((startHour - 6) + startMinute / 60) * 80; // 80px per hour
    const height = Math.max(duration * 80, 40); // Minimum 40px height

    return { top, height };
  };

  // Get activity color
  const getActivityColor = (activity: Actividad) => {
    if (!activity.fechaFin || !activity.horaFin) {
      return 'bg-yellow-500'; // Open shift
    }

    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-indigo-500',
      'bg-pink-500'
    ];

    return colors[activity.tipoActividad.id % colors.length] || 'bg-gray-500';
  };

  // Check if current time is within view
  const getCurrentTimePosition = () => {
    const now = new Date();
    if (now.toDateString() !== currentDate.toDateString()) {
      return null; // Not today
    }

    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    if (currentHour < 6 || currentHour > 22) {
      return null; // Outside view range
    }

    return ((currentHour - 6) + currentMinute / 60) * 80;
  };

  const currentTimePosition = getCurrentTimePosition();

  return (
    <div className="flex flex-col relative">
      {/* Day header */}
      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {new Intl.DateTimeFormat(i18n.language, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              }).format(currentDate)}
            </h3>
            <p className="text-sm text-gray-600">
              {dayActivities.length} {dayActivities.length === 1 ? t('activities.activity') : t('activities.activities')}
            </p>
          </div>

          {/* Quick stats */}
          <div className="text-right">
            <div className="text-sm text-gray-600">
              {t('dashboard.openShifts')}: {dayActivities.filter(a => !a.fechaFin || !a.horaFin).length}
            </div>
          </div>
        </div>
      </div>

      {/* Time slots and activities */}
      <div className="flex relative">
        {/* Time column */}
        <div className="w-20 flex-shrink-0">
          {hours.map((hour) => (
            <div key={hour} className="h-20 border-t border-gray-200 relative pr-2">
              <div className="absolute -top-3 right-0 text-sm text-gray-500 bg-white px-1">
                {String(hour).padStart(2, '0')}:00
              </div>
            </div>
          ))}
        </div>

        {/* Activities column */}
        <div className="flex-1 relative border-l border-gray-200">
          {/* Hour slots */}
          {hours.map((hour) => (
            <div
              key={hour}
              className="h-20 border-t border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors duration-200 pl-4"
              onClick={() => {
                const clickedDate = new Date(currentDate);
                clickedDate.setHours(hour, 0, 0, 0);
                onTimeSlotClick && onTimeSlotClick(clickedDate);
              }}
            >
              {/* Half-hour line */}
              <div className="absolute inset-x-0 top-10 border-t border-gray-100" />
            </div>
          ))}

          {/* Current time indicator */}
          {currentTimePosition !== null && (
            <div
              className="absolute left-0 right-0 border-t-2 border-red-500 z-10"
              style={{ top: `${currentTimePosition}px` }}
            >
              <div className="absolute -left-2 -top-1 w-3 h-3 bg-red-500 rounded-full" />
              <div className="absolute left-0 -top-4 text-xs text-red-500 font-medium bg-white px-1">
                {new Date().toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          )}

          {/* Activities */}
          {dayActivities.map((activity) => {
            const { top, height } = getActivityPosition(activity);

            return (
              <div
                key={activity.id}
                className={`absolute left-4 right-4 px-3 py-2 rounded-lg text-white cursor-pointer hover:opacity-90 shadow-sm ${getActivityColor(activity)}`}
                style={{ top: `${top}px`, height: `${height}px` }}
                onClick={(e) => {
                  e.stopPropagation();
                  onActivityClick && onActivityClick(activity.id);
                }}
              >
                <div className="font-medium text-sm">
                  {activity.horaInicio}
                  {activity.horaFin && ` - ${activity.horaFin}`}
                </div>
                <div className="text-xs opacity-90 mt-1">
                  {activity.recurso.nombre}
                </div>
                <div className="text-xs opacity-80">
                  {activity.tipoActividad.nombre}
                </div>
                <div className="text-xs opacity-70 mt-1 truncate">
                  {activity.obra.descripcion}
                </div>

                {(!activity.fechaFin || !activity.horaFin) && (
                  <div className="absolute top-1 right-1">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-yellow-200 text-yellow-800">
                      {t('activities.abierta')}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Empty state */}
      {!loading && dayActivities.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <svg className="h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-lg font-medium">{t('calendar.noActivities')}</p>
          <p className="text-sm">
            {t('calendar.createActivity')}
          </p>
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
          <div className="text-gray-600">
            {t('common.loading')}
          </div>
        </div>
      )}
    </div>
  );
};