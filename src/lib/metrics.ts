import { OPEN_STAGES, STAGES, type Deal, type Stage } from './types';

export interface Metrics {
  openCount: number;
  openSum: number;
  wonSum: number;
  winRate: number | null;
  byStage: Record<Stage, { count: number; sum: number }>;
}

export function computeMetrics(deals: Deal[]): Metrics {
  const byStage = Object.fromEntries(STAGES.map((s) => [s, { count: 0, sum: 0 }])) as Metrics['byStage'];
  for (const d of deals) {
    byStage[d.stage].count += 1;
    byStage[d.stage].sum += d.amount;
  }
  const open = OPEN_STAGES.reduce((a, s) => ({ c: a.c + byStage[s].count, s: a.s + byStage[s].sum }), { c: 0, s: 0 });
  const closed = byStage.won.count + byStage.lost.count;
  return {
    openCount: open.c,
    openSum: open.s,
    wonSum: byStage.won.sum,
    winRate: closed ? byStage.won.count / closed : null,
    byStage,
  };
}

export const latestDeals = (deals: Deal[], n = 5) =>
  [...deals].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).slice(0, n);

export function filterDeals(deals: Deal[], query: string, stage: Stage | 'all', contactId: string | 'all' = 'all'): Deal[] {
  const q = query.trim().toLowerCase();
  return deals.filter(
    (d) => (stage === 'all' || d.stage === stage) && (contactId === 'all' || d.contactId === contactId) && (!q || d.title.toLowerCase().includes(q) || d.company.toLowerCase().includes(q)),
  );
}

export function filterContacts<T extends { name: string; company: string }>(items: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  return items.filter((c) => !q || c.name.toLowerCase().includes(q) || c.company.toLowerCase().includes(q));
}

export interface MonthBucket {
  key: string;
  date: Date;
  count: number;
}

/** Deals created per calendar month, last `n` months ending with the current one. */
export function monthlyCreated(deals: Deal[], now = new Date(), n = 6): MonthBucket[] {
  const buckets: MonthBucket[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ key: `${date.getFullYear()}-${date.getMonth()}`, date, count: 0 });
  }
  for (const d of deals) {
    const c = new Date(d.createdAt);
    const b = buckets.find((x) => x.key === `${c.getFullYear()}-${c.getMonth()}`);
    if (b) b.count += 1;
  }
  return buckets;
}

/** Deals created per calendar day, last `n` days ending with today. */
export function dailyCreated(deals: Deal[], now = new Date(), n = 30): MonthBucket[] {
  const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const buckets: MonthBucket[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    buckets.push({ key: key(date), date, count: 0 });
  }
  const byKey = new Map(buckets.map((b) => [b.key, b]));
  for (const d of deals) {
    const b = byKey.get(key(new Date(d.createdAt)));
    if (b) b.count += 1;
  }
  return buckets;
}

/* ---------- Period, analytics, sorting ---------- */
export type PeriodDays = 30 | 90 | 365 | null;

/** Deals created within the last `days` days; `null` means all time. */
export function inPeriod(d: Deal, days: PeriodDays, now = Date.now()): boolean {
  return days === null || Date.parse(d.createdAt) >= now - days * 86_400_000;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export const avgWonAmount = (deals: Deal[]) => avg(deals.filter((d) => d.stage === 'won').map((d) => d.amount));

/** Average days between creation and the last update of won deals. */
export const avgCycleDays = (deals: Deal[]) =>
  avg(deals.filter((d) => d.stage === 'won').map((d) => Math.max(0, (Date.parse(d.updatedAt) - Date.parse(d.createdAt)) / 86_400_000)));

/** Rough probability that an open deal at this stage is won. */
export const STAGE_PROBABILITY: Record<Stage, number> = { new: 0.1, progress: 0.3, proposal: 0.6, won: 1, lost: 0 };

export const weightedForecast = (deals: Deal[]) =>
  deals.filter((d) => d.stage !== 'won' && d.stage !== 'lost').reduce((a, d) => a + d.amount * STAGE_PROBABILITY[d.stage], 0);

/** Won deals as a share of all deals. */
export const conversionRate = (deals: Deal[]) => (deals.length ? deals.filter((d) => d.stage === 'won').length / deals.length : null);

export type DealSort = 'updated' | 'amountDesc' | 'amountAsc' | 'title';

export function sortDeals(deals: Deal[], sort: DealSort): Deal[] {
  const list = [...deals];
  switch (sort) {
    case 'amountDesc':
      return list.sort((a, b) => b.amount - a.amount);
    case 'amountAsc':
      return list.sort((a, b) => a.amount - b.amount);
    case 'title':
      return list.sort((a, b) => a.title.localeCompare(b.title));
    default:
      return list.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  }
}

export type ContactSortKey = 'name' | 'company' | 'position' | 'email';

export function sortContacts<T extends Record<ContactSortKey, string>>(items: T[], key: ContactSortKey, dir: 'asc' | 'desc'): T[] {
  const m = dir === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => m * a[key].localeCompare(b[key], undefined, { sensitivity: 'base' }));
}

export const isOverdue = (n: { date: string; done: boolean }, todayKey: string) => !n.done && n.date < todayKey;
