import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createAppI18n } from '../i18n/setup';
import { visibleNavigation } from '../navigation/navigation';
import { findUntranslated, pseudoProcessor } from './pseudo';
import { renderApp } from './renderApp';

const paths = [
  ...visibleNavigation().flatMap((section) => section.items.map((item) => item.path)),
  '/does-not-exist',
];

/**
 * Renders every screen with a pseudo-locale that wraps each translated string in markers.
 * Any visible text or accessible label without markers bypassed i18n, which would show up
 * untranslated after switching languages.
 */
describe('every screen is fully translated', () => {
  it.each(paths)('%s', async (path) => {
    const i18n = createAppI18n('en', {
      plugins: [pseudoProcessor],
      options: { postProcess: ['pseudo'] },
    });
    renderApp(path, { i18n });
    await screen.findByRole('main');
    await waitFor(() => expect(document.title).toMatch(/⟦.+⟧ · Mateo/u));
    expect(findUntranslated(document.body)).toEqual([]);
  });
});
