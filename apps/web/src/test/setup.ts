import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';
import { useSettings } from '../settings/store';

// jsdom has no matchMedia; report "no preference" for every query.
if (typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

// jsdom lacks these, Radix and the shell call them.
const elementPrototype = window.HTMLElement.prototype as unknown as Record<string, unknown>;
for (const method of ['scrollIntoView', 'scrollTo', 'hasPointerCapture', 'releasePointerCapture']) {
  elementPrototype[method] ??= () => undefined;
}
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

beforeEach(() => {
  localStorage.clear();
  useSettings.getState().reset();
});

afterEach(() => {
  cleanup();
});
