import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createAppI18n } from '../i18n/setup';
import { sampleFixture, SAMPLE_IDS } from '../library/samples';
import { PAGES } from '../navigation/navigation';
import { findUntranslated, pseudoProcessor } from './pseudo';
import { renderApp } from './renderApp';

const paths = [
  ...PAGES.map((page) => page.path),
  // Pages of the Method Library: a ranking method, a weighting method and the two-variant page.
  '/learn/library/marcos',
  '/learn/library/critic',
  '/learn/library/swara',
  '/does-not-exist',
];

/**
 * The names of alternatives and criteria in the reference examples come from the papers and are
 * data, like the names in a user's project: they are shown as they were printed.
 */
const PAPER_NAMES = new Set(
  SAMPLE_IDS.flatMap((id) => {
    const input = sampleFixture(id).input;
    const criteria = (input['criteria'] as { id: string; name?: string }[]).map(
      (criterion) => criterion.name ?? criterion.id,
    );
    return [...criteria, ...((input['alternatives'] as string[] | undefined) ?? [])];
  }),
);

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
    expect(
      findUntranslated(document.body).filter(
        (problem) => !PAPER_NAMES.has(problem.replace(/^text: /u, '')),
      ),
    ).toEqual([]);
  });
});
