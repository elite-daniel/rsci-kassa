import { Injectable, computed, effect, signal } from '@angular/core';
import { ArtikelDaten, ArtikelExport } from './artikel-daten';
import {
  Artikel,
  Kategorie,
  KategorienEinstellung,
  STANDARD_KATEGORIEN_EINSTELLUNG,
  gruppen,
  kategorieVon,
  verschiebenInGruppe,
} from './model';
import { laden, speichern } from './speicher';

const ARTIKEL_KEY = 'rsci-kassa.artikel';
const KATEGORIEN_KEY = 'rsci-kassa.kategorien';
const KATEGORIEN_EINSTELLUNG_KEY = 'rsci-kassa.kategorien-einstellung';
const PIN_KEY = 'rsci-kassa.pin';
export const STANDARD_PIN = '0000';

const BEISPIEL_ARTIKEL: Artikel[] = [
  { id: 'bier', bezeichnung: 'Bier', preis: 400, pfand: 200, farbe: 'rot' },
  { id: 'spritzer', bezeichnung: 'Spritzer', preis: 350, pfand: 200, farbe: 'rot' },
  { id: 'limo', bezeichnung: 'Limo', preis: 300, pfand: 200, farbe: 'dunkelrot' },
  { id: 'wasser', bezeichnung: 'Wasser', preis: 200, pfand: 200, farbe: 'blau' },
  { id: 'wuerstel', bezeichnung: 'Würstel', preis: 400, pfand: 0, farbe: 'gold' },
  { id: 'kaffee', bezeichnung: 'Kaffee', preis: 250, pfand: 0, farbe: 'schwarz' },
  { id: 'becher-retour', bezeichnung: 'Becher retour', preis: -200, pfand: 0, farbe: 'grau' },
];

@Injectable({ providedIn: 'root' })
export class ArtikelStore {
  private readonly _artikel = signal<Artikel[]>(laden(ARTIKEL_KEY, BEISPIEL_ARTIKEL));
  private readonly _kategorien = signal<Kategorie[]>(laden(KATEGORIEN_KEY, []));
  private readonly _kategorienEinstellung = signal<KategorienEinstellung>({
    ...STANDARD_KATEGORIEN_EINSTELLUNG,
    ...laden<Partial<KategorienEinstellung>>(KATEGORIEN_EINSTELLUNG_KEY, {}),
  });
  private readonly _pin = signal<string>(laden(PIN_KEY, STANDARD_PIN));

  readonly artikel = this._artikel.asReadonly();
  readonly kategorien = this._kategorien.asReadonly();
  readonly kategorienEinstellung = this._kategorienEinstellung.asReadonly();
  readonly gruppen = computed(() => gruppen(this._artikel(), this._kategorien(), this._kategorienEinstellung()));
  readonly istStandardPin = computed(() => this._pin() === STANDARD_PIN);

  constructor() {
    effect(() => speichern(ARTIKEL_KEY, this._artikel()));
    effect(() => speichern(KATEGORIEN_KEY, this._kategorien()));
    effect(() => speichern(KATEGORIEN_EINSTELLUNG_KEY, this._kategorienEinstellung()));
    effect(() => speichern(PIN_KEY, this._pin()));
  }

  /** Die Gruppe, in der ein Artikel gerade angezeigt wird (null = Sonstiges bzw. keine Gruppierung). */
  private gruppeVon = (a: Artikel): string | null =>
    this._kategorienEinstellung().aktiv ? kategorieVon(a, this._kategorien()) : null;

  /** Wechselt ein bestehender Artikel die Gruppe, rutscht er ans Ende der neuen Gruppe. */
  speichern(artikel: Artikel): void {
    this._artikel.update((liste) => {
      const alt = liste.find((a) => a.id === artikel.id);
      if (!alt) return [...liste, artikel];
      if (this.gruppeVon(alt) !== this.gruppeVon(artikel)) {
        return [...liste.filter((a) => a.id !== artikel.id), artikel];
      }
      return liste.map((a) => (a.id === artikel.id ? artikel : a));
    });
  }

  loeschen(id: string): void {
    this._artikel.update((liste) => liste.filter((a) => a.id !== id));
  }

  /** Verschiebt innerhalb der angezeigten Gruppe. */
  verschieben(id: string, richtung: -1 | 1): void {
    this._artikel.update((liste) => verschiebenInGruppe(liste, id, richtung, this.gruppeVon));
  }

  kategorienEinstellen(aenderung: Partial<KategorienEinstellung>): void {
    this._kategorienEinstellung.update((e) => ({ ...e, ...aenderung }));
  }

  kategorieSpeichern(kategorie: Kategorie): void {
    this._kategorien.update((liste) =>
      liste.some((k) => k.id === kategorie.id)
        ? liste.map((k) => (k.id === kategorie.id ? kategorie : k))
        : [...liste, kategorie],
    );
  }

  /** Die Artikel bleiben erhalten und sind danach ohne Kategorie. */
  kategorieLoeschen(id: string): void {
    this._kategorien.update((liste) => liste.filter((k) => k.id !== id));
    this._artikel.update((liste) =>
      liste.map((a) => (a.kategorieId === id ? { ...a, kategorieId: null } : a)),
    );
  }

  kategorieVerschieben(id: string, richtung: -1 | 1): void {
    this._kategorien.update((liste) => verschiebenInGruppe(liste, id, richtung));
  }

  anzahlArtikelIn(kategorieId: string): number {
    return this._artikel().filter((a) => a.kategorieId === kategorieId).length;
  }

  ersetzen(daten: ArtikelDaten): void {
    this._artikel.set(daten.artikel);
    this._kategorien.set(daten.kategorien);
    this._kategorienEinstellung.set(daten.kategorienEinstellung);
  }

  exportieren(): ArtikelExport {
    return {
      format: 'rsci-kassa-artikel',
      version: 2,
      exportiertAm: new Date().toISOString(),
      artikel: this._artikel(),
      kategorien: this._kategorien(),
      kategorienEinstellung: this._kategorienEinstellung(),
    };
  }

  pinPruefen(eingabe: string): boolean {
    return eingabe === this._pin();
  }

  pinAendern(neu: string): void {
    this._pin.set(neu);
  }
}
