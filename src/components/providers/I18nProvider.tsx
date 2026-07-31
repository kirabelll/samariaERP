'use client';

import React, { useState, useEffect, useMemo, ReactNode } from 'react';
import { I18nContext, Locale, getTranslation } from '@/lib/i18n';

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>('en');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Load locale from localStorage or browser language
    const savedLocale = localStorage.getItem('locale') as Locale | null;
    if (savedLocale && (savedLocale === 'en' || savedLocale === 'am')) {
      setLocale(savedLocale);
    } else {
      const browserLang = navigator.language.toLowerCase();
      setLocale(browserLang.startsWith('am') ? 'am' : 'en');
    }
    setMounted(true);
  }, []);

  const handleSetLocale = (newLocale: Locale) => {
    setLocale(newLocale);
    localStorage.setItem('locale', newLocale);
  };

  const value = useMemo(
    () => ({
      locale,
      setLocale: handleSetLocale,
      t: (key: keyof (typeof import('@/lib/i18n').translations)['en']) =>
        getTranslation(key, locale),
    }),
    [locale]
  );

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}
