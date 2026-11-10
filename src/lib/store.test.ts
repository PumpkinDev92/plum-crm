import { describe, expect, it } from 'vitest';
import {
  avgCycleDays,
  avgWonAmount,
  computeMetrics,
  conversionRate,
  dailyCreated,
  filterContacts,
  filterDeals,
  inPeriod,
  isOverdue,
  sortContacts,
  sortDeals,
  weightedForecast,
} from './metrics';
import { createSeed, createState, emptyData } from './seed';
import { buildBackup, LEGACY_KEY, loadData, parseBackup, parseData, parseState, saveData, STORAGE_KEY } from './storage';

function mem(initial?: string, key = STORAGE_KEY): Storage {
  const m = new Map<string, string>();
  if (initial !== undefined) m.set(key, initial);
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
    key: () => null,
    length: 0,
  };
}

describe('seed', () => {
  it('has two years of deals, contacts and notes', () => {
    const s = createSeed();
    expect(s.deals.length).toBeGreaterThanOrEqual(12);
    expect(s.contacts.length).toBeGreaterThanOrEqual(8);
    expect(s.notes.length).toBeGreaterThan(0);
    const oldest = Math.min(...s.deals.map((d) => Date.parse(d.createdAt)));
    expect(Date.now() - oldest).toBeGreaterThan(600 * 86_400_000);
  });
  it('links some notes to deals that exist', () => {
    const s = createSeed();
    const linked = s.notes.filter((n) => n.dealId);
    expect(linked.length).toBeGreaterThan(0);
    for (const n of linked) expect(s.deals.some((d) => d.id === n.dealId)).toBe(true);
  });
});

describe('metrics', () => {
  it('computes figures', () => {
    const m = computeMetrics(createSeed().deals);
    expect(m.openCount).toBeGreaterThan(0);
    expect(m.winRate).toBeGreaterThan(0);
    expect(m.winRate).toBeLessThan(1);
    expect(computeMetrics([]).winRate).toBeNull();
  });
  it('computes extra analytics', () => {
    const { deals } = createSeed();
    expect(avgWonAmount(deals)).toBeGreaterThan(0);
    expect(avgCycleDays(deals)).not.toBeNull();
    expect(weightedForecast(deals)).toBeGreaterThan(0);
    expect(conversionRate(deals)).toBeGreaterThan(0);
    expect(avgWonAmount([])).toBeNull();
    expect(avgCycleDays([])).toBeNull();
    expect(conversionRate([])).toBeNull();
  });
  it('filters by period', () => {
    const { deals } = createSeed();
    const d30 = deals.filter((d) => inPeriod(d, 30));
    expect(d30.length).toBeGreaterThan(0);
    expect(d30.length).toBeLessThan(deals.length);
    expect(deals.filter((d) => inPeriod(d, null))).toHaveLength(deals.length);
  });
  it('builds daily buckets', () => {
    const b = dailyCreated(createSeed().deals, new Date(), 30);
    expect(b).toHaveLength(30);
    expect(b.reduce((a, x) => a + x.count, 0)).toBeGreaterThan(0);
  });
});

