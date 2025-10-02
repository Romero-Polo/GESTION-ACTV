import React from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarView } from './Calendar';

interface CalendarHeaderProps {
  view: CalendarView;
  currentDate: Date;
  onViewChange: (view: CalendarView) => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  onToday: () => void;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  view,
  currentDate,
  onViewChange,
  onNavigate,
  onToday
}) => {
  const { t, i18n } = useTranslation();

  const formatTitle = () => {
    const options: Intl.DateTimeFormatOptions = {
      month: 'long',
      year: 'numeric'
    };

    switch (view) {
      case 'month':
        return new Intl.DateTimeFormat(i18n.language, options).format(currentDate);
      case 'week':
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);

        if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
          return `${startOfWeek.getDate()} - ${endOfWeek.getDate()} ${new Intl.DateTimeFormat(i18n.language, { month: 'long', year: 'numeric' }).format(startOfWeek)}`;
        } else {
          return `${new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short' }).format(startOfWeek)} - ${new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' }).format(endOfWeek)}`;
        }
      case 'day':
        return new Intl.DateTimeFormat(i18n.language, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }).format(currentDate);
      default:
        return '';
    }
  };

  const views: Array<{ key: CalendarView; label: string }> = [
    { key: 'month', label: t('calendar.month') },
    { key: 'week', label: t('calendar.week') },
    { key: 'day', label: t('calendar.day') }
  ];

  return (
    <div className="px-4 py-3 border-b border-gray-200">
      <div className="flex items-center justify-between">
        {/* Left side - Navigation */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onToday}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {t('calendar.today')}
          </button>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => onNavigate('prev')}
              className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <span className="sr-only">{t('calendar.previous')}</span>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => onNavigate('next')}
              className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <span className="sr-only">{t('calendar.next')}</span>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Center - Title */}
        <div className="flex-1 text-center">
          <h2 className="text-lg font-semibold text-gray-900">
            {formatTitle()}
          </h2>
        </div>

        {/* Right side - View selector */}
        <div className="flex items-center">
          <div className="bg-gray-100 p-1 rounded-md">
            {views.map((viewOption) => (
              <button
                key={viewOption.key}
                onClick={() => onViewChange(viewOption.key)}
                className={`px-3 py-1.5 text-sm font-medium rounded transition-colors duration-200 ${
                  view === viewOption.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {viewOption.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};