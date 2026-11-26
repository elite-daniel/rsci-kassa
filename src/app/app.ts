import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ArtikelStore } from './kassa/artikel-store';
import { PwaUpdate } from './pwa-update';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="kopf">
      <a routerLink="/" class="marke" aria-label="Zur Kassa">
        <img src="logo.png" alt="RSC Inzing" />
        <span>
          <span class="eyebrow eyebrow--hell">RSC Inzing</span>
          <h1>Kassa</h1>
        </span>
      </a>

      @if (update.neueVersion()) {
        <button class="btn btn--sm" (click)="update.jetztLaden()">Neue Version verfügbar – jetzt laden</button>
      }

      <nav>
        <span class="profil" title="Aktives Profil">{{ artikel.aktiverName() }}</span>
        <a
          routerLink="/einstellungen"
          routerLinkActive="aktiv"
          class="zahnrad"
          aria-label="Einstellungen"
          title="Einstellungen"
        >
          <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
            <path
              fill="currentColor"
              d="M19.14 12.94a7.07 7.07 0 0 0 0-1.88l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7 7 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 13.9 2.4h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.59.24-1.13.56-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.66 8.88a.5.5 0 0 0 .12.64l2.03 1.58a7.07 7.07 0 0 0 0 1.88l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.39.3.6.22l2.39-.96c.5.38 1.04.7 1.63.94l.36 2.54c.04.24.25.42.5.42h3.84c.25 0 .46-.18.5-.42l.36-2.54c.59-.24 1.13-.56 1.63-.94l2.39.96c.22.08.47 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.6a3.6 3.6 0 1 1 0-7.2 3.6 3.6 0 0 1 0 7.2Z"
            />
          </svg>
        </a>
      </nav>
    </header>

    <main>
      <router-outlet />
    </main>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      height: 100dvh;
    }
    .kopf {
      flex: none;
      height: var(--header-h);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0 1rem 0 0.75rem;
      background: var(--ink);
      color: var(--white);
      border-bottom: 3px solid var(--red);
    }
    .marke {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      text-decoration: none;
      color: inherit;
    }
    .marke img {
      height: 48px;
      width: auto;
    }
    .marke h1 {
      font-size: 1.9rem;
    }
    .eyebrow--hell {
      color: rgba(255, 255, 255, 0.7);
      font-size: 0.75rem;
      display: block;
    }
    nav {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .profil {
      color: rgba(255, 255, 255, 0.8);
      font-weight: 600;
      max-width: 14rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .zahnrad {
      display: grid;
      place-items: center;
      width: 48px;
      height: 48px;
      border-radius: 999px;
      color: rgba(255, 255, 255, 0.8);
    }
    .zahnrad.aktiv {
      background: var(--red);
      color: var(--white);
    }
    main {
      flex: 1;
      min-height: 0;
    }
  `,
})
export class App {
  protected readonly update = inject(PwaUpdate);
  protected readonly artikel = inject(ArtikelStore);

  constructor() {
    void this.update.starten();
    this.bildschirmWachHalten();
  }

  /** Am Stand soll das Tablet nicht in den Ruhezustand gehen, solange die Kassa offen ist. */
  private bildschirmWachHalten(): void {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
    const anfordern = () => navigator.wakeLock.request('screen').catch(() => undefined);
    void anfordern();
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && anfordern());
  }
}
