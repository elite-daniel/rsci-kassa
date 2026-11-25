import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Erzeugt App-Icons aus dem Vereinslogo auf schwarzem Grund: npm run icons
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    transparent: { ...minimal2023Preset.transparent, padding: 0.1, resizeOptions: { background: '#0b0b0d', fit: 'contain' } },
    maskable: { ...minimal2023Preset.maskable, padding: 0.25, resizeOptions: { background: '#0b0b0d', fit: 'contain' } },
    apple: { ...minimal2023Preset.apple, padding: 0.2, resizeOptions: { background: '#0b0b0d', fit: 'contain' } },
  },
  images: ['public/logo.png'],
});
