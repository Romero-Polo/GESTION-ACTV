import React from 'react';
import { useTranslation } from 'react-i18next';
import { Actividad } from '../../hooks/useActividades';

interface WeekViewProps {
  currentDate: Date;
  activities: Actividad[];
  onActivityClick?: (activityId: number) => void;
  onTimeSlotClick?: (date: Date) => void;
  loading?: boolean;
}

export const WeekView: React.FC<WeekViewProps> = ({
  currentDate,
  activities,
  onActivityClick,
  onTimeSlotClick,
  loading = false
}) => {
  const { t, i18n } = useTranslation();

  // Generate hours (6 AM to 10 PM)
  const hours = Array.from({ length: 17 }, (_, i) => i + 6);

  // Get the week days starting from Sunday
  const getWeekDays = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(date.getDate() + i);
      return date;
    });
  };

  // Check if a date is today
  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Get activities for a specific date
  const getActivitiesForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return activities.filter(activity => activity.fechaInicio === dateString);
  };

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

    const top = ((startHour - 6) + startMinute / 60) * 60; // 60px per hour
    const height = Math.max(duration * 60, 30); // Minimum 30px height

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

  const weekDays = getWeekDays();
  const weekdays = t('dates.weekdays.short', { returnObjects: true }) as string[];

  return (
    <div className="flex flex-col relative">
      {/* Header with days */}
      <div className="grid grid-cols-8 gap-px mb-4 bg-gray-200 rounded-lg overflow-hidden">
        {/* Time column header */}
        <div className="bg-gray-50 p-3">
          <div className="text-sm font-medium text-gray-500 text-center">
            {t('common.time')}
          </div>
        </div>

        {/* Day headers */}
        {weekDays.map((date, index) => (
          <div
            key={index}
            className={`bg-white p-3 text-center ${isToday(date) ? 'bg-blue-50' : ''}`}
          >
            <div className="text-sm font-medium text-gray-500">
              {weekdays[index]}
            </div>
            <div className={`text-lg font-semibold ${
              isToday(date) ? 'text-blue-600' : 'text-gray-900'
            }`}>
              {date.getDate()}
            </div>
          </div>
        ))}
      </div>

      {/* Time slots and activities */}
      <div className="flex-1 relative">
        <div className="grid grid-cols-8 gap-px">
          {/* Time column */}
          <div className="space-y-0">
            {hours.map((hour) => (
              <div key={hour} className="h-15 border-t border-gray-200 relative">
                <div className="absolute -top-3 left-0 text-xs text-gray-500 bg-white px-1">
                  {String(hour).padStart(2, '0')}:00
                </div>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((date, dayIndex) => {
            const dayActivities = getActivitiesForDate(date);

            return (
              <div key={dayIndex} className="relative">
                {/* Hour slots */}
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="h-15 border-t border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
                    onClick={() => {
                      const clickedDate = new Date(date);
                      clickedDate.setHours(hour, 0, 0, 0);
                      onTimeSlotClick && onTimeSlotClick(clickedDate);
                    }}
                  />
                ))}

                {/* Activities */}
                {dayActivities.map((activity) => {
                  const { top, height } = getActivityPosition(activity);

                  return (
                    <div
                      key={activity.id}
                      className={`absolute left-0 right-0 mx-1 px-2 py-1 rounded text-xs text-white cursor-pointer hover:opacity-80 ${getActivityColor(activity)}`}
                      style={{ top: `${top}px`, height: `${height}px` }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onActivityClick && onActivityClick(activity.id);
                      }}
                      title={`${activity.obra.descripcion} - ${activity.tipoActividad.nombre}`}
                    >
                      <div className="font-medium truncate">
                        {activity.horaInicio} {activity.recurso.nombre}
                      </div>
                      <div className="text-xs opacity-90 truncate">
                        {activity.tipoActividad.nombre}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

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