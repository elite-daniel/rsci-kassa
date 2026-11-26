/// <reference types="vitest" />

import { defineConfig } from 'vite';
import analog from '@analogjs/platform';
import angular from '@analogjs/vite-plugin-angular';
import nitro from '@analogjs/vite-plugin-nitro';
import { VitePWA } from 'vite-plugin-pwa';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// GitHub Pages liefert unter https://elite-daniel.github.io/rsci-kassa/ aus.
// Für eine eigene Domain (z. B. kassa.rsci.elite.tirol) BASE_PATH=/ setzen.
const base = process.env['BASE_PATH'] ?? '/rsci-kassa/';

// Versionsnummer: Major.Minor aus package.json, die letzte Stelle ist die Anzahl der Commits.
// Sie steigt also mit jedem Push automatisch (die Action holt dafür die ganze Git-Historie).
function versionsnummer(): string {
  const [major, minor] = (JSON.parse(readFileSync('package.json', 'utf8')).version as string).split('.');
  let commits = '0';
  try {
    commits = execSync('git rev-list --count HEAD', { encoding: 'utf8' }).trim();
  } catch {
    // ohne Git (z. B. aus einem ZIP gebaut) bleibt es bei 0
  }
  return `${major}.${minor}.${commits}`;
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? base : '/',
  define: {
    __VERSION__: JSON.stringify(versionsnummer()),
  },
  build: {
    target: ['es2020'],
  },
  resolve: {
    mainFields: ['module'],
  },
  plugins: [
    analog({
      ssr: false,
      prerender: {
        routes: [],
      },
    }),
    angular(),
    nitro({ static: true }),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'logo.png'],
      manifest: {
        name: 'RSCI Kassa',
        short_name: 'Kassa',
        description: 'Kleine Kassa des RSC Inzing',
        lang: 'de-AT',
        theme_color: '#0b0b0d',
        background_color: '#0b0b0d',
        display: 'fullscreen',
        orientation: 'landscape',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    include: ['src/**/*.spec.ts'],
  },
}));
