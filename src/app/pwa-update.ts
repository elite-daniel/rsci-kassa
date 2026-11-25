import { Injectable, signal } from '@angular/core';

/** Meldet neue Versionen, lädt sie aber nur auf ausdrücklichen Tipp (nie mitten im Betrieb). */
@Injectable({ providedIn: 'root' })
export class PwaUpdate {
  readonly neueVersion = signal(false);
  private aktualisieren?: (reload?: boolean) => Promise<void>;

  async starten(): Promise<void> {
    if (typeof window === 'undefined' || import.meta.env.DEV) return;
    const { registerSW } = await import('virtual:pwa-register');
    this.aktualisieren = registerSW({
      onNeedRefresh: () => this.neueVersion.set(true),
      onRegisteredSW: (_url, registrierung) => {
        // Beim Wiederöffnen und stündlich nach Updates schauen (nur wenn online).
        const pruefen = () => navigator.onLine && registrierung?.update();
        setInterval(pruefen, 60 * 60 * 1000);
        document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && pruefen());
      },
    });
  }

  jetztLaden(): void {
    void this.aktualisieren?.(true);
  }
}
