import { ExternalLink, ImagePlus, Trash2 } from 'lucide-react';
import { useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { imageToAvatar } from '../lib/clipboard';
import { useStore } from '../lib/store';
import { isDayKey, toDayKey, type Contact, type Deal, type Note, type Stage } from '../lib/types';
import { Panel } from './Panel';
import { useToast } from './Toast';
import { Button, SelectField, StageBadge, TextAreaField, TextField, useStageOptions } from './ui';

export function parseAmount(raw: string): number | null {
  const s = raw.trim().replace(/\s/g, '').replace(',', '.');
  if (!s || !/^\d*\.?\d+$|^\d+\.$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/* ---------- Deal ---------- */
export function DealPanel({ deal, defaultStage, onClose }: { deal?: Deal; defaultStage?: Stage; onClose: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const { contacts, addDeal, updateDeal, deleteDeal, restoreDeal } = useStore();
  const stageOptions = useStageOptions();
  const [title, setTitle] = useState(deal?.title ?? '');
  const [company, setCompany] = useState(deal?.company ?? '');
  const [amount, setAmount] = useState(deal ? String(deal.amount) : '');
  const [stage, setStage] = useState<Stage>(deal?.stage ?? defaultStage ?? 'new');
  const [contactId, setContactId] = useState(deal?.contactId ?? '');
  const [submitted, setSubmitted] = useState(false);
  const contact = contacts.find((c) => c.id === contactId);

  const errs = {
    title: !title.trim() ? t('common.required') : '',
    company: !company.trim() ? t('common.required') : '',
    amount: parseAmount(amount) === null ? t('deals.err.amount') : '',
  };
  const show = (k: keyof typeof errs) => (submitted ? errs[k] : '');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (errs.title || errs.company || errs.amount) return;
    const input = { title: title.trim(), company: company.trim(), amount: parseAmount(amount)!, stage, contactId: contactId || undefined };
    if (deal) updateDeal(deal.id, input);
    else addDeal(input);
    toast({ message: deal ? t('toast.dealSaved') : t('toast.dealCreated') });
    onClose();
  };

  const remove = () => {
    if (!deal) return;
    const snap = deleteDeal(deal.id);
    onClose();
    if (snap) toast({ message: t('toast.dealDeleted'), action: { label: t('common.undo'), onClick: () => restoreDeal(snap) } });
  };

  return (
    <Panel title={deal ? t('deals.formEdit') : t('deals.formNew')} onClose={onClose}>
      <form onSubmit={submit} noValidate className="form">
        <TextField label={t('deals.f.title')} value={title} onChange={(e) => setTitle(e.target.value)} error={show('title')} required />
        <TextField label={t('deals.f.company')} value={company} onChange={(e) => setCompany(e.target.value)} error={show('company')} required />
        <TextField label={t('deals.f.amount')} value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" error={show('amount')} required />
        <SelectField label={t('deals.f.stage')} value={stage} onChange={(e) => setStage(e.target.value as Stage)} options={stageOptions} required />
        <SelectField
          label={t('deals.f.contact')}
          value={contactId}
          onChange={(e) => setContactId(e.target.value)}
          options={[{ value: '', label: t('common.none') }, ...contacts.map((c) => ({ value: c.id, label: `${c.name} — ${c.company}` }))]}
        />
        {deal && contact && (
          <button type="button" className="link-btn" onClick={() => navigate(`/contacts?contact=${contact.id}`)}>
            <ExternalLink size={14} aria-hidden="true" />
            {t('deals.openContact', { name: contact.name })}
          </button>
        )}
        <div className="form__actions">
          {deal && (
            <Button variant="danger" icon={Trash2} onClick={remove} className="form__danger">
              {t('common.delete')}
            </Button>
          )}
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" type="submit">
            {deal ? t('common.save') : t('common.create')}
          </Button>
        </div>
      </form>
    </Panel>
  );
}

/* ---------- Contact ---------- */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ContactPanel({ contact, onClose }: { contact?: Contact; onClose: () => void }) {
  const { t, money } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const { deals, addContact, updateContact, deleteContact, restoreContact } = useStore();
  const [name, setName] = useState(contact?.name ?? '');
  const [company, setCompany] = useState(contact?.company ?? '');
  const [position, setPosition] = useState(contact?.position ?? '');
  const [email, setEmail] = useState(contact?.email ?? '');
  const [submitted, setSubmitted] = useState(false);
  const theirDeals = useMemo(() => (contact ? deals.filter((d) => d.contactId === contact.id) : []), [deals, contact]);

  const errs = {
    name: !name.trim() ? t('common.required') : '',
    company: !company.trim() ? t('common.required') : '',
    email: email.trim() && !EMAIL.test(email.trim()) ? t('contacts.err.email') : '',
  };
  const show = (k: keyof typeof errs) => (submitted ? errs[k] : '');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (errs.name || errs.company || errs.email) return;
    const input = { name: name.trim(), company: company.trim(), position: position.trim(), email: email.trim() };
    if (contact) updateContact(contact.id, input);
    else addContact(input);
    toast({ message: contact ? t('toast.contactSaved') : t('toast.contactCreated') });
    onClose();
  };

  const remove = () => {
    if (!contact) return;
    const snap = deleteContact(contact.id);
    onClose();
    if (snap) toast({ message: t('toast.contactDeleted'), action: { label: t('common.undo'), onClick: () => restoreContact(snap) } });
  };

  return (
    <Panel title={contact ? t('contacts.formEdit') : t('contacts.formNew')} onClose={onClose}>
      <form onSubmit={submit} noValidate className="form">
        <TextField label={t('contacts.f.name')} value={name} onChange={(e) => setName(e.target.value)} error={show('name')} required />
        <TextField label={t('contacts.f.company')} value={company} onChange={(e) => setCompany(e.target.value)} error={show('company')} required />
        <TextField label={t('contacts.f.position')} value={position} onChange={(e) => setPosition(e.target.value)} />
        <TextField label={t('contacts.f.email')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={show('email')} />

        {contact && (
          <section className="linked" aria-labelledby="linked-h">
            <h3 id="linked-h" className="linked__title">
              {t('contacts.deals')} <span className="muted num">({theirDeals.length})</span>
            </h3>
            {theirDeals.length === 0 ? (
              <p className="muted">{t('contacts.noDeals')}</p>
            ) : (
              <ul className="linked__list">
                {theirDeals.map((d) => (
                  <li key={d.id}>
                    <button type="button" className="linked__item" onClick={() => navigate(`/deals?deal=${d.id}`)} aria-label={t('contacts.openDeal', { title: d.title })}>
                      <span className="linked__main">{d.title}</span>
                      <span className="linked__side">
                        <span className="num">{money(d.amount)}</span>
                        <StageBadge stage={d.stage} />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <div className="form__actions">
          {contact && (
            <Button variant="danger" icon={Trash2} onClick={remove} className="form__danger">
              {t('common.delete')}
            </Button>
          )}
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" type="submit">
            {contact ? t('common.save') : t('common.create')}
          </Button>
        </div>
      </form>
    </Panel>
  );
}

/* ---------- Note ---------- */
export function NotePanel({ note, onClose }: { note?: Note; onClose: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const { deals, contacts, addNote, updateNote, deleteNote, restoreNote } = useStore();
  const [text, setText] = useState(note?.text ?? '');
  const [date, setDate] = useState(note?.date ?? toDayKey(new Date()));
  const [dealId, setDealId] = useState(note?.dealId ?? '');
  const [contactId, setContactId] = useState(note?.contactId ?? '');
  const [submitted, setSubmitted] = useState(false);
  const errText = !text.trim() ? t('notes.err.text') : '';
  const errDate = !isDayKey(date) ? t('common.required') : '';

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (errText || errDate) return;
    const input = { text: text.trim(), date, dealId: dealId || undefined, contactId: contactId || undefined };
    if (note) updateNote(note.id, input);
    else addNote(input);
    toast({ message: note ? t('toast.noteSaved') : t('toast.noteCreated') });
    onClose();
  };

  const remove = () => {
    if (!note) return;
    const snap = deleteNote(note.id);
    onClose();
    if (snap) toast({ message: t('toast.noteDeleted'), action: { label: t('common.undo'), onClick: () => restoreNote(snap) } });
  };

  return (
    <Panel title={note ? t('notes.formEdit') : t('notes.formNew')} onClose={onClose}>
      <form onSubmit={submit} noValidate className="form">
        <TextAreaField label={t('notes.f.text')} value={text} onChange={(e) => setText(e.target.value)} rows={4} error={submitted ? errText : ''} required />
        <TextField label={t('notes.f.date')} type="date" value={date} onChange={(e) => setDate(e.target.value)} error={submitted ? errDate : ''} required />
        <SelectField
          label={t('notes.deal')}
          value={dealId}
          onChange={(e) => setDealId(e.target.value)}
          options={[{ value: '', label: t('notes.noLink') }, ...deals.map((d) => ({ value: d.id, label: `${d.title} — ${d.company}` }))]}
        />
        <SelectField
          label={t('notes.contact')}
          value={contactId}
          onChange={(e) => setContactId(e.target.value)}
          options={[{ value: '', label: t('notes.noLink') }, ...contacts.map((c) => ({ value: c.id, label: `${c.name} — ${c.company}` }))]}
        />
        <div className="form__actions">
          {note && (
            <Button variant="danger" icon={Trash2} onClick={remove} className="form__danger">
              {t('common.delete')}
            </Button>
          )}
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" type="submit">
            {note ? t('common.save') : t('common.create')}
          </Button>
        </div>
      </form>
    </Panel>
  );
}

/* ---------- Company ---------- */
export function CompanyPanel({ mode = 'edit', onClose }: { mode?: 'edit' | 'new'; onClose: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const { company, updateCompany, addWorkspace } = useStore();
  const base = mode === 'edit' ? company : { name: '', account: '', inn: '', iban: '', photo: undefined };
  const [name, setName] = useState(base.name);
  const [account, setAccount] = useState(base.account);
  const [inn, setInn] = useState(base.inn);
  const [iban, setIban] = useState(base.iban);
  const [photo, setPhoto] = useState<string | undefined>(base.photo);
  const [photoError, setPhotoError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const errName = !name.trim() ? t('common.required') : '';

  const pick = async (file?: File) => {
    if (!file) return;
    try {
      setPhoto(await imageToAvatar(file));
      setPhotoError('');
    } catch {
      setPhotoError(t('company.err.photo'));
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (errName) return;
    const input = { name: name.trim(), account: account.trim(), inn: inn.trim(), iban: iban.replace(/\s+/g, ' ').trim(), photo };
    if (mode === 'edit') {
      updateCompany(input);
      toast({ message: t('toast.companySaved') });
    } else {
      addWorkspace(input);
      toast({ message: t('toast.companyAdded') });
    }
    onClose();
  };

  return (
    <Panel title={mode === 'edit' ? t('company.formTitle') : t('company.formNew')} onClose={onClose}>
      <form onSubmit={submit} noValidate className="form">
        <div className="photo-pick">
          {photo ? (
            <img src={photo} alt="" className="company__photo company__photo--lg" />
          ) : (
            <span className="company__photo company__photo--lg company__photo--fallback" aria-hidden="true">
              {name.trim().charAt(0).toUpperCase() || 'P'}
            </span>
          )}
          <div className="photo-pick__actions">
            <input ref={fileRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => pick(e.target.files?.[0])} />
            <Button icon={ImagePlus} onClick={() => fileRef.current?.click()}>
              {t('company.photoChoose')}
            </Button>
            {photo && (
              <Button variant="ghost" icon={Trash2} onClick={() => setPhoto(undefined)}>
                {t('company.photoRemove')}
              </Button>
            )}
            {photoError && <p className="field__msg field__msg--error">{photoError}</p>}
          </div>
        </div>
        <TextField label={t('company.f.name')} value={name} onChange={(e) => setName(e.target.value)} error={submitted ? errName : ''} required />
        <TextField label={t('company.account')} value={account} onChange={(e) => setAccount(e.target.value)} inputMode="numeric" autoComplete="off" />
        <TextField label={t('company.inn')} value={inn} onChange={(e) => setInn(e.target.value)} inputMode="numeric" autoComplete="off" />
        <TextField label={t('company.iban')} value={iban} onChange={(e) => setIban(e.target.value)} autoComplete="off" />
        <div className="form__actions">
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" type="submit">
            {mode === 'edit' ? t('common.save') : t('common.create')}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
