import { Check, SearchX, Trash2 } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { MonthlyColumns, ValueDonut } from '../components/Charts';
import { CompanyBar } from '../components/CompanyBar';
import { DealCard } from '../components/DealCard';
import { useToast } from '../components/Toast';
import { Panel } from '../components/Panel';
import { Button, EmptyState, MetricCard, PageHeader, SearchInput, SelectField, StageBadge, Table, TextField, useStageOptions } from '../components/ui';
import { useI18n } from '../i18n';
import { dailyCreated, computeMetrics } from '../lib/metrics';
import { createSeed } from '../lib/seed';
import { STAGES, type Deal } from '../lib/types';

const COLORS: [string, string, string][] = [
  ['--bg', '#160F22', 'Фон приложения'],
  ['--surface', '#251934', 'Карточки, таблицы, формы'],
  ['--surface-active', '#2B1742', 'Активная навигация'],
  ['--border', '#4A355C', 'Границы'],
  ['--text', '#F7EFFB', 'Основной текст'],
  ['--text-muted', '#C2AECF', 'Вторичный текст'],
  ['--accent', '#FFC3A6', 'Основная кнопка'],
  ['--on-accent', '#241328', 'Текст на accent'],
  ['--focus', '#C5A4F5', 'Фокус, активное, график'],
];

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card section kit-block">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function UiKit() {
  const { t, money } = useI18n();
  const [open, setOpen] = useState(false);
  const toast = useToast();
  const [seg, setSeg] = useState<'a' | 'b'>('a');
  const [checked, setChecked] = useState(false);
  const sampleData = useMemo(() => {
    const d = createSeed().deals;
    return { byStage: computeMetrics(d).byStage, buckets: dailyCreated(d, new Date(), 30) };
  }, []);
  const [stage, setStage] = useState<Deal['stage']>('progress');
  const options = useStageOptions();
  const sample: Deal = {
    id: 'kit',
    title: t('kit.sample.title'),
    company: t('kit.sample.company'),
    amount: 420000,
    stage,
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-11-08T10:00:00Z',
  };

  return (
    <>
      <PageHeader title={t('kit.title')} subtitle={t('kit.subtitle')} />

      <Block title={t('kit.colors')}>
        <ul className="swatches">
          {COLORS.map(([name, hex, use]) => (
            <li key={name} className="swatch">
              <span className="swatch__chip" style={{ background: `var(${name})` }} aria-hidden="true" />
              <code>{name}</code>
              <span className="num">{hex}</span>
              <span className="muted">{use}</span>
            </li>
          ))}
        </ul>
      </Block>

      <Block title={t('kit.type')}>
        <p className="kit-h1">{t('kit.typeH1')}</p>
        <p className="kit-h2">{t('kit.typeH2')}</p>
        <p>{t('kit.typeBody')}</p>
        <p className="muted">{t('kit.typeMuted')}</p>
        <p className="num kit-num">{t('kit.typeNum')}</p>
      </Block>

      <Block title={t('kit.buttons')}>
        <div className="row">
          <Button variant="primary">{t('kit.btnPrimary')}</Button>
          <Button variant="primary" forceState="hover">{t('kit.btnHover')}</Button>
          <Button variant="primary" forceState="focus">{t('kit.btnFocus')}</Button>
          <Button variant="primary" disabled>{t('kit.btnDisabled')}</Button>
        </div>
        <div className="row">
          <Button>{t('kit.btnSecondary')}</Button>
          <Button forceState="hover">{t('kit.btnHover')}</Button>
          <Button forceState="focus">{t('kit.btnFocus')}</Button>
          <Button disabled>{t('kit.btnDisabled')}</Button>
        </div>
      </Block>

      <Block title={t('kit.fields')}>
        <div className="kit-fields">
          <TextField label={t('kit.fNormal')} defaultValue="Harbor Tower" />
          <TextField label={t('kit.fHover')} defaultValue="Harbor Tower" forceState="hover" />
          <TextField label={t('kit.fFocus')} defaultValue="Harbor Tower" forceState="focus" />
          <TextField label={t('kit.fDisabled')} defaultValue="Harbor Tower" disabled />
          <TextField label={t('kit.fError')} defaultValue="" error={t('kit.fErrorMsg')} />
          <SelectField label={t('kit.fSelect')} value={stage} onChange={(e) => setStage(e.target.value as Deal['stage'])} options={options} />
          <SearchInput value="" onChange={() => undefined} label={t('common.search')} />
        </div>
      </Block>

      <Block title={t('kit.glass')}>
        <div className="kit-glass">
          <div className="card kit-glass__tile">--glass</div>
          <div className="card kit-glass__tile kit-glass__tile--strong">--glass-strong</div>
        </div>
      </Block>

      <Block title={t('kit.segmented')}>
        <div className="segmented" role="group" aria-label={t('kit.segmented')}>
          {(['a', 'b'] as const).map((k) => (
            <button key={k} type="button" className={`segmented__btn${seg === k ? ' is-active' : ''}`} aria-pressed={seg === k} onClick={() => setSeg(k)}>
              {k === 'a' ? t('chart.byDay') : t('chart.byMonth')}
            </button>
          ))}
        </div>
      </Block>

      <Block title={t('kit.badges')}>
        <div className="row">
          {STAGES.map((s) => (
            <StageBadge key={s} stage={s} />
          ))}
        </div>
      </Block>

      <div className="grid-2">
        <Block title={t('kit.metric')}>
          <MetricCard label={t('metric.openSum')} value={money(5_200_000)} hint={t('metric.winRateHint')} />
        </Block>
        <Block title={t('kit.deal')}>
          <DealCard deal={sample} contactName="Алина Мельник" onStage={setStage} onEdit={() => setOpen(true)} />
        </Block>
      </div>

      <Block title={t('kit.company')}>
        <CompanyBar sample />
      </Block>

      <div className="grid-2">
        <Block title={t('kit.charts')}>
          <ValueDonut byStage={sampleData.byStage} />
        </Block>
        <Block title={t('kit.charts')}>
          <MonthlyColumns buckets={sampleData.buckets} mode="day" />
        </Block>
      </div>

      <div className="grid-2">
        <Block title={t('kit.note')}>
          <div className="card note">
            <button type="button" className={`check${checked ? ' is-checked' : ''}`} role="checkbox" aria-checked={checked} aria-label={t('notes.markDone')} onClick={() => setChecked((c) => !c)}>
              {checked && <Check size={16} aria-hidden="true" />}
            </button>
            <div className="note__body">
              <p className="note__text">{t('kit.sampleNote')}</p>
              <div className="note__chips">
                <span className="chip chip--alert">{t('notes.overdue')}</span>
              </div>
            </div>
          </div>
        </Block>
        <Block title={t('kit.toast')}>
          <div className="row">
            <Button onClick={() => toast({ message: t('toast.dealDeleted'), action: { label: t('common.undo'), onClick: () => undefined } })}>{t('kit.showToast')}</Button>
            <Button variant="danger" icon={Trash2}>
              {t('common.delete')}
            </Button>
          </div>
        </Block>
      </div>

      <Block title={t('kit.table')}>
        <Table caption={t('kit.table')} head={[t('deals.f.title'), t('deals.f.company'), t('deals.f.amount')]}>
          <tr>
            <th scope="row">{sample.title}</th>
            <td>{sample.company}</td>
            <td className="num">{money(sample.amount)}</td>
          </tr>
          <tr>
            <th scope="row">Cross-dock</th>
            <td>Northgate Logistics</td>
            <td className="num">{money(760000)}</td>
          </tr>
        </Table>
      </Block>

      <div className="grid-2">
        <Block title={t('kit.empty')}>
          <EmptyState icon={SearchX} title={t('deals.empty')} hint={t('deals.emptyHint')} />
        </Block>
        <Block title={t('kit.dialog')}>
          <p className="muted">{t('kit.dialogText')}</p>
          <div className="row">
            <Button variant="primary" onClick={() => setOpen(true)}>
              {t('kit.openDialog')}
            </Button>
          </div>
        </Block>
      </div>

      {open && (
        <Panel title={t('kit.dialog')} onClose={() => setOpen(false)}>
          <p>{t('kit.dialogText')}</p>
          <div className="form__actions">
            <Button onClick={() => setOpen(false)}>{t('common.close')}</Button>
          </div>
        </Panel>
      )}
    </>
  );
}
