import { Briefcase, LayoutDashboard, Search, StickyNote, UserRound, Users, type LucideIcon } from 'lucide-react';
import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { latestDeals } from '../lib/metrics';
import { useStore } from '../lib/store';
import { Panel } from './Panel';

interface Result {
  id: string;
  group: 'pages' | 'deals' | 'contacts' | 'notes';
  label: string;
  hint?: string;
  icon: LucideIcon;
  to: string;
}

const norm = (s: string) => s.toLowerCase();

export function Palette({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { deals, contacts, notes } = useStore();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listId = useId();

  const results = useMemo<Result[]>(() => {
    const q = norm(query.trim());
    const pages: Result[] = [
      { id: 'p-overview', group: 'pages', label: t('nav.overview'), icon: LayoutDashboard, to: '/' },
      { id: 'p-deals', group: 'pages', label: t('nav.deals'), icon: Briefcase, to: '/deals' },
      { id: 'p-contacts', group: 'pages', label: t('nav.contacts'), icon: Users, to: '/contacts' },
      { id: 'p-notes', group: 'pages', label: t('nav.notes'), icon: StickyNote, to: '/notes' },
    ].filter((p) => !q || norm(p.label).includes(q)) as Result[];

    const dealList = (q ? deals.filter((d) => norm(d.title).includes(q) || norm(d.company).includes(q)) : latestDeals(deals, 4)).slice(0, 6);
    const contactList = q ? contacts.filter((c) => norm(c.name).includes(q) || norm(c.company).includes(q) || norm(c.email).includes(q)).slice(0, 6) : [];
    const noteList = q ? notes.filter((n) => norm(n.text).includes(q)).slice(0, 5) : [];

    return [
      ...pages,
      ...dealList.map<Result>((d) => ({ id: `d-${d.id}`, group: 'deals', label: d.title, hint: d.company, icon: Briefcase, to: `/deals?deal=${d.id}` })),
      ...contactList.map<Result>((c) => ({ id: `c-${c.id}`, group: 'contacts', label: c.name, hint: c.company, icon: UserRound, to: `/contacts?contact=${c.id}` })),
      ...noteList.map<Result>((n) => ({ id: `n-${n.id}`, group: 'notes', label: n.text, hint: n.date, icon: StickyNote, to: `/notes?note=${n.id}` })),
    ];
  }, [query, deals, contacts, notes, t]);

  const idx = Math.min(active, Math.max(results.length - 1, 0));
  const go = (r: Result) => {
    onClose();
    navigate(r.to);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((idx + 1) % Math.max(results.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((idx - 1 + results.length) % Math.max(results.length, 1));
    } else if (e.key === 'Enter' && results[idx]) {
      e.preventDefault();
      go(results[idx]);
    }
  };

  const groups = (['pages', 'deals', 'contacts', 'notes'] as const).map((g) => ({ g, items: results.filter((r) => r.group === g) })).filter((x) => x.items.length);

  return (
    <Panel title={t('palette.title')} onClose={onClose} variant="palette">
      <div className="palette__search">
        <Search size={18} aria-hidden="true" />
        <input
          className="palette__input"
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={results[idx] ? `${listId}-${results[idx].id}` : undefined}
          aria-label={t('palette.title')}
          placeholder={t('palette.placeholder')}
          autoComplete="off"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKey}
        />
        <kbd className="kbd">Esc</kbd>
      </div>
      <p className="sr-only" role="status">
        {results.length ? t('palette.results', { n: results.length }) : t('palette.empty')}
      </p>
      <div id={listId} role="listbox" aria-label={t('palette.title')} className="palette__list">
        {results.length === 0 && <p className="palette__empty muted">{t('palette.empty')}</p>}
        {groups.map(({ g, items }) => (
          <div key={g} role="group" aria-label={t(`palette.${g}` as const)}>
            <p className="palette__group" aria-hidden="true">
              {t(`palette.${g}` as const)}
            </p>
            {items.map((r) => {
              const i = results.indexOf(r);
              const Icon = r.icon;
              return (
                <div
                  key={r.id}
                  id={`${listId}-${r.id}`}
                  role="option"
                  aria-selected={i === idx}
                  className={`palette__item${i === idx ? ' is-active' : ''}`}
                  onMouseMove={() => setActive(i)}
                  onClick={() => go(r)}
                >
                  <Icon size={16} aria-hidden="true" />
                  <span className="palette__label">{r.label}</span>
                  {r.hint && <span className="palette__hint muted">{r.hint}</span>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <p className="palette__keys muted" aria-hidden="true">
        {t('palette.keys')}
      </p>
    </Panel>
  );
}
