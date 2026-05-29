import type { ReactNode } from 'react';

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

export function Bar({ progress }: { progress: number }) {
  return (
    <div className="bar">
      <div className="bar-fill" style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }} />
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
