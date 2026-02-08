/**
 * React Hook for i18n with automatic re-render on language change
 */
import { useState, useEffect, useCallback } from 'react';
import {
  t,
  getCurrentLanguage,
  setLanguage,
  onLanguageChange,
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
  getAvailableLanguages,
  LanguageCode,
} from './index';

export function useI18n() {
  const [language, setCurrentLanguage] = useState<LanguageCode>(getCurrentLanguage());

  useEffect(() => {
    const unsubscribe = onLanguageChange((lang) => {
      setCurrentLanguage(lang);
    });
    return unsubscribe;
  }, []);

  const changeLanguage = useCallback((lang: LanguageCode) => {
    setLanguage(lang);
  }, []);

  return {
    t,
    language,
    setLanguage: changeLanguage,
    formatCurrency,
    formatDate,
    formatNumber,
    formatPercent,
    availableLanguages: getAvailableLanguages(),
  };
}
