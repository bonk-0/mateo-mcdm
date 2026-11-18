/**
 * Renders the app icons in `public/` from `source.svg`. Run `pnpm --filter @mateo/web icons`
 * after changing the source. The maskable icon fills the whole square, because the system
 * cuts it to its own shape (a circle, a squircle...) and keeps only the centre safe.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const source = readFileSync(fileURLToPath(new URL('source.svg', import.meta.url)), 'utf8');
// Full bleed: the rounded square grows to the whole canvas and loses its corners.
const maskable = source.replace(
  '<rect x="64" y="64" width="896" height="896" rx="200"',
  '<rect x="0" y="0" width="1024" height="1024"',
);
if (maskable === source) throw new Error('source.svg changed: update the maskable variant');

const outputs = [
  { file: 'icon-192.png', svg: source, size: 192 },
  { file: 'icon-512.png', svg: source, size: 512 },
  { file: 'icon-maskable-512.png', svg: maskable, size: 512 },
  { file: 'apple-touch-icon.png', svg: maskable, size: 180 },
];

const browser = await chromium.launch();
try {
  for (const { file, svg, size } of outputs) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(
      `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
    );
    const png = await page.screenshot({ omitBackground: true });
    writeFileSync(fileURLToPath(new URL(`../public/${file}`, import.meta.url)), png);
    await page.close();
  }
} finally {
  await browser.close();
}
