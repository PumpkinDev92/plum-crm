import { X } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useI18n } from '../i18n';

interface ToastInput {
  message: string;
  /** Optional single action, e.g. "Undo". */
  action?: { label: string; onClick: () => void };
  /** Auto-dismiss delay in ms (default 6000). */
  duration?: number;
}
interface ToastItem extends ToastInput {
  id: number;
}

const Ctx = createContext<((t: ToastInput) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => setItems((xs) => xs.filter((x) => x.id !== id)), []);
  const push = useCallback((input: ToastInput) => {
    const id = ++seq.current;
    setItems((xs) => [...xs.slice(-2), { ...input, id }]);
  }, []);
  const value = useMemo(() => push, [push]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="toasts" role="region" aria-label={t('toast.region')}>
        {items.map((x) => (
          <ToastView key={x.id} item={x} onDismiss={() => dismiss(x.id)} />
        ))}
      </div>
    </Ctx.Provider>
  );
}

function ToastView({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const { t } = useI18n();
  const [paused, setPaused] = useState(false);
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  useEffect(() => {
    if (paused) return;
    const id = window.setTimeout(() => dismissRef.current(), item.duration ?? 6000);
    return () => window.clearTimeout(id);
  }, [paused, item.duration]);

  return (
    <div
      className="toast"
      role="status"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <span className="toast__msg">{item.message}</span>
      {item.action && (
        <button
          type="button"
          className="toast__action"
          onClick={() => {
            item.action!.onClick();
            onDismiss();
          }}
        >
          {item.action.label}
        </button>
      )}
      <button type="button" className="icon-btn toast__close" onClick={onDismiss} aria-label={t('common.dismiss')}>
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

export function useToast() {
  const v = useContext(Ctx);
  if (!v) throw new Error('ToastProvider missing');
  return v;
}
