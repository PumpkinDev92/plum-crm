import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';

// jsdom has no canvas; axe probes it, so give it a quiet stub.
HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement['getContext'];

beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem('plum-crm:lang', 'ru');
  window.history.pushState({}, '', '/');
});

afterEach(() => {
  cleanup();
  document.body.style.overflow = '';
});
