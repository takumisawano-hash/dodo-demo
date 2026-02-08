/**
 * i18n - Internationalization Module for DoDo App
 * 
 * Usage:
 *   import { t, setLanguage, getCurrentLanguage, formatCurrency, formatDate } from '../i18n';
 *   
 *   // Basic translation
 *   t('home.yourCoaches')
 *   
 *   // With interpolation
 *   t('home.welcome', { name: 'タロウ' })
 *   
 *   // Change language
 *   setLanguage('en')
 */

import { ja } from './locales/ja';
import { en } from './locales/en';
import { zh } from './locales/zh';
import { ko } from './locales/ko';
import { es } from './locales/es';

export type LanguageCode = 'ja' | 'en' | 'zh' | 'ko' | 'es';

export interface TranslationStrings {
  [key: string]: string | TranslationStrings;
}

const translations: Record<LanguageCode, TranslationStrings> = {
  ja,
  en,
  zh,
  ko,
  es,
};

// Current language state
let currentLanguage: LanguageCode = 'ja';

// Language change listeners
type LanguageChangeListener = (lang: LanguageCode) => void;
const listeners: LanguageChangeListener[] = [];

/**
 * Get current language
 */
export function getCurrentLanguage(): LanguageCode {
  return currentLanguage;
}

/**
 * Set the current language
 */
export function setLanguage(lang: LanguageCode): void {
  if (translations[lang]) {
    currentLanguage = lang;
    listeners.forEach(listener => listener(lang));
  } else {
    console.warn(`Language "${lang}" not supported, falling back to "ja"`);
  }
}

/**
 * Subscribe to language changes
 */
export function onLanguageChange(listener: LanguageChangeListener): () => void {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index > -1) listeners.splice(index, 1);
  };
}

/**
 * Get a nested value from an object using dot notation
 */
function getNestedValue(obj: TranslationStrings, path: string): string | undefined {
  const keys = path.split('.');
  let current: any = obj;
  
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return undefined;
    }
  }
  
  return typeof current === 'string' ? current : undefined;
}

/**
 * Translate a key with optional interpolation
 * 
 * @param key - Dot notation key (e.g., 'home.welcome')
 * @param params - Interpolation parameters (e.g., { name: 'John' })
 * @returns Translated string or key if not found
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const translation = getNestedValue(translations[currentLanguage], key);
  
  if (!translation) {
    // Fallback to Japanese
    const fallback = getNestedValue(translations.ja, key);
    if (!fallback) {
      console.warn(`Translation key "${key}" not found`);
      return key;
    }
    return interpolate(fallback, params);
  }
  
  return interpolate(translation, params);
}

/**
 * Interpolate {{variable}} placeholders in a string
 */
function interpolate(str: string, params?: Record<string, string | number>): string {
  if (!params) return str;
  
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return params[key] !== undefined ? String(params[key]) : `{{${key}}}`;
  });
}

/**
 * Format currency based on current language
 */
export function formatCurrency(amount: number): string {
  const locale = getLocale(currentLanguage);
  const currency = getCurrency(currentLanguage);
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date based on current language
 */
export function formatDate(date: Date, style: 'short' | 'medium' | 'long' = 'medium'): string {
  const locale = getLocale(currentLanguage);
  
  const options: Intl.DateTimeFormatOptions = {
    short: { month: 'numeric', day: 'numeric' },
    medium: { year: 'numeric', month: 'short', day: 'numeric' },
    long: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' },
  }[style];
  
  return new Intl.DateTimeFormat(locale, options).format(date);
}

/**
 * Format number based on current language
 */
export function formatNumber(num: number): string {
  const locale = getLocale(currentLanguage);
  return new Intl.NumberFormat(locale).format(num);
}

/**
 * Format percentage
 */
export function formatPercent(num: number): string {
  const locale = getLocale(currentLanguage);
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num / 100);
}

/**
 * Get locale string for Intl APIs
 */
function getLocale(lang: LanguageCode): string {
  const locales: Record<LanguageCode, string> = {
    ja: 'ja-JP',
    en: 'en-US',
    zh: 'zh-CN',
    ko: 'ko-KR',
    es: 'es-ES',
  };
  return locales[lang];
}

/**
 * Get currency code for language
 */
function getCurrency(lang: LanguageCode): string {
  const currencies: Record<LanguageCode, string> = {
    ja: 'JPY',
    en: 'USD',
    zh: 'CNY',
    ko: 'KRW',
    es: 'EUR',
  };
  return currencies[lang];
}

/**
 * Get available languages
 */
export function getAvailableLanguages(): { code: LanguageCode; label: string; nativeLabel: string }[] {
  return [
    { code: 'ja', label: 'Japanese', nativeLabel: '日本語' },
    { code: 'en', label: 'English', nativeLabel: 'English' },
    { code: 'zh', label: 'Chinese', nativeLabel: '中文' },
    { code: 'ko', label: 'Korean', nativeLabel: '한국어' },
    { code: 'es', label: 'Spanish', nativeLabel: 'Español' },
  ];
}

// React Hook for language changes
export { useI18n } from './useI18n';

export default { t, setLanguage, getCurrentLanguage, formatCurrency, formatDate, formatNumber };
