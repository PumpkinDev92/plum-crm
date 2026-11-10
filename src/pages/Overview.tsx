import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { Briefcase, CircleDollarSign, Coins, FileDown, FileSpreadsheet, Hourglass, LayoutDashboard, Percent, Send, Target, TrendingUp, Trophy } from 'lucide-react';
import { MonthlyColumns, ValueDonut } from '../components/Charts';
import { DealPanel } from '../components/Forms';
import { Button, EmptyState, MetricCard, PageHeader, STAGE_ICON, StageBadge } from '../components/ui';
import { useI18n, type Key } from '../i18n';
import {
  avgCycleDays,
  avgWonAmount,
  computeMetrics,
  conversionRate,
  dailyCreated,
  inPeriod,
  latestDeals,
  monthlyCreated,
  weightedForecast,
  type PeriodDays,
} from '../lib/metrics';
import { useStore } from '../lib/store';
import { STAGES } from '../lib/types';

const PERIODS: { days: PeriodDays; key: Key }[] = [
  { days: null, key: 'period.all' },
  { days: 365, key: 'period.d365' },
  { days: 90, key: 'period.d90' },
  { days: 30, key: 'period.d30' },
];

export function Overview() {
  const { t, money, percent, number, date } = useI18n();
  const { deals } = useStore();
  const [editing, setEditing] = useState<string | null>(null);
  const [soon, setSoon] = useState(false);
  const [mode, setMode] = useState<'day' | 'month'>('day');
  const [period, setPeriod] = useState<PeriodDays>(null);

  const scoped = useMemo(() => deals.filter((d) => inPeriod(d, period)), [deals, period]);
  const m = useMemo(() => computeMetrics(scoped), [scoped]);
  const recent = useMemo(() => latestDeals(deals, 5), [deals]);
  const buckets = useMemo(() => (mode === 'day' ? dailyCreated(deals, new Date(), 30) : monthlyCreated(deals, new Date(), 12)), [deals, mode]);
  const max = Math.max(1, ...STAGES.map((s) => m.byStage[s].count));
  const editDeal = deals.find((d) => d.id === editing);
  const dash = t('common.dash');

  const avgDeal = avgWonAmount(scoped);
  const cycle = avgCycleDays(scoped);
  const conv = conversionRate(scoped);

  return (
    <>
      <PageHeader
        title={t('overview.title')}
        subtitle={t('overview.subtitle')}
        icon={LayoutDashboard}
        action={
          <div className="actions" role="group" aria-label={t('export.group')}>
            <Button icon={FileSpreadsheet} onClick={() => setSoon(true)}>
              {t('export.xls')}
            </Button>
            <Button icon={FileDown} onClick={() => setSoon(true)}>
              {t('export.file')}
            </Button>
            <Button icon={Send} onClick={() => setSoon(true)}>
              {t('export.telegram')}
            </Button>
          </div>
        }
      />
      <p className="soon" role="status" hidden={!soon}>
        {soon ? t('export.soon') : ''}
      </p>

      <div className="period">
        <div className="segmented" role="group" aria-label={t('period.label')}>
          {PERIODS.map((p) => (
            <button key={String(p.days)} type="button" className={`segmented__btn${period === p.days ? ' is-active' : ''}`} aria-pressed={period === p.days} onClick={() => setPeriod(p.days)}>
              {t(p.key)}
            </button>
          ))}
        </div>
        <p className="muted period__note">{t('period.note')}</p>
      </div>

      <section className="grid-4" aria-label={t('overview.title')}>
        <MetricCard icon={Briefcase} label={t('metric.openCount')} value={number(m.openCount)} />
        <MetricCard icon={CircleDollarSign} label={t('metric.openSum')} value={money(m.openSum)} />
        <MetricCard icon={Trophy} label={t('metric.wonSum')} value={money(m.wonSum)} />
        <MetricCard icon={Percent} label={t('metric.winRate')} value={m.winRate === null ? dash : percent(m.winRate)} hint={t('metric.winRateHint')} />
      </section>

      <section className="grid-4 grid-4--compact" aria-label={t('metric.avgDeal')}>
        <MetricCard icon={Coins} label={t('metric.avgDeal')} value={avgDeal === null ? dash : money(avgDeal)} hint={t('metric.avgDealHint')} />
        <MetricCard icon={Hourglass} label={t('metric.cycle')} value={cycle === null ? dash : t('metric.days', { n: number(Math.round(cycle)) })} hint={t('metric.cycleHint')} />
        <MetricCard icon={TrendingUp} label={t('metric.forecast')} value={money(Math.round(weightedForecast(scoped)))} hint={t('metric.forecastHint')} />
        <MetricCard icon={Target} label={t('metric.conversion')} value={conv === null ? dash : percent(conv)} hint={t('metric.conversionHint')} />
      </section>

      <div className="grid-2">
        <section className="card section" aria-labelledby="chart-h">
          <h2 id="chart-h">{t('overview.chart')}</h2>
          <p className="muted">{t('overview.chartHint')}</p>
          <ul className="bars">
            {STAGES.map((s) => {
              const c = m.byStage[s].count;
              const Icon = STAGE_ICON[s];
              return (
                <li key={s}>
                  <Link className="bar" to={`/deals?stage=${s}`}>
                    <span className="bar__label">
                      <Icon size={16} aria-hidden="true" />
                      {t(`stage.${s}`)}
                    </span>
                    <span className="bar__track" aria-hidden="true">
                      <span className="bar__fill" style={{ width: `${(c / max) * 100}%` }} />
                    </span>
                    <span className="bar__count num">{number(c)}</span>
                    <span className="sr-only">{t('overview.deals')}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="card section" aria-labelledby="donut-h">
          <h2 id="donut-h">{t('chart.value')}</h2>
          <p className="muted">{t('chart.valueHint')}</p>
          <ValueDonut byStage={m.byStage} />
        </section>
      </div>

      <div className="grid-2">
        <section className="card section" aria-labelledby="recent-h">
          <h2 id="recent-h">{t('overview.recent')}</h2>
          {recent.length === 0 ? (
            <EmptyState icon={Briefcase} title={t('deals.empty')} />
          ) : (
            <ul className="recent">
              {recent.map((d) => (
                <li key={d.id}>
                  <button type="button" className="recent__item" onClick={() => setEditing(d.id)}>
                    <span className="recent__main">
                      <span className="recent__title">{d.title}</span>
                      <span className="muted">
                        {d.company} · {date(d.updatedAt)}
                      </span>
                    </span>
                    <span className="recent__side">
                      <span className="num">{money(d.amount)}</span>
                      <StageBadge stage={d.stage} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card section" aria-labelledby="month-h">
          <div className="section__head">
            <div>
              <h2 id="month-h">{t('chart.new')}</h2>
              <p className="muted">{t('chart.monthlyHint')}</p>
            </div>
            <div className="segmented segmented--sm" role="group" aria-label={t('chart.range')}>
              {(['day', 'month'] as const).map((m2) => (
                <button key={m2} type="button" className={`segmented__btn${mode === m2 ? ' is-active' : ''}`} aria-pressed={mode === m2} onClick={() => setMode(m2)}>
                  {t(m2 === 'day' ? 'chart.byDay' : 'chart.byMonth')}
                </button>
              ))}
            </div>
          </div>
          <MonthlyColumns buckets={buckets} mode={mode} />
        </section>
      </div>
      {editDeal && <DealPanel deal={editDeal} onClose={() => setEditing(null)} />}
    </>
  );
}
