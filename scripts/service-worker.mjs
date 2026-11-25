// Erzeugt den Service Worker (Offline-Betrieb) nach dem Build.
// vite-plugin-pwa überspringt das bei Analog, weil Analog zusätzlich einen SSR-Build macht.
import { generateSW } from 'workbox-build';

const ausgabe = process.argv[2] ?? 'dist/analog/public';

const { count, size, warnings } = await generateSW({
  globDirectory: ausgabe,
  swDest: `${ausgabe}/sw.js`,
  globPatterns: ['**/*.{js,css,html,ico,png,woff2,webmanifest}'],
  navigateFallback: 'index.html',
  cleanupOutdatedCaches: true,
  // Updates erst nach Tipp auf „jetzt laden“ aktivieren (SKIP_WAITING-Nachricht).
  skipWaiting: false,
  clientsClaim: false,
  sourcemap: false,
});

for (const w of warnings) console.warn(w);
console.log(`Service Worker: ${count} Dateien (${(size / 1024).toFixed(0)} KB) für Offline-Betrieb vorgeladen.`);
