import { act, screen, within } from '@testing-library/react';
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

  it('shows only Phase 1 items in the sidebar', async () => {
    renderApp('/');
    const nav = await screen.findByRole('navigation', { name: 'Main navigation' });
    for (const name of ['Home', 'Data Center', 'Weighting', 'MARCOS Workspace', 'Method Library']) {
      expect(within(nav).getByRole('link', { name })).toBeTruthy();
    }
    for (const name of ['DEMATEL', 'Hybrid Builder', 'Group Decisions', 'Practice Center']) {
      expect(within(nav).queryByRole('link', { name })).toBeNull();
    }
  });

  it('navigates to a placeholder screen and marks the link as current', async () => {
    const user = userEvent.setup();
    renderApp('/');
    const nav = await screen.findByRole('navigation', { name: 'Main navigation' });
    // Load the lazy chunk first so that a slow CI machine cannot time out on the import.
    await import('../workspace/SensitivityPage');
    await user.click(within(nav).getByRole('link', { name: 'Sensitivity' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sensitivity' }, { timeout: 10_000 }),
    ).toBeTruthy();
    expect(
      within(nav).getByRole('link', { name: 'Sensitivity' }).getAttribute('aria-current'),
    ).toBe('page');
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

  it('collapses the sidebar to icons and keeps links labelled', async () => {
    const user = userEvent.setup();
    renderApp('/');
    await user.click(await screen.findByRole('button', { name: 'Collapse sidebar' }));
    expect(useSettings.getState().sidebarCollapsed).toBe(true);
    expect(screen.getByRole('link', { name: 'Data Center' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeTruthy();
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
