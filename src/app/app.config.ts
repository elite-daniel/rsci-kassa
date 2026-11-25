import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeDeAt from '@angular/common/locales/de-AT';
import { withHashLocation } from '@angular/router';
import { provideFileRouter } from '@analogjs/router';

registerLocaleData(localeDeAt);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Hash-Routing: funktioniert auf GitHub Pages und offline ohne Server-Rewrites.
    provideFileRouter(withHashLocation()),
    { provide: LOCALE_ID, useValue: 'de-AT' },
  ],
};
