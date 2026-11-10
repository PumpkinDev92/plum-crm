import { AlertCircle, Briefcase, CalendarDays, Check, NotebookPen, Pencil, Plus, StickyNote, Trash2, UserRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { NotePanel } from '../components/Forms';
import { useToast } from '../components/Toast';
import { Button, EmptyState, PageHeader } from '../components/ui';
import { useI18n, type Key } from '../i18n';
import { isOverdue } from '../lib/metrics';
import { useStore } from '../lib/store';
import { toDayKey, type Note } from '../lib/types';

type Filter = 'today' | 'upcoming' | 'overdue' | 'all' | 'done';
const FILTERS: { id: Filter; key: Key }[] = [
  { id: 'today', key: 'notes.f.today' },
  { id: 'upcoming', key: 'notes.f.upcoming' },
  { id: 'overdue', key: 'notes.f.overdue' },
  { id: 'all', key: 'notes.f.all' },
  { id: 'done', key: 'notes.f.done' },
];

const parseDay = (k: string) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export function Notes() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const { notes, deals, contacts, toggleNote, deleteNote, restoreNote } = useStore();
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState<Filter>('today');
  const [editing, setEditing] = useState<{ note?: Note } | null>(null);
  const today = toDayKey(new Date());
  const locale = lang === 'uk' ? 'uk-UA' : lang === 'en' ? 'en-US' : 'ru-RU';
  const dayFmt = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' });

  // Deep link: /notes?note=<id>
  const noteParam = params.get('note');
  useEffect(() => {
    if (!noteParam) return;
    const n = notes.find((x) => x.id === noteParam);
    if (n) {
      setEditing({ note: n });
      setFilter('all');
    }
  }, [noteParam, notes]);
  const closeEditing = () => {
    setEditing(null);
    if (params.has('note')) {
      const next = new URLSearchParams(params);
      next.delete('note');
      setParams(next, { replace: true });
    }
  };

  const visible = useMemo(() => {
    const list = notes.filter((n) => {
      if (filter === 'today') return n.date === today;
      if (filter === 'upcoming') return n.date > today && !n.done;
      if (filter === 'overdue') return isOverdue(n, today);
      if (filter === 'done') return n.done;
      return true;
    });
    const desc = filter === 'done' || filter === 'all';
    return list.sort((a, b) => (desc ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)) || a.createdAt.localeCompare(b.createdAt));
  }, [notes, filter, today]);

  const groups = useMemo(() => {
    const map = new Map<string, Note[]>();
    for (const n of visible) map.set(n.date, [...(map.get(n.date) ?? []), n]);
    return [...map.entries()];
  }, [visible]);

  const counts: Record<Filter, number> = useMemo(
    () => ({
      today: notes.filter((n) => n.date === today).length,
      upcoming: notes.filter((n) => n.date > today && !n.done).length,
      overdue: notes.filter((n) => isOverdue(n, today)).length,
      all: notes.length,
      done: notes.filter((n) => n.done).length,
    }),
    [notes, today],
  );

  const dayLabel = (k: string) => (k === today ? `${t('notes.today')}, ${dayFmt.format(parseDay(k))}` : dayFmt.format(parseDay(k)));

  const remove = (n: Note) => {
    const snap = deleteNote(n.id);
    if (snap) toast({ message: t('toast.noteDeleted'), action: { label: t('common.undo'), onClick: () => restoreNote(snap) } });
  };

  return (
    <>
      <PageHeader
        title={t('notes.title')}
        subtitle={t('notes.subtitle')}
        icon={StickyNote}
        action={
          <Button variant="primary" icon={Plus} onClick={() => setEditing({})}>
            {t('notes.new')}
          </Button>
        }
      />

      <div className="segmented" role="group" aria-label={t('notes.filter')}>
        {FILTERS.map((f) => (
          <button key={f.id} type="button" className={`segmented__btn${filter === f.id ? ' is-active' : ''}`} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
            {t(f.key)}
            <span className={`segmented__count num${f.id === 'overdue' && counts.overdue > 0 ? ' is-alert' : ''}`}>{counts[f.id]}</span>
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title={t('notes.empty')}
          hint={t('notes.emptyHint')}
          action={
            <Button variant="primary" icon={Plus} onClick={() => setEditing({})}>
              {t('notes.new')}
            </Button>
          }
        />
      ) : (
        groups.map(([day, items]) => (
          <section key={day} className="note-group" aria-label={dayLabel(day)}>
            <h2 className="note-group__title">
              <CalendarDays size={16} aria-hidden="true" />
              <span>{dayLabel(day)}</span>
            </h2>
            <ul className="stack">
              {items.map((n) => {
                const deal = deals.find((d) => d.id === n.dealId);
                const contact = contacts.find((c) => c.id === n.contactId);
                const overdue = isOverdue(n, today);
                return (
                  <li key={n.id} className={`card note${n.done ? ' is-done' : ''}${overdue ? ' is-overdue' : ''}`}>
                    <button
                      type="button"
                      className={`check${n.done ? ' is-checked' : ''}`}
                      role="checkbox"
                      aria-checked={n.done}
                      aria-label={`${n.done ? t('notes.markOpen') : t('notes.markDone')}: ${n.text}`}
                      onClick={() => toggleNote(n.id)}
                    >
                      {n.done && <Check size={16} aria-hidden="true" />}
                    </button>
                    <div className="note__body">
                      <p className="note__text">{n.text}</p>
                      {(overdue || deal || contact) && (
                        <div className="note__chips">
                          {overdue && (
                            <span className="chip chip--alert">
                              <AlertCircle size={12} aria-hidden="true" />
                              {t('notes.overdue')}
                            </span>
                          )}
                          {deal && (
                            <button type="button" className="chip" onClick={() => navigate(`/deals?deal=${deal.id}`)} aria-label={t('notes.linkDeal', { title: deal.title })}>
                              <Briefcase size={12} aria-hidden="true" />
                              {deal.title}
                            </button>
                          )}
                          {contact && (
                            <button type="button" className="chip" onClick={() => navigate(`/contacts?contact=${contact.id}`)} aria-label={t('notes.linkContact', { name: contact.name })}>
                              <UserRound size={12} aria-hidden="true" />
                              {contact.name}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="note__actions">
                      <button type="button" className="icon-btn" onClick={() => setEditing({ note: n })} aria-label={`${t('common.edit')}: ${n.text}`}>
                        <Pencil size={16} aria-hidden="true" />
                      </button>
                      <button type="button" className="icon-btn" onClick={() => remove(n)} aria-label={`${t('notes.delete')}: ${n.text}`}>
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      {editing && <NotePanel note={editing.note} onClose={closeEditing} />}
    </>
  );
}
