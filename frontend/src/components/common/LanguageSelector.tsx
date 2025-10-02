import { useTranslation } from 'react-i18next';

interface LanguageSelectorProps {
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ className = '' }) => {
  const { i18n } = useTranslation();

  const languages = [
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'ca', name: 'Català', flag: '🏴' }
  ];

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
  };

  return (
    <div className={`relative inline-block text-left ${className}`}>
      <select
        value={i18n.language}
        onChange={(e) => handleLanguageChange(e.target.value)}
        className="appearance-none bg-white border border-gray-300 rounded-md py-2 pl-3 pr-8 text-sm leading-5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {lang.name}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
        <svg className="h-4 w-4 fill-current text-gray-400" viewBox="0 0 20 20">
          <path d="M7 10l5 5 5-5H7z" />
        </svg>
      </div>
    </div>
  );
};