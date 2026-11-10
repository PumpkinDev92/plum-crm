import { ArrowDown, ArrowUp, ArrowUpDown, CheckCircle2, CircleDashed, FileText, Search, Sparkles, Timer, X, XCircle, type LucideIcon } from 'lucide-react';
import { useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { useI18n } from '../i18n';
import { STAGES, type Stage } from '../lib/types';

/* ---------- Button ---------- */
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: LucideIcon;
  /** Force a visual state (used on the UI-kit page only). */
  forceState?: 'hover' | 'focus';
}

export function Button({ variant = 'secondary', icon: Icon, forceState, className = '', children, type = 'button', ...rest }: ButtonProps) {
  const cls = ['btn', `btn--${variant}`, forceState ? `is-${forceState}` : '', className].filter(Boolean).join(' ');
  return (
    <button type={type} className={cls} {...rest}>
      {Icon && <Icon size={18} aria-hidden="true" />}
      {children}
    </button>
  );
}

/* ---------- Fields ---------- */
interface FieldShellProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: (p: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
}

function FieldShell({ label, error, hint, required, children }: FieldShellProps) {
  const id = useId();
  const msgId = `${id}-msg`;
  const message = error || hint;
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
        {required && <span aria-hidden="true" className="field__req"> *</span>}
      </label>
      {children({ id, describedBy: message ? msgId : undefined, invalid: !!error })}
      {message && (
        <p id={msgId} className={error ? 'field__msg field__msg--error' : 'field__msg'}>
          {message}
        </p>
      )}
    </div>
  );
}

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  error?: string;
  hint?: string;
  forceState?: 'hover' | 'focus';
}

export function TextField({ label, error, hint, forceState, required, className = '', ...rest }: TextFieldProps) {
  return (
    <FieldShell label={label} error={error} hint={hint} required={required}>
      {({ id, describedBy, invalid }) => (
        <input
          id={id}
          className={`input ${forceState ? `is-${forceState}` : ''} ${className}`}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          {...rest}
        />
      )}
    </FieldShell>
  );
}

interface TextAreaFieldProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  label: string;
  error?: string;
}

export function TextAreaField({ label, error, required, className = '', ...rest }: TextAreaFieldProps) {
  return (
    <FieldShell label={label} error={error} required={required}>
      {({ id, describedBy, invalid }) => (
        <textarea
          id={id}
          className={`input textarea ${className}`}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          {...rest}
        />
      )}
    </FieldShell>
  );
}

interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  label: string;
  error?: string;
  hint?: string;
  hideLabel?: boolean;
  options: { value: string; label: string }[];
}

export function SelectField({ label, error, hint, hideLabel, options, required, className = '', ...rest }: SelectFieldProps) {
  const id = useId();
  const msgId = `${id}-msg`;
  const message = error || hint;
  return (
    <div className="field">
      <label className={hideLabel ? 'sr-only' : 'field__label'} htmlFor={id}>
        {label}
        {required && !hideLabel && <span aria-hidden="true" className="field__req"> *</span>}
      </label>
      <select
        id={id}
        className={`input select ${className}`}
        aria-invalid={!!error || undefined}
        aria-describedby={message ? msgId : undefined}
        required={required}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {message && (
        <p id={msgId} className={error ? 'field__msg field__msg--error' : 'field__msg'}>
          {message}
        </p>
      )}
    </div>
  );
}

/* ---------- Search ---------- */
export function SearchInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const { t } = useI18n();
  const id = useId();
  return (
    <div className="search">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search size={18} className="search__icon" aria-hidden="true" />
      <input id={id} type="search" className="input search__input" placeholder={label} value={value} onChange={(e) => onChange(e.target.value)} />
      {value && (
        <button type="button" className="search__clear" onClick={() => onChange('')} aria-label={t('search.clear')}>
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

/* ---------- Stage ---------- */
export const STAGE_ICON: Record<Stage, LucideIcon> = {
  new: Sparkles,
  progress: Timer,
  proposal: FileText,
  won: CheckCircle2,
  lost: XCircle,
};

export function StageBadge({ stage }: { stage: Stage }) {
  const { t } = useI18n();
  const Icon = STAGE_ICON[stage] ?? CircleDashed;
  return (
    <span className={`badge badge--${stage}`}>
      <Icon size={12} aria-hidden="true" />
      {t(`stage.${stage}`)}
    </span>
  );
}

export function useStageOptions(withAll = false) {
  const { t } = useI18n();
  const base = STAGES.map((s) => ({ value: s as string, label: t(`stage.${s}`) }));
  return withAll ? [{ value: 'all', label: t('stage.all') }, ...base] : base;
}

/* ---------- Cards ---------- */
export function MetricCard({ label, value, hint, icon: Icon }: { label: string; value: string; hint?: string; icon?: LucideIcon }) {
  return (
    <div className="card metric">
      <div className="metric__top">
        <p className="metric__label">{label}</p>
        {Icon && (
          <span className="metric__icon" aria-hidden="true">
            <Icon size={18} />
          </span>
        )}
      </div>
      <p className="metric__value">{value}</p>
      {hint && <p className="metric__hint">{hint}</p>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, hint, action }: { icon: LucideIcon; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="empty" role="status">
      <Icon size={32} aria-hidden="true" />
      <p className="empty__title">{title}</p>
      {hint && <p className="empty__hint">{hint}</p>}
      {action}
    </div>
  );
}

/* ---------- Table ---------- */
export interface HeadCell {
  label: string;
  icon?: LucideIcon;
  /** Present on sortable columns. */
  sort?: 'asc' | 'desc' | 'none';
  onSort?: () => void;
}

export function Table({ caption, head, icons, children }: { caption: string; head: (string | HeadCell)[]; icons?: (LucideIcon | undefined)[]; children: ReactNode }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {head.map((h, i) => {
              const cell: HeadCell = typeof h === 'string' ? { label: h } : h;
              const Icon = cell.icon ?? icons?.[i];
              const inner = (
                <span className="th-inner">
                  {Icon && <Icon size={14} aria-hidden="true" />}
                  {cell.label}
                  {cell.sort && (cell.sort === 'asc' ? <ArrowUp size={14} aria-hidden="true" /> : cell.sort === 'desc' ? <ArrowDown size={14} aria-hidden="true" /> : <ArrowUpDown size={14} className="th-inner__idle" aria-hidden="true" />)}
                </span>
              );
              return (
                <th key={i} scope="col" aria-sort={cell.sort === 'asc' ? 'ascending' : cell.sort === 'desc' ? 'descending' : cell.onSort ? 'none' : undefined}>
                  {cell.onSort ? (
                    <button type="button" className="th-btn" onClick={cell.onSort}>
                      {inner}
                    </button>
                  ) : (
                    inner
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function PageHeader({ title, subtitle, action, icon: Icon }: { title: string; subtitle?: string; action?: ReactNode; icon?: LucideIcon }) {
  return (
    <header className="page-head">
      <div className="page-head__title">
        {Icon && (
          <span className="page-head__icon" aria-hidden="true">
            <Icon size={22} />
          </span>
        )}
        <div>
          <h1>{title}</h1>
          {subtitle && <p className="muted">{subtitle}</p>}
        </div>
      </div>
      {action}
    </header>
  );
}
