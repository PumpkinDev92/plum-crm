import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../i18n';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface PanelProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** `palette` is a top-aligned search dialog without a visible title. */
  variant?: 'default' | 'palette';
}

/** Modal side panel: Esc closes, Tab is trapped, focus returns to the opener. */
export function Panel({ title, onClose, children, variant = 'default' }: PanelProps) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const root = ref.current!;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const first = root.querySelector<HTMLElement>('input, select, textarea') ?? root.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!items.length) return;
      const a = items[0];
      const z = items[items.length - 1];
      if (e.shiftKey && document.activeElement === a) {
        e.preventDefault();
        z.focus();
      } else if (!e.shiftKey && document.activeElement === z) {
        e.preventDefault();
        a.focus();
      } else if (!root.contains(document.activeElement)) {
        e.preventDefault();
        a.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = prevOverflow;
      if (opener && document.contains(opener)) opener.focus();
    };
  }, []);

  return createPortal(
    <div className={`overlay${variant === 'palette' ? ' overlay--top' : ''}`} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className={`panel${variant === 'palette' ? ' panel--palette' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        {variant === 'palette' ? (
          <h2 id={titleId} className="sr-only">
            {title}
          </h2>
        ) : (
          <div className="panel__head">
            <h2 id={titleId}>{title}</h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label={t('common.close')}>
              <X size={20} aria-hidden="true" />
            </button>
          </div>
        )}
        <div className={variant === 'palette' ? 'panel__body panel__body--flush' : 'panel__body'}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
