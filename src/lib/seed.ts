import { DEFAULT_AVATAR } from './defaultAvatar';
import { toDayKey, type AppData, type AppState, type Company, type Contact, type Deal, type Note, type Stage } from './types';

const DAY = 86_400_000;

/** Small deterministic PRNG so the starting data is identical on every first run. */
function lcg(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export const defaultCompany = (): Company => ({
  name: 'Plum Realty Group',
  account: '40702810900000004521',
  inn: '7701234567',
  iban: 'UA213052990000026007233566001',
  photo: DEFAULT_AVATAR,
});

export function createState(now = Date.now()): AppState {
  return { activeId: 'w1', workspaces: [{ id: 'w1', ...createSeed(now) }] };
}

/** A brand-new, empty company workspace. */
export const emptyData = (company: Company): AppData => ({ deals: [], contacts: [], notes: [], company });

export function createSeed(now = Date.now()): AppData {
  const contacts: Contact[] = [
    { id: 'c1', name: 'Алина Мельник', company: 'Harbor Point Capital', position: 'Директор по инвестициям', email: 'a.melnyk@harborpoint.example' },
    { id: 'c2', name: 'Дмитрий Орлов', company: 'Northgate Logistics', position: 'Руководитель по недвижимости', email: 'd.orlov@northgate.example' },
    { id: 'c3', name: 'Ирина Левченко', company: 'Brightway Retail', position: 'Операционный директор', email: 'i.levchenko@brightway.example' },
    { id: 'c4', name: 'Максим Кравец', company: 'Kite Coworking', position: 'Основатель', email: 'm.kravets@kite.example' },
    { id: 'c5', name: 'Олена Шевчук', company: 'Greenfield Foods', position: 'Финансовый директор', email: 'o.shevchuk@greenfield.example' },
    { id: 'c6', name: 'Томас Вейл', company: 'Lumen Clinics', position: 'Управляющий объектами', email: 't.vale@lumen.example' },
    { id: 'c7', name: 'Софья Рубан', company: 'Atlas Fintech', position: 'Руководитель офиса', email: 's.ruban@atlas.example' },
    { id: 'c8', name: 'Павел Гончар', company: 'Riverside Hotels', position: 'Директор по развитию', email: 'p.honchar@riverside.example' },
    { id: 'c9', name: 'Нина Баранова', company: 'Summit Energy', position: 'Руководитель закупок', email: 'n.baranova@summit.example' },
    { id: 'c10', name: 'Артём Волошин', company: 'Orchid Pharma', position: 'Директор по логистике', email: 'a.voloshyn@orchid.example' },
    { id: 'c11', name: 'Лидия Ковальчук', company: 'Vertex Studio', position: 'Управляющий партнёр', email: 'l.kovalchuk@vertex.example' },
    { id: 'c12', name: 'Генри Стоун', company: 'Polar Cold Storage', position: 'Коммерческий директор', email: 'h.stone@polar.example' },
  ];

  const make = (
    n: number,
    title: string,
    company: string,
    amount: number,
    stage: Stage,
    contactId: string | undefined,
    createdDaysAgo: number,
    updatedDaysAgo: number,
  ): Deal => ({
    id: `d${n}`,
    title,
    company,
    amount,
    stage,
    contactId,
    createdAt: new Date(now - createdDaysAgo * DAY).toISOString(),
    updatedAt: new Date(now - updatedDaysAgo * DAY - n * 60_000).toISOString(),
  });

  // Recent, hand-written deals
  const deals: Deal[] = [
    make(1, 'Аренда офиса, 3 этаж, Harbor Tower', 'Harbor Point Capital', 420_000, 'proposal', 'c1', 30, 1),
    make(2, 'Склад класса A, 8 000 м²', 'Northgate Logistics', 1_250_000, 'progress', 'c2', 45, 2),
    make(3, 'Торговая галерея, первый этаж', 'Brightway Retail', 680_000, 'new', 'c3', 5, 0),
    make(4, 'Коворкинг на 120 мест', 'Kite Coworking', 310_000, 'won', 'c4', 60, 7),
    make(5, 'Продажа производственного здания', 'Greenfield Foods', 2_400_000, 'proposal', 'c5', 50, 3),
    make(6, 'Медицинский центр, 900 м²', 'Lumen Clinics', 540_000, 'progress', 'c6', 20, 4),
    make(7, 'Штаб-квартира, 2 000 м²', 'Atlas Fintech', 890_000, 'won', 'c7', 80, 12),
    make(8, 'Отельный комплекс, управление', 'Riverside Hotels', 3_100_000, 'lost', 'c8', 90, 15),
    make(9, 'Парковочные места, 60 шт.', 'Harbor Point Capital', 95_000, 'new', 'c1', 3, 1),
    make(10, 'Субаренда лофта', 'Kite Coworking', 150_000, 'lost', 'c4', 40, 20),
    make(11, 'Ритейл-парк, участок 1,2 га', 'Brightway Retail', 1_800_000, 'progress', undefined, 25, 6),
    make(12, 'Кросс-док терминал', 'Northgate Logistics', 760_000, 'won', 'c2', 70, 25),
  ];

  // Two years of history
  const rnd = lcg(2026);
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
  const types = ['Аренда офиса', 'Склад класса B', 'Торговое помещение', 'Офисный этаж', 'Продажа здания', 'Парковка', 'Субаренда', 'Коворкинг', 'Логистический хаб', 'Шоурум', 'Медицинский кабинет', 'Земельный участок'];
  const places = ['Harbor Tower', 'Riverside Plaza', 'Northgate Park', 'Central Mall', 'Atlas Square', 'Greenfield Hub'];
  const COUNT = 36;
  for (let i = 0; i < COUNT; i++) {
    const n = 13 + i;
    const created = Math.round(18 + (i / (COUNT - 1)) * 700 + (rnd() - 0.5) * 14);
    const contact = pick(contacts);
    const amount = Math.round((60_000 + rnd() * rnd() * 2_400_000) / 5_000) * 5_000;
    let stage: Stage;
    const r = rnd();
    if (created < 70) stage = r < 0.35 ? 'new' : r < 0.65 ? 'progress' : r < 0.8 ? 'proposal' : r < 0.92 ? 'won' : 'lost';
    else stage = r < 0.58 ? 'won' : 'lost';
    const updated = Math.max(created - Math.round(10 + rnd() * 55), stage === 'new' || stage === 'progress' || stage === 'proposal' ? 2 : 26);
    deals.push(make(n, `${pick(types)}, ${pick(places)}`, contact.company, amount, stage, contact.id, created, Math.min(updated, created)));
  }

  // Extra recent activity so the daily chart has something to show
  for (let i = 0; i < 16; i++) {
    const n = 13 + COUNT + i;
    const created = Math.floor(rnd() * 30);
    const contact = pick(contacts);
    const amount = Math.round((60_000 + rnd() * rnd() * 1_800_000) / 5_000) * 5_000;
    const r = rnd();
    const stage: Stage = r < 0.4 ? 'new' : r < 0.65 ? 'progress' : r < 0.82 ? 'proposal' : r < 0.93 ? 'won' : 'lost';
    deals.push(make(n, `${pick(types)}, ${pick(places)}`, contact.company, amount, stage, contact.id, created, Math.floor(created * rnd())));
  }

  const today = new Date(now);
  const day = (offset: number) => toDayKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset));
  const note = (n: number, text: string, offset: number, done: boolean, dealId?: string, contactId?: string): Note => ({
    id: `n${n}`,
    text,
    date: day(offset),
    done,
    dealId,
    contactId,
    createdAt: new Date(now - Math.max(0, -offset) * DAY - n * 60_000).toISOString(),
  });
  const notes: Note[] = [
    note(1, 'Позвонить Алине Мельник: уточнить сроки по этажу в Harbor Tower', 0, false, 'd1', 'c1'),
    note(2, 'Подготовить коммерческое предложение для Greenfield Foods', 0, false, 'd5', 'c5'),
    note(3, 'Отправить договор аренды на подпись Kite Coworking', 0, true, 'd4', 'c4'),
    note(4, 'Встреча с Northgate Logistics, 15:00: показ склада', 1, false, 'd2', 'c2'),
    note(5, 'Обновить прайс по торговым помещениям', 2, false),
    note(6, 'Проверить оплату по сделке «Кросс-док терминал»', -1, true, 'd12'),
    note(7, 'Отправить отчёт по воронке руководителю', -2, false),
  ];

  return { deals, contacts, notes, company: defaultCompany() };
}
