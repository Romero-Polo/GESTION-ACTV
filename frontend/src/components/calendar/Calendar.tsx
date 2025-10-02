import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarHeader } from './CalendarHeader';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import { DayView } from './DayView';
import { useActividades, ActividadFilters } from '../../hooks/useActividades';

export type CalendarView = 'month' | 'week' | 'day';

interface CalendarProps {
  className?: string;
  filters?: ActividadFilters;
  onActivityClick?: (activityId: number) => void;
  onCreateActivity?: (date: Date) => void;
}

export const Calendar: React.FC<CalendarProps> = ({
  className = '',
  filters = {},
  onActivityClick,
  onCreateActivity
}) => {
  const { t } = useTranslation();
  const { getActividades } = useActividades();
  const [view, setView] = useState<CalendarView>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Navigate between periods
  const navigatePeriod = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);

    switch (view) {
      case 'month':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'day':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
    }

    setCurrentDate(newDate);
  };

  // Go to today
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get date range for current view
  const getDateRange = () => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);

    switch (view) {
      case 'month':
        start.setDate(1);
        end.setMonth(end.getMonth() + 1, 0);
        break;
      case 'week':
        const dayOfWeek = start.getDay();
        start.setDate(start.getDate() - dayOfWeek);
        end.setDate(end.getDate() + (6 - dayOfWeek));
        break;
      case 'day':
        // Same day
        break;
    }

    // Extend range for month view to include partial weeks
    if (view === 'month') {
      const monthStart = new Date(start);
      const monthEnd = new Date(end);

      // Go to first day of the week containing the first day of the month
      start.setDate(start.getDate() - start.getDay());

      // Go to last day of the week containing the last day of the month
      end.setDate(end.getDate() + (6 - end.getDay()));
    }

    return { start, end };
  };

  // Load activities for the current view
  const loadActivities = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();

      const activityFilters: ActividadFilters = {
        ...filters,
        fechaDesde: start.toISOString().split('T')[0],
        fechaHasta: end.toISOString().split('T')[0]
      };

      const response = await getActividades(activityFilters, 1, 1000); // Load many for calendar
      if (response?.actividades) {
        setActivities(response.actividades);
      }
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  // Reload activities when view, date, or filters change
  useEffect(() => {
    loadActivities();
  }, [view, currentDate, filters]);

  // Filter activities for a specific date
  const getActivitiesForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return activities.filter(activity => activity.fechaInicio === dateString);
  };

  // Get activities for a date range
  const getActivitiesForDateRange = (startDate: Date, endDate: Date) => {
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];

    return activities.filter(activity =>
      activity.fechaInicio >= start && activity.fechaInicio <= end
    );
  };

  const renderView = () => {
    switch (view) {
      case 'month':
        return (
          <MonthView
            currentDate={currentDate}
            activities={activities}
            onActivityClick={onActivityClick}
            onDateClick={onCreateActivity}
            loading={loading}
          />
        );
      case 'week':
        return (
          <WeekView
            currentDate={currentDate}
            activities={getActivitiesForDateRange(
              (() => {
                const start = new Date(currentDate);
                start.setDate(start.getDate() - start.getDay());
                return start;
              })(),
              (() => {
                const end = new Date(currentDate);
                end.setDate(end.getDate() + (6 - end.getDay()));
                return end;
              })()
            )}
            onActivityClick={onActivityClick}
            onTimeSlotClick={onCreateActivity}
            loading={loading}
          />
        );
      case 'day':
        return (
          <DayView
            currentDate={currentDate}
            activities={getActivitiesForDate(currentDate)}
            onActivityClick={onActivityClick}
            onTimeSlotClick={onCreateActivity}
            loading={loading}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className={`bg-white shadow rounded-lg ${className}`}>
      <CalendarHeader
        view={view}
        currentDate={currentDate}
        onViewChange={setView}
        onNavigate={navigatePeriod}
        onToday={goToToday}
      />
      <div className="p-4">
        {renderView()}
      </div>
    </div>
  );
};