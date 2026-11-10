import { useLayoutEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n';
import type { MonthBucket } from '../lib/metrics';
import { STAGES, type Stage } from '../lib/types';
import { STAGE_ICON } from './ui';

export const STAGE_FILL: Record<Stage, string> = {
  new: 'color-mix(in srgb, var(--focus) 35%, var(--surface))',
  progress: 'color-mix(in srgb, var(--focus) 60%, var(--surface))',
  proposal: 'var(--focus)',
  won: 'var(--accent)',
  lost: 'color-mix(in srgb, var(--text-muted) 45%, var(--surface))',
};

const compact = (n: number, locale: string) => new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(n) + ' $';

/** Donut: share of total deal value per stage. Legend carries the exact numbers. */
export function ValueDonut({ byStage }: { byStage: Record<Stage, { count: number; sum: number }> }) {
  const { t, money, percent } = useI18n();
  const locale = document.documentElement.lang || 'ru';
  const total = STAGES.reduce((a, s) => a + byStage[s].sum, 0);
  const R = 56;
  const STROKE = 14;
  const C = 2 * Math.PI * R;
  let offset = 0;
  const segments = STAGES.filter((s) => byStage[s].sum > 0).map((s) => {
    const len = (byStage[s].sum / total) * C;
    const seg = { s, len, offset };
    offset += len;
    return seg;
  });

  return (
    <div className="donut">
      <svg viewBox="0 0 140 140" className="donut__svg" role="img" aria-label={`${t('chart.value')}: ${money(total)}`}>
        <g transform="rotate(-90 70 70)">
          <circle cx="70" cy="70" r={R} fill="none" stroke="var(--bg)" strokeWidth={STROKE} />
          {segments.map(({ s, len, offset: o }) => {
            const visible = Math.max(len - 2, 0);
            return (
              <circle
                key={s}
                cx="70"
                cy="70"
                r={R}
                fill="none"
                stroke={STAGE_FILL[s]}
                strokeWidth={STROKE}
                strokeDasharray={`${visible} ${C - visible}`}
                strokeDashoffset={-o}
              />
            );
          })}
        </g>
        <text x="70" y="64" textAnchor="middle" className="donut__label">
          {t('chart.total')}
        </text>
        <text x="70" y="82" textAnchor="middle" className="donut__value">
          {compact(total, locale)}
        </text>
      </svg>
      <ul className="legend">
        {STAGES.map((s) => {
          const Icon = STAGE_ICON[s];
          return (
            <li key={s} className="legend__item">
              <span className="legend__dot" style={{ background: STAGE_FILL[s] }} aria-hidden="true" />
              <span className="legend__name">
                <Icon size={14} aria-hidden="true" />
                {t(`stage.${s}`)}
              </span>
              <span className="legend__val num">{money(byStage[s].sum)}</span>
              <span className="legend__pct muted num">{total ? percent(byStage[s].sum / total) : t('common.dash')}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function useWidth<T extends HTMLElement>(): [React.RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(600);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setW(Math.max(260, Math.round(el.getBoundingClientRect().width)));
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref as React.RefObject<T>, w];
}

/** Column chart: deals created per day or per month; stretches to the card width. */
export function MonthlyColumns({ buckets, mode }: { buckets: MonthBucket[]; mode: 'day' | 'month' }) {
  const { t, number, lang } = useI18n();
  const [wrapRef, W] = useWidth<HTMLDivElement>();
  const locale = lang === 'uk' ? 'uk-UA' : lang === 'en' ? 'en-US' : 'ru-RU';
  const month = new Intl.DateTimeFormat(locale, { month: 'short' });
  const full = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const H = 240;
  const padB = 46;
  const padT = 26;
  const padX = 4;
  const slot = (W - padX * 2) / buckets.length;
  const bw = Math.max(4, Math.min(mode === 'day' ? 18 : 40, slot * (mode === 'day' ? 0.62 : 0.6)));
  const minTick = mode === 'day' ? 30 : 38;
  const every = Math.max(1, Math.ceil(minTick / slot));
  const plotH = H - padT - padB;
  const showValues = slot >= 16;
  const summary = buckets.map((b) => `${full.format(b.date)}: ${b.count}`).join(', ');

  return (
    <div ref={wrapRef} className="columns-wrap">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="columns" role="img" aria-label={`${t('chart.new')}, ${t(mode === 'day' ? 'chart.byDay' : 'chart.byMonth')}. ${summary}`}>
        {[0.5, 1].map((f) => (
          <line key={f} x1="0" x2={W} y1={padT + plotH * (1 - f)} y2={padT + plotH * (1 - f)} stroke="var(--border)" strokeDasharray="3 4" opacity="0.7" />
        ))}
        <line x1="0" x2={W} y1={H - padB} y2={H - padB} stroke="var(--border)" />
        {buckets.map((b, i) => {
          const h = (plotH * b.count) / max;
          const x = padX + i * slot + (slot - bw) / 2;
          const cx = x + bw / 2;
          const last = i === buckets.length - 1;
          const showTick = (buckets.length - 1 - i) % every === 0;
          const label = mode === 'day' ? String(b.date.getDate()) : month.format(b.date).replace('.', '');
          const sub =
            mode === 'day'
              ? showTick && (b.date.getDate() === 1 || i === 0) ? month.format(b.date).replace('.', '') : ''
              : showTick && (b.date.getMonth() === 0 || i === 0) ? String(b.date.getFullYear()) : '';
          return (
            <g key={b.key}>
              <rect x={x} y={H - padB - h} width={bw} height={Math.max(h, b.count ? 2 : 0)} rx={Math.min(4, bw / 3)} fill="var(--focus)" opacity={last ? 1 : 0.62} />
              {b.count > 0 && showValues && (
                <text x={cx} y={H - padB - h - 8} textAnchor="middle" className="columns__val">
                  {number(b.count)}
                </text>
              )}
              {showTick && (
                <text x={cx} y={H - padB + 18} textAnchor="middle" className="columns__tick">
                  {label}
                </text>
              )}
              {sub && (
                <text x={cx} y={H - padB + 33} textAnchor="middle" className="columns__year">
                  {sub}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
