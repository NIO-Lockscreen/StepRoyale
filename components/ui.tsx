import { useState, useEffect, useRef, type ReactNode } from 'react';

// ── Toast notification system ─────────────────────────────────────────────────

type ToastData = { id: number; emoji: string; title: string; sub?: string; exiting?: boolean };
let _nextId = 0;
const _toastSubs = new Set<(t: ToastData) => void>();

/** Fire a toast from anywhere — no context needed. */
export function toast(emoji: string, title: string, sub?: string) {
  const t: ToastData = { id: _nextId++, emoji, title, sub };
  _toastSubs.forEach(fn => fn(t));
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  useEffect(() => {
    const handler = (t: ToastData) => {
      setToasts(prev => [...prev, t]);
      // begin exit animation then remove
      setTimeout(() => {
        setToasts(prev => prev.map(x => x.id === t.id ? { ...x, exiting: true } : x));
      }, 2700);
      setTimeout(() => {
        setToasts(prev => prev.filter(x => x.id !== t.id));
      }, 3000);
    };
    _toastSubs.add(handler);
    return () => { _toastSubs.delete(handler); };
  }, []);

  if (!toasts.length) return null;
  return (
    <div className="toast-stack">
      {toasts.map(t => (
        <div key={t.id} className={`toast${t.exiting ? ' exiting' : ''}`}>
          <span className="toast-emoji">{t.emoji}</span>
          <div className="toast-body">
            <span className="toast-title">{t.title}</span>
            {t.sub && <span className="toast-sub">{t.sub}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Base UI primitives ────────────────────────────────────────────────────────

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="card">
      {title && <h2 className="card-title">{title}</h2>}
      {children}
    </section>
  );
}

export function Stat({ label, value, accent }: { label: string; value: ReactNode; accent?: 'gold' | 'green' | 'red' }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className={`stat-value ${accent ?? ''}`}>{value}</span>
    </div>
  );
}

/** Progress bar. Pass `complete` to trigger the shimmer animation when goal is hit. */
export function Bar({ progress, complete }: { progress: number; complete?: boolean }) {
  return (
    <div className="bar">
      <div
        className={`bar-fill${complete ? ' complete' : ''}`}
        style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
      />
    </div>
  );
}

export function Button({
  children,
  onClick,
  disabled,
  variant = 'default',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'default' | 'primary' | 'ghost';
}) {
  return (
    <button className={`btn btn-${variant}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

// ── Animated coin display ─────────────────────────────────────────────────────

/**
 * Flash-on-increase hook. Returns a ref to attach to the display element.
 * Only triggers the animation when coins grow by more than `threshold` in one tick
 * and at least `cooldownMs` has elapsed since the last flash.
 */
export function useFlashOnIncrease(
  value: number,
  threshold = 5,
  cooldownMs = 1800,
): React.RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement>(null);
  const prevRef = useRef(value);
  const lastFlashRef = useRef(0);

  useEffect(() => {
    const delta = value - prevRef.current;
    const now = Date.now();
    if (delta > threshold && now - lastFlashRef.current > cooldownMs && ref.current) {
      const el = ref.current;
      el.classList.remove('flash');
      void el.offsetWidth; // force reflow so the animation restarts
      el.classList.add('flash');
      lastFlashRef.current = now;
    }
    prevRef.current = value;
  });

  return ref;
}
