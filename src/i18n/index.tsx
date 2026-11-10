import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { LANG_KEY, safeStorage } from '../lib/storage';
import { DICTS, LANGS, type Key, type Lang } from './dict';

export type { Key, Lang };
export { LANGS };

interface I18n {
  lang: Lang;
  setLang(l: Lang): void;
  t(key: Key, vars?: Record<string, string | number>): string;
  money(n: number): string;
  percent(n: number): string;
  date(iso: string): string;
  number(n: number): string;
}

const Ctx = createContext<I18n | null>(null);

function initialLang(): Lang {
  try {
    const saved = safeStorage()?.getItem(LANG_KEY);
    if (saved === 'uk' || saved === 'ru' || saved === 'en') return saved;
  } catch {
    /* ignore */
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language.toLowerCase() : '';
  if (nav.startsWith('uk')) return 'uk';
  if (nav.startsWith('en')) return 'en';
  return 'ru';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const locale = LANGS.find((l) => l.id === lang)!.locale;

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      safeStorage()?.setItem(LANG_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<I18n>(() => {
    const usd = new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
    const pct = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 });
    const num = new Intl.NumberFormat(locale);
    const dt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' });
    return {
      lang,
      setLang,
      t: (key, vars) => {
        let s = DICTS[lang][key] ?? key;
        if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
        return s;
      },
      money: (n) => usd.format(n),
      percent: (n) => pct.format(n),
      number: (n) => num.format(n),
      date: (iso) => dt.format(new Date(iso)),
    };
  }, [lang, locale, setLang]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  const v = useContext(Ctx);
  if (!v) throw new Error('I18nProvider missing');
  return v;
}
