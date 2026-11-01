import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Node 25+ ships its own localStorage global, which hides jsdom's; use jsdom's
if (globalThis.jsdom) {
  Object.defineProperty(globalThis, 'localStorage', {
    value: globalThis.jsdom.window.localStorage,
    configurable: true,
  });
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});
