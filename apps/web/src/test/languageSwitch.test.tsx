import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { SETTINGS_STORAGE_KEY, useSettings } from '../settings/store';
import { renderApp } from './renderApp';

describe('runtime language switch', () => {
  it('switches the whole shell between English and Turkish without a reload', async () => {
    renderApp('/settings/appearance', { language: 'en' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Appearance' })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeTruthy();

    act(() => useSettings.getState().update({ language: 'tr' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Görünüm' })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Ana gezinme' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Veri Merkezi' })).toBeTruthy();
    expect(document.documentElement.lang).toBe('tr');
    expect(document.title).toBe('Görünüm · Mateo');
  });

  it('switches from the language menu in the top bar and remembers the choice', async () => {
    const user = userEvent.setup();
    renderApp('/', { language: 'en' });
    await user.click(await screen.findByRole('button', { name: /^Change language/ }));
    await user.click(await screen.findByRole('menuitemradio', { name: 'Türkçe' }));

    expect(await screen.findByRole('button', { name: /^Dili değiştir/ })).toBeTruthy();
    const stored = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) ?? '{}') as {
      state?: { language?: string };
    };
    expect(stored.state?.language).toBe('tr');
  });
});
