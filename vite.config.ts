/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Set VITE_BASE=/repo-name/ when deploying under a sub-path (GitHub Pages).
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  test: { environment: 'jsdom', globals: true, setupFiles: ['./src/test/setup.ts'], css: false, testTimeout: 30000 },
});
