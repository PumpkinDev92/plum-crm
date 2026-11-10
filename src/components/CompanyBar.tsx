import { Check, ChevronsUpDown, Copy, Download, Eye, EyeOff, Pencil, Plus, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useI18n, type Key } from '../i18n';
import { copyText } from '../lib/clipboard';
import { useStore } from '../lib/store';
import { buildBackup, parseBackup } from '../lib/storage';
import { CompanyPanel } from './Forms';
import { Panel } from './Panel';
import { useToast } from './Toast';
import { Button } from './ui';

type Field = 'account' | 'inn' | 'iban';
const FIELDS: { id: Field; label: Key }[] = [
  { id: 'account', label: 'company.account' },
  { id: 'inn', label: 'company.inn' },
  { id: 'iban', label: 'company.iban' },
];

const mask = (v: string) => (v.length > 4 ? `•••• ${v.slice(-4)}` : '••••');

/** Always-visible block: which company's workspace the user is in, plus quick-copy requisites. */
export function CompanyBar({ sample = false }: { sample?: boolean }) {
  const { t } = useI18n();
  const { company } = useStore();
  const [hidden, setHidden] = useState(true);
  const [copied, setCopied] = useState<Field | null>(null);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [adding, setAdding] = useState(false);
  const timer = useRef<number>();
  // The kit page shows a second copy; only the real one is a landmark.
  const Wrapper = (sample ? 'div' : 'section') as 'section';

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async (f: Field) => {
    const ok = await copyText(company[f]);
    setFailed(!ok);
    setCopied(ok ? f : null);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setCopied(null);
      setFailed(false);
    }, 1800);
  };

  return (
    <Wrapper className="company card" aria-label={t('company.workspace')} role={sample ? 'group' : undefined}>
      <div className="company__id">
        {company.photo ? (
          <img className="company__photo" src={company.photo} alt="" />
        ) : (
          <span className="company__photo company__photo--fallback" aria-hidden="true">
            {company.name.trim().charAt(0).toUpperCase() || 'P'}
          </span>
        )}
        <div className="company__names">
          <p className="company__kicker muted">{t('company.workspace')}</p>
          <h2 className="company__name">{company.name}</h2>
        </div>
      </div>

      <dl className="company__reqs">
        {FIELDS.map(({ id, label }) => {
          const value = company[id];
          const name = t(label);
          return (
            <div key={id} className="req">
              <dt className="req__label">{name}</dt>
              <dd className="req__row">
                <span className="req__value num">
                  {value ? (
                    hidden ? (
                      <>
                        <span aria-hidden="true">{mask(value)}</span>
                        <span className="sr-only">{t('company.hidden')}</span>
                      </>
                    ) : (
                      value
                    )
                  ) : (
                    t('common.dash')
                  )}
                </span>
                {value && (
                  <button
                    type="button"
                    className={`icon-btn req__copy${copied === id ? ' is-ok' : ''}`}
                    onClick={() => copy(id)}
                    aria-label={t('company.copy', { label: name })}
                  >
                    {copied === id ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                  </button>
                )}
              </dd>
            </div>
          );
        })}
      </dl>

      <div className="company__actions">
        <button
          type="button"
          className="icon-btn icon-btn--bordered"
          onClick={() => setHidden((h) => !h)}
          aria-pressed={!hidden}
          aria-label={hidden ? t('company.show') : t('company.hide')}
          title={hidden ? t('company.show') : t('company.hide')}
        >
          {hidden ? <Eye size={18} aria-hidden="true" /> : <EyeOff size={18} aria-hidden="true" />}
        </button>
        <button type="button" className="icon-btn icon-btn--bordered" onClick={() => setSwitching(true)} aria-label={t('company.switch')} title={t('company.switch')}>
          <ChevronsUpDown size={18} aria-hidden="true" />
        </button>
        <button type="button" className="icon-btn icon-btn--bordered" onClick={() => setEditing(true)} aria-label={t('company.edit')} title={t('company.edit')}>
          <Pencil size={18} aria-hidden="true" />
        </button>
      </div>

      <p className="sr-only" role="status">
        {copied ? t('company.copied') : failed ? t('company.copyFailed') : ''}
      </p>
      {copied && (
        <span className="company__toast" aria-hidden="true">
          {t('company.copied')}
        </span>
      )}
      {failed && (
        <span className="company__toast company__toast--error" aria-hidden="true">
          {t('company.copyFailed')}
        </span>
      )}

      {editing && <CompanyPanel onClose={() => setEditing(false)} />}
      {adding && <CompanyPanel mode="new" onClose={() => setAdding(false)} />}
      {switching && (
        <CompanySwitcher
          onClose={() => setSwitching(false)}
          onAdd={() => {
            setSwitching(false);
            setAdding(true);
          }}
        />
      )}
    </Wrapper>
  );
}

