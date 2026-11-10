import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { emptyData } from './seed';
import { loadData, saveData, type LoadStatus } from './storage';
import type { AppState, Company, Contact, Deal, Note, Stage, Workspace } from './types';

export type DealInput = Pick<Deal, 'title' | 'company' | 'amount' | 'stage' | 'contactId'>;
export type ContactInput = Omit<Contact, 'id'>;
export type NoteInput = Pick<Note, 'text' | 'date' | 'dealId' | 'contactId'>;

export interface DealSnapshot {
  deal: Deal;
  index: number;
}
export interface NoteSnapshot {
  note: Note;
  index: number;
}
export interface ContactSnapshot {
  contact: Contact;
  index: number;
  dealIds: string[];
  noteIds: string[];
}

interface Store {
  loadStatus: LoadStatus;
  saveFailed: boolean;

  deals: Deal[];
  contacts: Contact[];
  notes: Note[];
  company: Company;

  activeId: string;
  workspaces: { id: string; company: Company }[];
  switchWorkspace(id: string): void;
  addWorkspace(company: Company): string;
  updateCompany(input: Company): void;

  addDeal(input: DealInput): Deal;
  updateDeal(id: string, input: DealInput): void;
  setStage(id: string, stage: Stage): void;
  deleteDeal(id: string): DealSnapshot | undefined;
  restoreDeal(snap: DealSnapshot): void;

  addContact(input: ContactInput): Contact;
  updateContact(id: string, input: ContactInput): void;
  deleteContact(id: string): ContactSnapshot | undefined;
  restoreContact(snap: ContactSnapshot): void;

  addNote(input: NoteInput): void;
  updateNote(id: string, input: NoteInput): void;
  toggleNote(id: string): void;
  deleteNote(id: string): NoteSnapshot | undefined;
  restoreNote(snap: NoteSnapshot): void;

  getState(): AppState;
  /** Replaces everything; returns the previous state so callers can offer "undo". */
  replaceState(next: AppState): AppState;
}

