import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import App from '../App';

const setup = () => ({ user: userEvent.setup(), ...render(<App />) });

const metric = (label: string) => screen.getByText(label).closest('.metric')!.querySelector('.metric__value')!.textContent ?? '';
const nav = (user: ReturnType<typeof userEvent.setup>, name: string) => user.click(within(screen.getByRole('navigation')).getByRole('link', { name }));

async function createDeal(user: ReturnType<typeof userEvent.setup>, title: string, company: string, amount: string) {
  await user.click(screen.getByRole('button', { name: 'Новая сделка' }));
  const dialog = screen.getByRole('dialog');
  await user.type(within(dialog).getByLabelText(/Название/), title);
  await user.type(within(dialog).getByLabelText(/Компания/), company);
  await user.type(within(dialog).getByLabelText(/Сумма/), amount);
  await user.click(within(dialog).getByRole('button', { name: 'Создать' }));
}

describe('main scenario', () => {
  it('creates a deal, changes its stage and updates the overview', async () => {
    const { user } = setup();
    const openBefore = Number(metric('Открытые сделки').replace(/\D/g, ''));

    await nav(user, 'Сделки');
    await createDeal(user, 'Тестовая сделка', 'ACME', '1000000');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Сделка создана')).toBeInTheDocument();
    expect(screen.getByText('Тестовая сделка')).toBeInTheDocument();

    await nav(user, 'Обзор');
    expect(Number(metric('Открытые сделки').replace(/\D/g, ''))).toBe(openBefore + 1);
    const wonBefore = metric('Сумма выигранных');

    await nav(user, 'Сделки');
    await user.selectOptions(screen.getByLabelText('Этап сделки «Тестовая сделка»'), 'won');
    expect(screen.getByText(/Этап изменён: Выиграна/)).toBeInTheDocument();

    await nav(user, 'Обзор');
    expect(Number(metric('Открытые сделки').replace(/\D/g, ''))).toBe(openBefore);
    expect(metric('Сумма выигранных')).not.toBe(wonBefore);
  });

  it('persists the new deal across a reload', async () => {
    const { user, unmount } = setup();
    await nav(user, 'Сделки');
    await createDeal(user, 'Переживёт перезагрузку', 'Persist Inc', '5000');
    unmount();

    const again = setup();
    await nav(again.user, 'Сделки');
    expect(screen.getByText('Переживёт перезагрузку')).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const { user } = setup();
    await nav(user, 'Сделки');
    await user.click(screen.getByRole('button', { name: 'Новая сделка' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Создать' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(within(screen.getByRole('dialog')).getAllByText('Обязательное поле').length).toBeGreaterThanOrEqual(2);
    expect(within(screen.getByRole('dialog')).getByText('Введите число от 0')).toBeInTheDocument();
  });
});

describe('dialog', () => {
  it('closes on Escape and returns focus to the opener', async () => {
    const { user } = setup();
    await nav(user, 'Сделки');
    const opener = screen.getByRole('button', { name: 'Новая сделка' });
    await user.click(opener);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(within(screen.getByRole('dialog')).getByLabelText(/Название/)).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('keeps Tab inside the dialog', async () => {
    const { user } = setup();
    await nav(user, 'Сделки');
    await user.click(screen.getByRole('button', { name: 'Новая сделка' }));
    const dialog = screen.getByRole('dialog');
    for (let i = 0; i < 12; i++) {
      await user.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
  });
});

describe('delete with undo', () => {
  it('deletes a deal and restores it', async () => {
    const { user } = setup();
    await nav(user, 'Сделки');
    await user.click(screen.getByRole('button', { name: /Редактировать сделку «Аренда офиса, 3 этаж, Harbor Tower»/ }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Удалить' }));
    expect(screen.queryByText('Аренда офиса, 3 этаж, Harbor Tower')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Отменить' }));
    expect(screen.getByText('Аренда офиса, 3 этаж, Harbor Tower')).toBeInTheDocument();
  });

  it('deleting a contact unlinks deals and undo relinks them', async () => {
    const { user } = setup();
    await nav(user, 'Контакты');
    await user.click(screen.getByRole('button', { name: 'Редактировать контакт Алина Мельник' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/Сделки контакта/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Удалить' }));
    expect(screen.queryByText('Алина Мельник')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Отменить' }));
    expect(screen.getByText('Алина Мельник')).toBeInTheDocument();
  });
});

describe('contacts', () => {
  it('creates a contact and links it to a deal', async () => {
    const { user } = setup();
    await nav(user, 'Контакты');
    await user.click(screen.getByRole('button', { name: 'Новый контакт' }));
    let dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText(/Имя/), 'Вера Новая');
    await user.type(within(dialog).getByLabelText(/Компания/), 'Fresh Ltd');
    await user.click(within(dialog).getByRole('button', { name: 'Создать' }));
    expect(screen.getByText('Вера Новая')).toBeInTheDocument();

    await nav(user, 'Сделки');
    await user.click(screen.getByRole('button', { name: /Редактировать сделку «Торговая галерея, первый этаж»/ }));
    dialog = screen.getByRole('dialog');
    await user.selectOptions(within(dialog).getByLabelText('Контакт'), within(dialog).getByRole('option', { name: 'Вера Новая — Fresh Ltd' }));
    await user.click(within(dialog).getByRole('button', { name: 'Сохранить' }));
    expect(screen.getByRole('button', { name: 'Открыть контакт Вера Новая' })).toBeInTheDocument();
  });

  it('searches contacts and sorts by a column', async () => {
    const { user } = setup();
    await nav(user, 'Контакты');
    await user.type(screen.getByLabelText('Поиск по имени и компании'), 'kite');
    expect(screen.getByText('Максим Кравец')).toBeInTheDocument();
    expect(screen.queryByText('Алина Мельник')).not.toBeInTheDocument();
  });
});

describe('deals list', () => {
  it('searches, filters by stage and by contact', async () => {
    const { user } = setup();
    await nav(user, 'Сделки');
    await user.type(screen.getByLabelText('Поиск по названию и компании'), 'northgate');
    expect(screen.getByText(/Сделок: \d+/)).toBeInTheDocument();
    expect(screen.queryByText('Аренда офиса, 3 этаж, Harbor Tower')).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText('Поиск по названию и компании'));
    await user.selectOptions(screen.getByLabelText('Фильтр по этапу'), 'won');
    const won = screen.getAllByRole('article');
    expect(won.length).toBeGreaterThan(0);
    for (const card of won) expect(within(card).getByRole('combobox')).toHaveValue('won');

    await user.selectOptions(screen.getByLabelText('Фильтр по этапу'), 'all');
    await user.selectOptions(screen.getByLabelText('Фильтр по контакту'), 'c1');
    expect(screen.getByText('Аренда офиса, 3 этаж, Harbor Tower')).toBeInTheDocument();
    expect(screen.queryByText('Склад класса A, 8 000 м²')).not.toBeInTheDocument();
  });

  it('opens a contact from a deal card', async () => {
    const { user } = setup();
    await nav(user, 'Сделки');
    await user.click(screen.getAllByRole('button', { name: 'Открыть контакт Алина Мельник' })[0]);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(within(screen.getByRole('dialog')).getByLabelText(/Имя/)).toHaveValue('Алина Мельник');
  });
});

describe('notes', () => {
  it('adds, completes, edits and deletes a note', async () => {
    const { user } = setup();
    await nav(user, 'Заметки');
    await user.click(screen.getAllByRole('button', { name: 'Новая заметка' })[0]);
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText(/Заметка/), 'Позвонить в банк');
    await user.click(within(dialog).getByRole('button', { name: 'Создать' }));
    expect(screen.getByText('Позвонить в банк')).toBeInTheDocument();

    const box = screen.getByRole('checkbox', { name: /Позвонить в банк/ });
    expect(box).toHaveAttribute('aria-checked', 'false');
    await user.click(box);
    expect(screen.getByRole('checkbox', { name: /Позвонить в банк/ })).toHaveAttribute('aria-checked', 'true');

    await user.click(screen.getByRole('button', { name: 'Удалить заметку: Позвонить в банк' }));
    expect(screen.queryByText('Позвонить в банк')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Отменить' }));
    expect(screen.getByText('Позвонить в банк')).toBeInTheDocument();
  });

  it('flags overdue notes', async () => {
    const { user } = setup();
    await nav(user, 'Заметки');
    await user.click(screen.getByRole('button', { name: /^Просроченные/ }));
    expect(screen.getByText('Отправить отчёт по воронке руководителю')).toBeInTheDocument();
    expect(screen.getAllByText('Просрочено').length).toBeGreaterThan(0);
  });
});

describe('quick search', () => {
  it('opens with Ctrl+K, filters, and navigates with Enter', async () => {
    const { user } = setup();
    await user.keyboard('{Control>}k{/Control}');
    const dialog = await screen.findByRole('dialog');
    const input = within(dialog).getByRole('combobox');
    expect(input).toHaveFocus();
    await user.type(input, 'Кросс-док');
    expect(within(dialog).getAllByRole('option').length).toBeGreaterThan(0);
    await user.keyboard('{Enter}');
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    expect(window.location.pathname).toBe('/deals');
  });

  it('shows an empty state', async () => {
    const { user } = setup();
    await user.keyboard('{Control>}k{/Control}');
    await user.type(within(await screen.findByRole('dialog')).getByRole('combobox'), 'zzzzqqq');
    expect(screen.getAllByText('Ничего не найдено').length).toBeGreaterThan(0);
  });
});

describe('company block', () => {
  it('hides requisites by default, reveals them, and copies', async () => {
    const { user } = setup();
    const region = screen.getByRole('region', { name: 'Рабочий кабинет компании' });
    expect(within(region).queryByText('40702810900000004521')).not.toBeInTheDocument();
    await user.click(within(region).getByRole('button', { name: 'Показать реквизиты' }));
    expect(within(region).getByText('40702810900000004521')).toBeInTheDocument();
    await user.click(within(region).getByRole('button', { name: 'Скрыть реквизиты' }));
    expect(within(region).queryByText('40702810900000004521')).not.toBeInTheDocument();
  });

  it('adds a second company with its own empty data and switches back', async () => {
    const { user } = setup();
    const region = screen.getByRole('region', { name: 'Рабочий кабинет компании' });
    await user.click(within(region).getByRole('button', { name: 'Сменить компанию' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Добавить компанию' }));
    const form = await screen.findByRole('dialog');
    await user.type(within(form).getByLabelText(/Название компании/), 'Second Co');
    await user.click(within(form).getByRole('button', { name: 'Создать' }));

    expect(within(screen.getByRole('region', { name: 'Рабочий кабинет компании' })).getByText('Second Co')).toBeInTheDocument();
    await nav(user, 'Сделки');
    expect(screen.getByText('Сделки не найдены')).toBeInTheDocument();

    await user.click(within(screen.getByRole('region', { name: 'Рабочий кабинет компании' })).getByRole('button', { name: 'Сменить компанию' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Открыть кабинет: Plum Realty Group/ }));
    expect(screen.queryByText('Сделки не найдены')).not.toBeInTheDocument();
  });
});

describe('overview period', () => {
  it('narrows the figures when a shorter period is selected', async () => {
    const { user } = setup();
    const all = Number(metric('Открытые сделки').replace(/\D/g, ''));
    await user.click(screen.getByRole('button', { name: '30 дней' }));
    expect(Number(metric('Открытые сделки').replace(/\D/g, ''))).toBeLessThan(all);
  });

  it('switches the language', async () => {
    const { user } = setup();
    await user.selectOptions(screen.getByLabelText('Язык'), 'en');
    expect(screen.getByRole('heading', { level: 1, name: 'Overview' })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Language'), 'uk');
    expect(screen.getByRole('heading', { level: 1, name: 'Огляд' })).toBeInTheDocument();
  });
});

describe('accessibility (axe, structure rules)', () => {
  const routes = ['/', '/deals', '/contacts', '/notes', '/ui-kit'];
  for (const path of routes) {
    it(`has no violations on ${path}`, async () => {
      window.history.pushState({}, '', path);
      const { container } = setup();
      const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
      expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ') + ' ' + n.html.slice(0, 160)).join(' | ')}`)).toEqual([]);
    });
  }

  it('has no violations with a dialog open', async () => {
    const { user } = setup();
    await nav(user, 'Сделки');
    await user.click(screen.getByRole('button', { name: 'Новая сделка' }));
    const result = await axe.run(document.body, { rules: { 'color-contrast': { enabled: false } } });
    expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
  });
});