/** Lists company workspaces, lets the user add one, and handles backup export / import. */
function CompanySwitcher({ onClose, onAdd }: { onClose: () => void; onAdd: () => void }) {
  const { t, number } = useI18n();
  const toast = useToast();
  const { workspaces, activeId, switchWorkspace, getState, replaceState } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const open = (id: string, name: string) => {
    if (id !== activeId) {
      switchWorkspace(id);
      toast({ message: t('toast.companySwitched', { name }) });
    }
    onClose();
  };

  const exportBackup = () => {
    const blob = new Blob([buildBackup(getState())], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plum-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast({ message: t('toast.backupExported') });
  };

  const importBackup = async (file?: File) => {
    if (!file) return;
    let next = null;
    try {
      next = parseBackup(await file.text());
    } catch {
      next = null;
    }
    if (!next) {
      toast({ message: t('toast.backupFailed') });
      return;
    }
    const prev = replaceState(next);
    onClose();
    toast({ message: t('toast.backupImported'), action: { label: t('common.undo'), onClick: () => replaceState(prev) } });
  };

  const state = getState();
  return (
    <Panel title={t('company.switcherTitle')} onClose={onClose}>
      <section aria-labelledby="ws-h" className="ws">
        <h3 id="ws-h" className="linked__title">
          {t('company.list')}
        </h3>
        <ul className="ws__list">
          {workspaces.map((w) => {
            const full = state.workspaces.find((x) => x.id === w.id);
            const current = w.id === activeId;
            return (
              <li key={w.id}>
                <button type="button" className={`ws__item${current ? ' is-current' : ''}`} aria-current={current || undefined} onClick={() => open(w.id, w.company.name)} aria-label={t('company.open', { name: w.company.name })}>
                  {w.company.photo ? (
                    <img className="company__photo company__photo--sm" src={w.company.photo} alt="" />
                  ) : (
                    <span className="company__photo company__photo--sm company__photo--fallback" aria-hidden="true">
                      {w.company.name.trim().charAt(0).toUpperCase() || 'P'}
                    </span>
                  )}
                  <span className="ws__text">
                    <span className="ws__name">{w.company.name}</span>
                    <span className="muted ws__meta">{t('company.counts', { deals: number(full?.deals.length ?? 0), contacts: number(full?.contacts.length ?? 0) })}</span>
                  </span>
                  {current && <span className="badge badge--won">{t('company.current')}</span>}
                </button>
              </li>
            );
          })}
        </ul>
        <Button icon={Plus} onClick={onAdd}>
          {t('company.add')}
        </Button>
      </section>

      <section aria-labelledby="bk-h" className="ws ws--backup">
        <h3 id="bk-h" className="linked__title">
          {t('backup.title')}
        </h3>
        <p className="muted">{t('backup.hint')}</p>
        <div className="row">
          <Button icon={Download} onClick={exportBackup}>
            {t('backup.export')}
          </Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => { importBackup(e.target.files?.[0]); e.target.value = ''; }} />
          <Button icon={Upload} onClick={() => fileRef.current?.click()}>
            {t('backup.import')}
          </Button>
        </div>
      </section>
    </Panel>
  );
}
