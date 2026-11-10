import { Briefcase, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DealCard } from '../components/DealCard';
import { DealPanel } from '../components/Forms';
import { useToast } from '../components/Toast';
import { Button, EmptyState, PageHeader, SearchInput, SelectField, STAGE_ICON, useStageOptions } from '../components/ui';
import { useI18n } from '../i18n';
import { filterDeals, sortDeals, type DealSort } from '../lib/metrics';
import { useStore } from '../lib/store';
import { isStage, STAGES, type Deal, type Stage } from '../lib/types';
import { useMediaQuery } from '../lib/useMediaQuery';

type Editing = { deal?: Deal } | null;

function StageIcon({ stage }: { stage: Stage }) {
  const Icon = STAGE_ICON[stage];
  return <Icon size={16} aria-hidden="true" />;
}

const SORTS: DealSort[] = ['updated', 'amountDesc', 'amountAsc', 'title'];

export function Deals() {
  const { t, money, number } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const { deals, contacts, setStage } = useStore();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<DealSort>('updated');
  const [contactFilter, setContactFilter] = useState('all');
  const [editing, setEditing] = useState<Editing>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<Stage | null>(null);
  const wide = useMediaQuery('(min-width: 900px)');
  const options = useStageOptions(true);

  const stageParam = params.get('stage');
  const stage: Stage | 'all' = isStage(stageParam) ? stageParam : 'all';
  const setStageFilter = (v: string) => {
    const next = new URLSearchParams(params);
    if (v === 'all') next.delete('stage');
    else next.set('stage', v);
    setParams(next, { replace: true });
  };

  // Deep link: /deals?deal=<id> opens that deal's panel (used from contacts, notes and search).
  const dealParam = params.get('deal');
  useEffect(() => {
    if (!dealParam) return;
    const d = deals.find((x) => x.id === dealParam);
    if (d) setEditing({ deal: d });
  }, [dealParam, deals]);
  const closeEditing = () => {
    setEditing(null);
    if (params.has('deal')) {
      const next = new URLSearchParams(params);
      next.delete('deal');
      setParams(next, { replace: true });
    }
  };

  const filtered = useMemo(() => sortDeals(filterDeals(deals, query, stage, contactFilter), sort), [deals, query, stage, contactFilter, sort]);
  const contactName = (d: Deal) => contacts.find((c) => c.id === d.contactId)?.name;
  const columns = stage === 'all' ? STAGES : STAGES.filter((s) => s === stage);

  const changeStage = (d: Deal, s: Stage) => {
    if (d.stage === s) return;
    setStage(d.id, s);
    toast({ message: t('toast.stage', { stage: t(`stage.${s}`) }) });
  };

  const renderCard = (d: Deal) => (
    <DealCard
      key={d.id}
      deal={d}
      contactName={contactName(d)}
      onStage={(s) => changeStage(d, s)}
      onEdit={() => setEditing({ deal: d })}
      onOpenContact={d.contactId ? () => navigate(`/contacts?contact=${d.contactId}`) : undefined}
      headingLevel={wide ? 3 : 2}
      draggable={wide}
      dragging={dragId === d.id}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', d.id);
        e.dataTransfer.effectAllowed = 'move';
        setDragId(d.id);
      }}
      onDragEnd={() => {
        setDragId(null);
        setOverStage(null);
      }}
    />
  );

  const drop = (s: Stage) => {
    const d = deals.find((x) => x.id === dragId);
    setDragId(null);
    setOverStage(null);
    if (d) changeStage(d, s);
  };

  return (
    <>
      <PageHeader
        title={t('deals.title')}
        icon={Briefcase}
        action={
          <Button variant="primary" icon={Plus} onClick={() => setEditing({})}>
            {t('deals.new')}
          </Button>
        }
      />
      <div className="toolbar">
        <SearchInput value={query} onChange={setQuery} label={t('deals.search')} />
        <SelectField label={t('deals.filter')} value={stage} onChange={(e) => setStageFilter(e.target.value)} options={options} />
        <SelectField
          label={t('deals.contactFilter')}
          value={contactFilter}
          onChange={(e) => setContactFilter(e.target.value)}
          options={[{ value: 'all', label: t('deals.allContacts') }, ...contacts.map((c) => ({ value: c.id, label: c.name }))]}
        />
        <SelectField label={t('deals.sort')} value={sort} onChange={(e) => setSort(e.target.value as DealSort)} options={SORTS.map((s) => ({ value: s, label: t(`deals.sort.${s}` as const) }))} />
      </div>

      {wide ? (
        <div className="board" role="list">
          {columns.map((s) => {
            const items = filtered.filter((d) => d.stage === s);
            const sum = items.reduce((a, d) => a + d.amount, 0);
            return (
              <section
                key={s}
                className={`column${overStage === s && dragId ? ' is-over' : ''}`}
                role="listitem"
                aria-labelledby={`col-${s}`}
                onDragOver={(e) => {
                  if (!dragId) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (overStage !== s) setOverStage(s);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOverStage((cur) => (cur === s ? null : cur));
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  drop(s);
                }}
              >
                <header className="column__head">
                  <h2 id={`col-${s}`}>
                    <StageIcon stage={s} />
                    {t(`stage.${s}`)}
                  </h2>
                  <p className="column__stats muted">
                    <span className="num">{number(items.length)}</span> · <span className="num">{money(sum)}</span>
                  </p>
                </header>
                <div className="column__body">
                  {items.length ? items.map(renderCard) : <p className="muted column__empty">{t('deals.noneInStage')}</p>}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <section aria-label={t('deals.title')}>
          <p className="muted list-count">
            {t('deals.count', { n: number(filtered.length) })} · <span className="num">{money(filtered.reduce((a, d) => a + d.amount, 0))}</span>
          </p>
          {filtered.length ? (
            <div className="stack">{filtered.map(renderCard)}</div>
          ) : (
            <EmptyState icon={Briefcase} title={t('deals.empty')} hint={t('deals.emptyHint')} />
          )}
        </section>
      )}
      {wide && filtered.length === 0 && <EmptyState icon={Briefcase} title={t('deals.empty')} hint={t('deals.emptyHint')} />}
      {wide && filtered.length > 0 && <p className="muted drag-hint">{t('deals.dragHint')}</p>}

      {editing && <DealPanel deal={editing.deal} onClose={closeEditing} />}
    </>
  );
}
