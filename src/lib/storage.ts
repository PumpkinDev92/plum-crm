import { createState, defaultCompany } from './seed';
import { isDayKey, isStage, type AppData, type AppState, type Company, type Contact, type Deal, type Note, type Workspace } from './types';

export const STORAGE_KEY = 'plum-crm:v4';
/** Older single-company format; migrated on first load. */
export const LEGACY_KEY = 'plum-crm:v3';
export const LANG_KEY = 'plum-crm:lang';

export type LoadStatus = 'ok' | 'seeded' | 'corrupt' | 'migrated';
export interface LoadResult {
  state: AppState;
  status: LoadStatus;
}

const isStr = (v: unknown): v is string => typeof v === 'string';
const isIso = (v: unknown): v is string => isStr(v) && !Number.isNaN(Date.parse(v));
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

function parseDeal(raw: unknown): Deal | null {
  if (!isObj(raw)) return null;
  const r = raw;
  if (!isStr(r.id) || !isStr(r.title) || !r.title.trim() || !isStr(r.company) || !r.company.trim()) return null;
  if (!isStage(r.stage)) return null;
  if (typeof r.amount !== 'number' || !Number.isFinite(r.amount) || r.amount < 0) return null;
  const now = new Date().toISOString();
  return {
    id: r.id,
    title: r.title,
    company: r.company,
    amount: r.amount,
    stage: r.stage,
    contactId: isStr(r.contactId) && r.contactId ? r.contactId : undefined,
    createdAt: isIso(r.createdAt) ? r.createdAt : now,
    updatedAt: isIso(r.updatedAt) ? r.updatedAt : now,
  };
}

function parseContact(raw: unknown): Contact | null {
  if (!isObj(raw)) return null;
  const r = raw;
  if (!isStr(r.id) || !isStr(r.name) || !r.name.trim() || !isStr(r.company)) return null;
  return {
    id: r.id,
    name: r.name,
    company: r.company,
    position: isStr(r.position) ? r.position : '',
    email: isStr(r.email) ? r.email : '',
  };
}

function parseNote(raw: unknown): Note | null {
  if (!isObj(raw)) return null;
  const r = raw;
  if (!isStr(r.id) || !isStr(r.text) || !r.text.trim() || !isDayKey(r.date)) return null;
  return {
    id: r.id,
    text: r.text,
    date: r.date,
    done: r.done === true,
    createdAt: isIso(r.createdAt) ? r.createdAt : new Date().toISOString(),
    dealId: isStr(r.dealId) && r.dealId ? r.dealId : undefined,
    contactId: isStr(r.contactId) && r.contactId ? r.contactId : undefined,
  };
}

function parseCompany(raw: unknown): Company {
  const base = defaultCompany();
  if (!isObj(raw)) return base;
  const r = raw;
  const photo = isStr(r.photo) && r.photo.startsWith('data:image/') && r.photo.length < 400_000 ? r.photo : undefined;
  return {
    name: isStr(r.name) && r.name.trim() ? r.name : base.name,
    account: isStr(r.account) ? r.account : '',
    inn: isStr(r.inn) ? r.inn : '',
    iban: isStr(r.iban) ? r.iban : '',
    photo,
  };
}

/** Validates one workspace's content; drops broken records and dangling links. */
export function parseWorkspaceData(raw: unknown): AppData | null {
  if (!isObj(raw) || !Array.isArray(raw.deals) || !Array.isArray(raw.contacts)) return null;
  const contacts = (raw.contacts as unknown[]).map(parseContact).filter((c): c is Contact => !!c);
  const contactIds = new Set(contacts.map((c) => c.id));
  const deals = (raw.deals as unknown[])
    .map(parseDeal)
    .filter((d): d is Deal => !!d)
    .map((d) => (d.contactId && !contactIds.has(d.contactId) ? { ...d, contactId: undefined } : d));
  const dealIds = new Set(deals.map((d) => d.id));
  const notes = (Array.isArray(raw.notes) ? (raw.notes as unknown[]) : [])
    .map(parseNote)
    .filter((n): n is Note => !!n)
    .map((n) => ({
      ...n,
      dealId: n.dealId && dealIds.has(n.dealId) ? n.dealId : undefined,
      contactId: n.contactId && contactIds.has(n.contactId) ? n.contactId : undefined,
    }));
  return { deals, contacts, notes, company: parseCompany(raw.company) };
}

/** Single-workspace JSON (the v3 format and the content of one workspace). */
export function parseData(text: string): AppData | null {
  try {
    return parseWorkspaceData(JSON.parse(text));
  } catch {
    return null;
  }
}

export function parseStateObject(raw: unknown): AppState | null {
  if (!isObj(raw) || !Array.isArray(raw.workspaces)) return null;
  const seen = new Set<string>();
  const workspaces: Workspace[] = [];
  for (const w of raw.workspaces as unknown[]) {
    if (!isObj(w) || !isStr(w.id) || !w.id || seen.has(w.id)) continue;
    const data = parseWorkspaceData(w);
    if (!data) continue;
    seen.add(w.id);
    workspaces.push({ id: w.id, ...data });
  }
  if (!workspaces.length) return null;
  const activeId = isStr(raw.activeId) && seen.has(raw.activeId) ? raw.activeId : workspaces[0].id;
  return { activeId, workspaces };
}

export function parseState(text: string): AppState | null {
  try {
    return parseStateObject(JSON.parse(text));
  } catch {
    return null;
  }
}

export function safeStorage(): Storage | undefined {
  try {
    return typeof window !== 'undefined' ? window.localStorage : undefined;
  } catch {
    return undefined;
  }
}

export function loadData(storage: Storage | undefined = safeStorage()): LoadResult {
  let text: string | null = null;
  let legacy: string | null = null;
  try {
    text = storage ? storage.getItem(STORAGE_KEY) : null;
    if (text === null && storage) legacy = storage.getItem(LEGACY_KEY);
  } catch {
    return { state: createState(), status: 'seeded' };
  }
  if (text !== null) {
    const state = parseState(text);
    return state ? { state, status: 'ok' } : { state: createState(), status: 'corrupt' };
  }
  if (legacy !== null) {
    const data = parseData(legacy);
    if (data) return { state: { activeId: 'w1', workspaces: [{ id: 'w1', ...data }] }, status: 'migrated' };
  }
  return { state: createState(), status: 'seeded' };
}

/** Returns true on success. */
export function saveData(state: AppState, storage: Storage | undefined = safeStorage()): boolean {
  try {
    if (!storage) return false;
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

/* ---------- Backup file ---------- */
export const BACKUP_APP = 'plum-crm';

export function buildBackup(state: AppState): string {
  return JSON.stringify({ app: BACKUP_APP, version: 4, exportedAt: new Date().toISOString(), state }, null, 2);
}

/** Accepts a backup file, a bare state, or a legacy single-company export. */
export function parseBackup(text: string): AppState | null {
  try {
    const raw = JSON.parse(text);
    if (isObj(raw) && raw.app === BACKUP_APP && raw.state) return parseStateObject(raw.state);
    const asState = parseStateObject(raw);
    if (asState) return asState;
    const data = parseWorkspaceData(raw);
    return data ? { activeId: 'w1', workspaces: [{ id: 'w1', ...data }] } : null;
  } catch {
    return null;
  }
}
