import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { useSettings } from '../settings/store';
import { renderApp } from './renderApp';

describe('app shell', () => {
  it('has banner, navigation and main landmarks and a skip link', async () => {
    renderApp('/');
    expect(await screen.findByRole('main')).toBeTruthy();
    expect(screen.getByRole('banner')).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Skip to content' })).toBeTruthy();
  });

  it('shows the side areas and no steps before a project is open', async () => {
    renderApp('/');
    const nav = await screen.findByRole('navigation', { name: 'Main navigation' });
    for (const name of ['Learn', 'Settings']) {
      expect(within(nav).getByRole('link', { name })).toBeTruthy();
    }
    expect(within(nav).queryByRole('list', { name: 'Steps of the decision' })).toBeNull();
  });

  it('opens Learn and marks the link as current', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/');
    const nav = await screen.findByRole('navigation', { name: 'Main navigation' });
    // Load the lazy chunk first so that a slow CI machine cannot time out on the import.
    await import('../library/LibraryIndexPage');
    await user.click(within(nav).getByRole('link', { name: 'Learn' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Learn' }, { timeout: 10_000 }),
    ).toBeTruthy();
    expect(router.state.location.pathname).toBe('/learn/library');
    expect(within(nav).getByRole('link', { name: 'Learn' }).getAttribute('aria-current')).toBe(
      'page',
    );
  });

  it('sends addresses of the earlier layout to their new page', async () => {
    const { router } = renderApp('/analysis/results');
    await screen.findByRole('main');
    await waitFor(() => expect(router.state.location.pathname).toBe('/result/history'));
  });

  it('applies the dark theme and reduced motion settings to the document', async () => {
    renderApp('/');
    await screen.findByRole('main');
    act(() => useSettings.getState().update({ theme: 'dark', motion: 'reduce' }));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.dataset['reducedMotion']).toBe('true');
    act(() => useSettings.getState().update({ theme: 'light', motion: 'system' }));
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.dataset['reducedMotion']).toBeUndefined();
  });

  it('formats numbers with the display settings', async () => {
    renderApp('/settings/language');
    await screen.findByRole('heading', { level: 1, name: 'Language and Formats' });
    act(() =>
      useSettings.getState().update({ displayNumberFormat: 'dot-comma', displayPrecision: 2 }),
    );
    expect(screen.getByText('1.234,57')).toBeTruthy();
    act(() =>
      useSettings.getState().update({ displayNumberFormat: 'comma-dot', displayPrecision: 3 }),
    );
    expect(screen.getByText('1,234.568')).toBeTruthy();
  });
});
