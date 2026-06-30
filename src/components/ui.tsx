import React from 'react';
import type { LucideIcon } from 'lucide-react';

type Tone = 'cyan' | 'violet' | 'emerald' | 'amber' | 'red' | 'slate';

const toneClasses: Record<Tone, string> = {
  cyan: 'border-cyan-400/25 bg-cyan-400/10 text-cyan-300',
  violet: 'border-violet-400/25 bg-violet-400/10 text-violet-300',
  emerald: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
  amber: 'border-amber-400/25 bg-amber-400/10 text-amber-300',
  red: 'border-red-400/25 bg-red-400/10 text-red-300',
  slate: 'border-white/10 bg-white/[0.04] text-slate-300',
};

export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

export function GlassPanel({
  children,
  className,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cx('studio-panel rounded-2xl transition-[border-color,box-shadow] duration-200', className)}>
      {children}
    </section>
  );
}

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cx('studio-card rounded-xl', className)}>{children}</div>;
}

export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
        {description && <p className="text-sm text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatusPill({
  children,
  tone = 'cyan',
}: {
  children: React.ReactNode;
  tone?: Tone;
}) {
  return (
    <span className={cx('inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium shadow-[0_0_24px_rgba(34,211,238,0.08)]', toneClasses[tone])}>
      {children}
    </span>
  );
}

export function IconButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  active,
  tone = 'cyan',
}: {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  tone?: Tone;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cx(
        'grid h-10 w-10 place-items-center rounded-xl border transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0',
        active ? toneClasses[tone] : 'border-white/10 bg-white/[0.04] text-slate-400 hover:border-cyan-400/35 hover:text-slate-100'
      )}
    >
      <Icon size={17} />
    </button>
  );
}

export function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      aria-label={label}
      className={cx(
        'relative h-7 w-12 rounded-full border transition hover:border-cyan-400/35',
        checked ? 'border-cyan-400/45 bg-cyan-400/30 shadow-[0_0_24px_rgba(34,211,238,0.14)]' : 'border-white/10 bg-slate-800'
      )}
    >
      <span
        className={cx(
          'absolute top-1 h-5 w-5 rounded-full bg-white shadow-lg transition',
          checked ? 'left-6 shadow-cyan-400/40' : 'left-1'
        )}
      />
    </button>
  );
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div className="inline-flex rounded-xl border border-white/10 bg-slate-950/70 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cx(
            'rounded-lg px-3 py-1.5 text-xs font-medium transition',
            value === option.value ? 'bg-cyan-400 text-slate-950' : 'text-slate-400 hover:text-slate-100'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function ControlSlider({
  label,
  value,
  min,
  max,
  step,
  readout,
  onChange,
  tone = 'cyan',
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  readout: string;
  onChange: (value: number) => void;
  tone?: Tone;
}) {
  const accentClass = tone === 'violet' ? 'accent-violet-400' : tone === 'amber' ? 'accent-amber-400' : tone === 'emerald' ? 'accent-emerald-400' : 'accent-cyan-400';

  return (
    <label className="block space-y-2 text-xs text-slate-400">
      <span className="flex items-center justify-between gap-3">
        {label}
        <span className={cx('font-mono', toneClasses[tone].split(' ').find((item) => item.startsWith('text-')) ?? 'text-slate-200')}>
          {readout}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(parseFloat(event.target.value))}
        className={cx('w-full', accentClass)}
        aria-label={`${label} slider`}
      />
    </label>
  );
}

export function PresetArtwork({ name }: { name: string }) {
  const normalizedName = name.toLowerCase();
  const className = normalizedName.includes('gamma')
    ? 'from-fuchsia-500/75 via-violet-500/45 to-slate-950 before:bg-[radial-gradient(circle,rgba(255,255,255,0.78)_0_2px,transparent_3px)]'
    : normalizedName.includes('alpha')
      ? 'from-cyan-500/65 via-blue-500/38 to-slate-950 before:bg-[linear-gradient(135deg,transparent_35%,rgba(255,255,255,0.45)_36%,transparent_42%)]'
      : normalizedName.includes('theta')
        ? 'from-blue-500/65 via-cyan-400/38 to-slate-950 before:bg-[radial-gradient(circle_at_50%_62%,rgba(34,211,238,0.75)_0_10%,transparent_18%)]'
        : normalizedName.includes('delta') || normalizedName.includes('sleep')
          ? 'from-slate-700 via-indigo-700/48 to-slate-950 before:bg-[radial-gradient(circle_at_72%_28%,rgba(248,250,252,0.82)_0_10%,transparent_11%)]'
          : 'from-cyan-500/60 via-violet-500/38 to-slate-950 before:bg-[radial-gradient(circle,rgba(34,211,238,0.5)_0_2px,transparent_3px)]';

  return (
    <div
      className={cx(
        'relative h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br shadow-[0_12px_32px_rgba(15,23,42,0.35)] transition duration-200 group-hover:shadow-[0_18px_46px_rgba(34,211,238,0.22)] before:absolute before:inset-0 before:bg-[length:18px_18px] before:opacity-50 after:absolute after:inset-3 after:rounded-full after:border after:border-white/22 after:bg-white/5',
        className
      )}
    >
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_48%_42%,rgba(255,255,255,0.18),transparent_18%),radial-gradient(circle_at_52%_58%,rgba(34,211,238,0.24),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.12),transparent_38%,rgba(139,92,246,0.18))]" />
      <span className="absolute -inset-6 rotate-12 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.16),transparent)] opacity-55 transition duration-300 group-hover:translate-x-3" />
      <span className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10" />
    </div>
  );
}
