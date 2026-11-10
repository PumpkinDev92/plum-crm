import { AlertTriangle, Briefcase, LayoutDashboard, Search, StickyNote, Users, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useI18n, LANGS, type Key, type Lang } from '../i18n';
import { useStore } from '../lib/store';
import { CompanyBar } from './CompanyBar';
import { Palette } from './Palette';
import { SelectField } from './ui';

const NAV: { to: string; key: Key; icon: LucideIcon; end?: boolean }[] = [
  { to: '/', key: 'nav.overview', icon: LayoutDashboard, end: true },
  { to: '/deals', key: 'nav.deals', icon: Briefcase },
  { to: '/contacts', key: 'nav.contacts', icon: Users },
  { to: '/notes', key: 'nav.notes', icon: StickyNote },
];

export function AppShell() {
  const { t, lang, setLang } = useI18n();
  const { loadStatus, saveFailed } = useStore();
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (!searching && document.querySelector('[role="dialog"]')) return;
        setSearching((s) => !s);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [searching]);

  return (
    <div className="shell">
      <a href="#main" className="skip-link">
        {t('nav.skip')}
      </a>
      <aside className="sidebar">
        <div className="sidebar__brand">
          <img src="/logo.png" alt="Plum" className="logo" />
        </div>
        <nav className="nav" aria-label={t('nav.main')}>
          {NAV.map(({ to, key, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav__link${isActive ? ' is-active' : ''}`}>
              <Icon size={20} aria-hidden="true" />
              <span>{t(key)}</span>
            </NavLink>
          ))}
        </nav>
        <button type="button" className="sidebar__search" onClick={() => setSearching(true)} aria-label={t('palette.open')} aria-keyshortcuts="Control+K Meta+K">
          <Search size={18} aria-hidden="true" />
          <span className="sidebar__search-text">{t('palette.open')}</span>
          <kbd className="kbd" aria-hidden="true">
            Ctrl K
          </kbd>
        </button>
        <div className="sidebar__foot">
          <SelectField
            label={t('lang.label')}
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
            options={LANGS.map((l) => ({ value: l.id, label: l.label }))}
          />
          <div className="profile">
            <span className="avatar" aria-hidden="true">
              P
            </span>
            <div>
              <p className="profile__name">{t('profile.name')}</p>
              <p className="muted profile__role">{t('profile.role')}</p>
            </div>
          </div>
        </div>
      </aside>
      <main className="main" id="main" tabIndex={-1}>
        {loadStatus === 'corrupt' && (
          <div className="banner" role="status">
            <AlertTriangle size={18} aria-hidden="true" /> {t('banner.corrupt')}
          </div>
        )}
        {saveFailed && (
          <div className="banner banner--error" role="alert">
            <AlertTriangle size={18} aria-hidden="true" /> {t('banner.saveFailed')}
          </div>
        )}
        <CompanyBar />
        <Outlet />
      </main>
      {searching && <Palette onClose={() => setSearching(false)} />}
    </div>
  );
}
