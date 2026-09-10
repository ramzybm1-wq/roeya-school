/**
 * Internationalization direction and locale helpers.
 */

import { SupportedLocale, TRANSLATIONS } from './translations';

export class I18nHelper {
  static getDirection(locale: SupportedLocale): 'ltr' | 'rtl' {
    return locale === 'ar' ? 'rtl' : 'ltr';
  }

  static getTranslations(locale: SupportedLocale = 'fr') {
    return TRANSLATIONS[locale] || TRANSLATIONS.fr;
  }
}
