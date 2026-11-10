import { Briefcase, Building2, Mail, Pencil, Plus, User, Users, UsersRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ContactPanel } from '../components/Forms';
import { Button, EmptyState, PageHeader, SearchInput, SelectField, Table, type HeadCell } from '../components/ui';
import { useI18n } from '../i18n';
import { filterContacts, sortContacts, type ContactSortKey } from '../lib/metrics';
import { useStore } from '../lib/store';
import type { Contact } from '../lib/types';
import { useMediaQuery } from '../lib/useMediaQuery';

type Editing = { contact?: Contact } | null;
const KEYS: ContactSortKey[] = ['name', 'company', 'position', 'email'];

export function Contacts() {
  const { t, number } = useI18n();
  const { contacts, deals } = useStore();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Editing>(null);
  const [sort, setSort] = useState<{ key: ContactSortKey; dir: 'asc' | 'desc' }>({ key: 'name', dir: 'asc' });
  const wide = useMediaQuery('(min-width: 760px)');
  const items = useMemo(() => sortContacts(filterContacts(contacts, query), sort.key, sort.dir), [contacts, query, sort]);
  const dash = t('common.dash');
  const dealCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of deals) if (d.contactId) m.set(d.contactId, (m.get(d.contactId) ?? 0) + 1);
    return m;
  }, [deals]);

  // Deep link: /contacts?contact=<id>
  const contactParam = params.get('contact');
  useEffect(() => {
    if (!contactParam) return;
    const c = contacts.find((x) => x.id === contactParam);
    if (c) setEditing({ contact: c });
  }, [contactParam, contacts]);
  const closeEditing = () => {
    setEditing(null);
    if (params.has('contact')) {
      const next = new URLSearchParams(params);
      next.delete('contact');
      setParams(next, { replace: true });
    }
  };

  const toggleSort = (key: ContactSortKey) => setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  const labels: Record<ContactSortKey, string> = {
    name: t('contacts.f.name'),
    company: t('contacts.f.company'),
    position: t('contacts.f.position'),
    email: t('contacts.f.email'),
  };
  const icons = { name: User, company: Building2, position: Briefcase, email: Mail } as const;
  const head: (string | HeadCell)[] = [
    ...KEYS.map((k) => ({ label: labels[k], icon: icons[k], sort: sort.key === k ? sort.dir : ('none' as const), onSort: () => toggleSort(k) })),
    t('contacts.dealsCount'),
    '',
  ];

  const editBtn = (c: Contact) => (
    <button type="button" className="icon-btn" onClick={() => setEditing({ contact: c })} aria-label={t('contacts.edit', { name: c.name })}>
      <Pencil size={16} aria-hidden="true" />
    </button>
  );

  return (
    <>
      <PageHeader
        title={t('contacts.title')}
        icon={Users}
        action={
          <Button variant="primary" icon={Plus} onClick={() => setEditing({})}>
            {t('contacts.new')}
          </Button>
        }
      />
      <div className="toolbar">
        <SearchInput value={query} onChange={setQuery} label={t('contacts.search')} />
        {!wide && (
          <SelectField
            label={t('contacts.sort')}
            value={sort.key}
            onChange={(e) => setSort({ key: e.target.value as ContactSortKey, dir: 'asc' })}
            options={KEYS.map((k) => ({ value: k, label: labels[k] }))}
          />
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState icon={UsersRound} title={t('contacts.empty')} hint={t('contacts.emptyHint')} />
      ) : wide ? (
        <Table caption={t('contacts.table')} head={head}>
          {items.map((c) => (
            <tr key={c.id}>
              <th scope="row">
                <span className="person">
                  <span className="avatar avatar--sm" aria-hidden="true">
                    {c.name.charAt(0)}
                  </span>
                  {c.name}
                </span>
              </th>
              <td>{c.company}</td>
              <td>{c.position || dash}</td>
              <td>{c.email ? <a href={`mailto:${c.email}`}>{c.email}</a> : dash}</td>
              <td className="num">{number(dealCount.get(c.id) ?? 0)}</td>
              <td className="table__action">{editBtn(c)}</td>
            </tr>
          ))}
        </Table>
      ) : (
        <ul className="stack" aria-label={t('contacts.title')}>
          {items.map((c) => (
            <li key={c.id} className="card contact">
              <div className="deal__top">
                <h2 className="deal__title">{c.name}</h2>
                {editBtn(c)}
              </div>
              <p className="deal__meta">
                <Building2 size={14} aria-hidden="true" /> {c.company}
              </p>
              <p className="deal__meta">
                <Briefcase size={14} aria-hidden="true" /> {c.position || dash}
              </p>
              {c.email && (
                <p className="deal__meta">
                  <Mail size={14} aria-hidden="true" /> <a href={`mailto:${c.email}`}>{c.email}</a>
                </p>
              )}
              <p className="deal__meta muted">
                {t('contacts.dealsCount')}: <span className="num">{number(dealCount.get(c.id) ?? 0)}</span>
              </p>
            </li>
          ))}
        </ul>
      )}

      {editing && <ContactPanel contact={editing.contact} onClose={closeEditing} />}
    </>
  );
}
