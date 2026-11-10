import { Building2, GripVertical, Pencil, UserRound } from 'lucide-react';
import type { DragEvent } from 'react';
import { useI18n } from '../i18n';
import type { Deal, Stage } from '../lib/types';
import { SelectField, useStageOptions } from './ui';

interface Props {
  deal: Deal;
  contactName?: string;
  onStage(stage: Stage): void;
  onEdit(): void;
  onOpenContact?(): void;
  showStageSelect?: boolean;
  /** Keeps the heading outline valid: h3 under a column heading, h2 in the flat list. */
  headingLevel?: 2 | 3;
  /** Mouse drag between board columns (the select stays the keyboard/touch path). */
  draggable?: boolean;
  dragging?: boolean;
  onDragStart?(e: DragEvent<HTMLElement>): void;
  onDragEnd?(e: DragEvent<HTMLElement>): void;
}

export function DealCard({ deal, contactName, onStage, onEdit, onOpenContact, showStageSelect = true, headingLevel = 3, draggable, dragging, onDragStart, onDragEnd }: Props) {
  const { t, money, date } = useI18n();
  const options = useStageOptions();
  const Heading = (headingLevel === 2 ? 'h2' : 'h3') as 'h2' | 'h3';
  return (
    <article
      className={`card deal${draggable ? ' deal--draggable' : ''}${dragging ? ' is-dragging' : ''}`}
      draggable={draggable || undefined}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="deal__top">
        <Heading className="deal__title">
          {draggable && <GripVertical size={14} className="deal__grip" aria-hidden="true" />}
          {deal.title}
        </Heading>
        <button type="button" className="icon-btn" onClick={onEdit} aria-label={t('deals.edit', { title: deal.title })}>
          <Pencil size={16} aria-hidden="true" />
        </button>
      </div>
      <p className="deal__meta">
        <Building2 size={14} aria-hidden="true" /> {deal.company}
      </p>
      {contactName && (
        <p className="deal__meta">
          <UserRound size={14} aria-hidden="true" />
          {onOpenContact ? (
            <button type="button" className="link-btn link-btn--inline" onClick={onOpenContact} aria-label={t('deals.openContact', { name: contactName })}>
              {contactName}
            </button>
          ) : (
            contactName
          )}
        </p>
      )}
      <p className="deal__amount num">{money(deal.amount)}</p>
      <p className="deal__meta muted">
        {t('common.updated')}: <time dateTime={deal.updatedAt}>{date(deal.updatedAt)}</time>
      </p>
      {showStageSelect && (
        <SelectField
          label={t('deals.stageSelect', { title: deal.title })}
          hideLabel
          value={deal.stage}
          onChange={(e) => onStage(e.target.value as Stage)}
          options={options}
        />
      )}
    </article>
  );
}
