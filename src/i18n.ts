import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import translationEN from './locales/en/translation.json';
import translationES from './locales/es/translation.json';
import translationPT from './locales/pt/translation.json';

const resources = {
  en: {
    translation: translationEN
  },
  es: {
    translation: translationES
  },
  pt: {
    translation: translationPT
  }
};

try {
  i18n
    // Detects user language
    .use(LanguageDetector)
    // Passes i18n down to react-i18next
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: 'es', // Default language is Spanish
      
      detection: {
        order: ['localStorage', 'navigator'],
        lookupLocalStorage: 'language',
        caches: ['localStorage'],
      },

      interpolation: {
        escapeValue: false // React already safes from xss
      }
    });
} catch (error) {
  console.error("Error initializing i18n:", error);
}

export default i18n;
