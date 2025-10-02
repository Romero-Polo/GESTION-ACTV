import React from 'react';
import { useTranslation } from 'react-i18next';
import { Actividad } from '../../hooks/useActividades';

interface MonthViewProps {
  currentDate: Date;
  activities: Actividad[];
  onActivityClick?: (activityId: number) => void;
  onDateClick?: (date: Date) => void;
  loading?: boolean;
}

export const MonthView: React.FC<MonthViewProps> = ({
  currentDate,
  activities,
  onActivityClick,
  onDateClick,
  loading = false
}) => {
  const { t, i18n } = useTranslation();

  // Get calendar grid (6 weeks x 7 days = 42 days)
  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // First day of the month
    const firstDayOfMonth = new Date(year, month, 1);
    // Last day of the month
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Start from the Sunday of the week containing the first day
    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    // Generate 42 days (6 weeks)
    const days = [];
    const current = new Date(startDate);

    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  // Check if a date is in the current month
  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
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

  // Get activity color based on status or type
  const getActivityColor = (activity: Actividad) => {
    if (!activity.fechaFin || !activity.horaFin) {
      return 'bg-yellow-500'; // Open shift
    }

    // Color by activity type (you can customize this)
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-indigo-500',
      'bg-pink-500'
    ];

    return colors[activity.tipoActividad.id % colors.length] || 'bg-gray-500';
  };

  const days = getCalendarDays();
  const weekdays = t('dates.weekdays.short', { returnObjects: true }) as string[];

  return (
    <div className="flex flex-col">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-px mb-2">
        {weekdays.map((day) => (
          <div
            key={day}
            className="bg-gray-50 py-2 text-center text-sm font-medium text-gray-500"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
        {days.map((date, index) => {
          const dayActivities = getActivitiesForDate(date);
          const isCurrentMonthDate = isCurrentMonth(date);
          const isTodayDate = isToday(date);

          return (
            <div
              key={index}
              className={`bg-white min-h-[120px] p-2 cursor-pointer hover:bg-gray-50 transition-colors duration-200 ${
                !isCurrentMonthDate ? 'text-gray-400 bg-gray-50' : ''
              } ${isTodayDate ? 'ring-2 ring-blue-500' : ''}`}
              onClick={() => onDateClick && onDateClick(date)}
            >
              {/* Date number */}
              <div className="flex justify-between items-start mb-1">
                <span
                  className={`text-sm font-medium ${
                    isTodayDate
                      ? 'bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center'
                      : isCurrentMonthDate
                      ? 'text-gray-900'
                      : 'text-gray-400'
                  }`}
                >
                  {date.getDate()}
                </span>

                {/* Activity count indicator */}
                {dayActivities.length > 0 && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {dayActivities.length}
                  </span>
                )}
              </div>

              {/* Activities */}
              <div className="space-y-1">
                {dayActivities.slice(0, 3).map((activity) => (
                  <div
                    key={activity.id}
                    className={`text-xs text-white px-2 py-1 rounded truncate cursor-pointer hover:opacity-80 ${getActivityColor(activity)}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onActivityClick && onActivityClick(activity.id);
                    }}
                    title={`${activity.obra.descripcion} - ${activity.recurso.nombre}`}
                  >
                    {activity.horaInicio} {activity.recurso.nombre}
                  </div>
                ))}

                {/* Show more indicator */}
                {dayActivities.length > 3 && (
                  <div className="text-xs text-gray-500 px-2">
                    +{dayActivities.length - 3} {t('common.more')}
                  </div>
                )}
              </div>
            </div>
          );
        })}
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