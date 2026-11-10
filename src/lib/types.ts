export const STAGES = ['new', 'progress', 'proposal', 'won', 'lost'] as const;
export type Stage = (typeof STAGES)[number];
export const OPEN_STAGES: Stage[] = ['new', 'progress', 'proposal'];

export interface Deal {
  id: string;
  title: string;
  company: string;
  amount: number;
  stage: Stage;
  contactId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  name: string;
  company: string;
  position: string;
  email: string;
}

/** A personal work-day note. `date` is a local calendar day, YYYY-MM-DD. */
export interface Note {
  id: string;
  text: string;
  date: string;
  done: boolean;
  createdAt: string;
  dealId?: string;
  contactId?: string;
}

/** The company whose workspace the user is working in. */
export interface Company {
  name: string;
  account: string;
  inn: string;
  iban: string;
  /** Small square JPEG as a data URL. */
  photo?: string;
}

/** Everything that belongs to one company workspace. */
export interface AppData {
  deals: Deal[];
  contacts: Contact[];
  notes: Note[];
  company: Company;
}

export interface Workspace extends AppData {
  id: string;
}

export interface AppState {
  activeId: string;
  workspaces: Workspace[];
}

export const isStage = (v: unknown): v is Stage =>
  typeof v === 'string' && (STAGES as readonly string[]).includes(v);

export function toDayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export const isDayKey = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