describe('filters and sorting', () => {
  it('searches title and company, filters stage', () => {
    const { deals, contacts } = createSeed();
    expect(filterDeals(deals, 'northgate', 'all').length).toBeGreaterThan(1);
    expect(filterDeals(deals, '', 'won').every((d) => d.stage === 'won')).toBe(true);
    expect(filterContacts(contacts, 'kite')).toHaveLength(1);
  });
  it('filters deals by contact', () => {
    const { deals } = createSeed();
    const only = filterDeals(deals, '', 'all', 'c1');
    expect(only.length).toBeGreaterThan(0);
    expect(only.every((d) => d.contactId === 'c1')).toBe(true);
  });
  it('sorts deals and contacts', () => {
    const { deals, contacts } = createSeed();
    const byAmount = sortDeals(deals, 'amountDesc');
    expect(byAmount[0].amount).toBeGreaterThanOrEqual(byAmount[1].amount);
    const asc = sortDeals(deals, 'amountAsc');
    expect(asc[0].amount).toBeLessThanOrEqual(asc[1].amount);
    const byName = sortContacts(contacts, 'name', 'asc');
    expect(byName[0].name.localeCompare(byName[1].name)).toBeLessThanOrEqual(0);
    expect(sortContacts(contacts, 'name', 'desc')[0].name).toBe(byName[byName.length - 1].name);
  });
  it('detects overdue notes', () => {
    expect(isOverdue({ date: '2000-01-01', done: false }, '2026-01-01')).toBe(true);
    expect(isOverdue({ date: '2000-01-01', done: true }, '2026-01-01')).toBe(false);
    expect(isOverdue({ date: '2026-01-01', done: false }, '2026-01-01')).toBe(false);
  });
});

describe('storage', () => {
  it('seeds on first run', () => expect(loadData(mem()).status).toBe('seeded'));
  it('roundtrips', () => {
    const s = mem();
    expect(saveData(createState(), s)).toBe(true);
    const r = loadData(s);
    expect(r.status).toBe('ok');
    const w = r.state.workspaces[0];
    expect(w.deals).toHaveLength(createSeed().deals.length);
    expect(w.notes.length).toBeGreaterThan(0);
    expect(w.company.name).toBe(createSeed().company.name);
  });
  it('recovers from corrupt data', () => expect(loadData(mem('{oops')).status).toBe('corrupt'));
  it('migrates the single-company v3 format', () => {
    const r = loadData(mem(JSON.stringify(createSeed()), LEGACY_KEY));
    expect(r.status).toBe('migrated');
    expect(r.state.workspaces).toHaveLength(1);
    expect(r.state.workspaces[0].deals.length).toBeGreaterThan(0);
  });
  it('drops invalid records and dangling links', () => {
    const bad = JSON.stringify({
      deals: [
        { id: 'x', title: 'a', company: 'b', amount: -1, stage: 'new' },
        { id: 'ok', title: 'a', company: 'b', amount: 1, stage: 'new', contactId: 'ghost' },
      ],
      contacts: [],
      notes: [
        { id: 'n', text: ' ', date: 'bad' },
        { id: 'n2', text: 'hi', date: '2026-01-01', dealId: 'ghost', contactId: 'ghost' },
      ],
    });
    const d = parseData(bad)!;
    expect(d.deals).toHaveLength(1);
    expect(d.deals[0].contactId).toBeUndefined();
    expect(d.notes).toHaveLength(1);
    expect(d.notes[0].dealId).toBeUndefined();
    expect(d.company.name).toBeTruthy();
  });
  it('reports write errors', () => {
    const s = mem();
    s.setItem = () => {
      throw new Error('quota');
    };
    expect(saveData(createState(), s)).toBe(false);
  });
  it('supports several workspaces', () => {
    const state = createState();
    state.workspaces.push({ id: 'w2', ...emptyData({ name: 'Second Co', account: '', inn: '', iban: '' }) });
    state.activeId = 'w2';
    const back = parseState(JSON.stringify(state))!;
    expect(back.workspaces).toHaveLength(2);
    expect(back.activeId).toBe('w2');
    expect(back.workspaces[1].deals).toHaveLength(0);
  });
});

describe('backup', () => {
  it('roundtrips through a backup file', () => {
    const state = createState();
    const back = parseBackup(buildBackup(state))!;
    expect(back.workspaces[0].deals).toHaveLength(state.workspaces[0].deals.length);
  });
  it('accepts a legacy single-company export and rejects junk', () => {
    expect(parseBackup(JSON.stringify(createSeed()))?.workspaces).toHaveLength(1);
    expect(parseBackup('not json')).toBeNull();
    expect(parseBackup('{"hello":1}')).toBeNull();
  });
});