const Ctx = createContext<Store | null>(null);
const uid = (p: string) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const insertAt = <T,>(list: T[], item: T, index: number): T[] => {
  const copy = [...list];
  copy.splice(Math.min(Math.max(index, 0), copy.length), 0, item);
  return copy;
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const initial = useRef(loadData());
  const stateRef = useRef<AppState>(initial.current.state);
  const [state, setState] = useState<AppState>(initial.current.state);
  const [saveFailed, setSaveFailed] = useState(false);

  // Seeded / migrated / recovered data is written as well, so the next load is stable.
  useEffect(() => {
    setSaveFailed(!saveData(state));
  }, [state]);

  const commit = useCallback((fn: (s: AppState) => AppState) => {
    const next = fn(stateRef.current);
    stateRef.current = next;
    setState(next);
  }, []);

  const patch = useCallback(
    (fn: (w: Workspace) => Workspace) =>
      commit((s) => ({ ...s, workspaces: s.workspaces.map((w) => (w.id === s.activeId ? fn(w) : w)) })),
    [commit],
  );

  const active = (): Workspace => {
    const s = stateRef.current;
    return s.workspaces.find((w) => w.id === s.activeId) ?? s.workspaces[0];
  };

  const api = useMemo(() => {
    const now = () => new Date().toISOString();
    const a: Omit<Store, 'loadStatus' | 'saveFailed' | 'deals' | 'contacts' | 'notes' | 'company' | 'activeId' | 'workspaces'> = {
      switchWorkspace: (id) => commit((s) => (s.workspaces.some((w) => w.id === id) ? { ...s, activeId: id } : s)),
      addWorkspace: (company) => {
        const id = uid('w');
        commit((s) => ({ activeId: id, workspaces: [...s.workspaces, { id, ...emptyData(company) }] }));
        return id;
      },
      updateCompany: (input) => patch((w) => ({ ...w, company: input })),

      addDeal: (input) => {
        const t = now();
        const deal: Deal = { ...input, id: uid('d'), createdAt: t, updatedAt: t };
        patch((w) => ({ ...w, deals: [deal, ...w.deals] }));
        return deal;
      },
      updateDeal: (id, input) => {
        const t = now();
        patch((w) => ({ ...w, deals: w.deals.map((d) => (d.id === id ? { ...d, ...input, updatedAt: t } : d)) }));
      },
      setStage: (id, stage) => {
        const t = now();
        patch((w) => ({ ...w, deals: w.deals.map((d) => (d.id === id && d.stage !== stage ? { ...d, stage, updatedAt: t } : d)) }));
      },
      deleteDeal: (id) => {
        const w = active();
        const index = w.deals.findIndex((d) => d.id === id);
        if (index < 0) return undefined;
        const deal = w.deals[index];
        patch((x) => ({ ...x, deals: x.deals.filter((d) => d.id !== id), notes: x.notes.map((n) => (n.dealId === id ? { ...n, dealId: undefined } : n)) }));
        return { deal, index };
      },
      restoreDeal: ({ deal, index }) => patch((w) => (w.deals.some((d) => d.id === deal.id) ? w : { ...w, deals: insertAt(w.deals, deal, index) })),

      addContact: (input) => {
        const c: Contact = { ...input, id: uid('c') };
        patch((w) => ({ ...w, contacts: [c, ...w.contacts] }));
        return c;
      },
      updateContact: (id, input) => patch((w) => ({ ...w, contacts: w.contacts.map((c) => (c.id === id ? { ...c, ...input } : c)) })),
      deleteContact: (id) => {
        const w = active();
        const index = w.contacts.findIndex((c) => c.id === id);
        if (index < 0) return undefined;
        const contact = w.contacts[index];
        const dealIds = w.deals.filter((d) => d.contactId === id).map((d) => d.id);
        const noteIds = w.notes.filter((n) => n.contactId === id).map((n) => n.id);
        patch((x) => ({
          ...x,
          contacts: x.contacts.filter((c) => c.id !== id),
          deals: x.deals.map((d) => (d.contactId === id ? { ...d, contactId: undefined } : d)),
          notes: x.notes.map((n) => (n.contactId === id ? { ...n, contactId: undefined } : n)),
        }));
        return { contact, index, dealIds, noteIds };
      },
      restoreContact: ({ contact, index, dealIds, noteIds }) =>
        patch((w) =>
          w.contacts.some((c) => c.id === contact.id)
            ? w
            : {
                ...w,
                contacts: insertAt(w.contacts, contact, index),
                deals: w.deals.map((d) => (dealIds.includes(d.id) ? { ...d, contactId: contact.id } : d)),
                notes: w.notes.map((n) => (noteIds.includes(n.id) ? { ...n, contactId: contact.id } : n)),
              },
        ),

      addNote: (input) => {
        const n: Note = { ...input, id: uid('n'), done: false, createdAt: now() };
        patch((w) => ({ ...w, notes: [n, ...w.notes] }));
      },
      updateNote: (id, input) => patch((w) => ({ ...w, notes: w.notes.map((n) => (n.id === id ? { ...n, ...input } : n)) })),
      toggleNote: (id) => patch((w) => ({ ...w, notes: w.notes.map((n) => (n.id === id ? { ...n, done: !n.done } : n)) })),
      deleteNote: (id) => {
        const w = active();
        const index = w.notes.findIndex((n) => n.id === id);
        if (index < 0) return undefined;
        const note = w.notes[index];
        patch((x) => ({ ...x, notes: x.notes.filter((n) => n.id !== id) }));
        return { note, index };
      },
      restoreNote: ({ note, index }) => patch((w) => (w.notes.some((n) => n.id === note.id) ? w : { ...w, notes: insertAt(w.notes, note, index) })),

      getState: () => stateRef.current,
      replaceState: (next) => {
        const prev = stateRef.current;
        commit(() => next);
        return prev;
      },
    };
    return a;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commit, patch]);

  const value = useMemo<Store>(() => {
    const w = state.workspaces.find((x) => x.id === state.activeId) ?? state.workspaces[0];
    return {
      ...api,
      loadStatus: initial.current.status,
      saveFailed,
      deals: w.deals,
      contacts: w.contacts,
      notes: w.notes,
      company: w.company,
      activeId: w.id,
      workspaces: state.workspaces.map((x) => ({ id: x.id, company: x.company })),
    };
  }, [state, saveFailed, api]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error('StoreProvider missing');
  return v;
}
