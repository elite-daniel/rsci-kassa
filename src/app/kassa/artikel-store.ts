import { Injectable, computed, effect, signal } from '@angular/core';
import { Artikel, FARBEN, FarbId } from './model';
import { laden, speichern } from './speicher';

const ARTIKEL_KEY = 'rsci-kassa.artikel';
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

export interface ArtikelExport {
  format: 'rsci-kassa-artikel';
  version: 1;
  exportiertAm: string;
  artikel: Artikel[];
}

export function neueId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `a-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Prüft und normalisiert eingelesene Artikel. Wirft mit verständlicher Meldung. */
export function artikelAusImport(daten: unknown): Artikel[] {
  const liste = Array.isArray(daten) ? daten : (daten as Partial<ArtikelExport> | null)?.artikel;
  if (!Array.isArray(liste)) {
    throw new Error('Die Datei enthält keine Artikelliste.');
  }
  const farbIds = new Set<string>(FARBEN.map((f) => f.id));
  return liste.map((a: Partial<Artikel>, i) => {
    const nr = i + 1;
    if (typeof a?.bezeichnung !== 'string' || !a.bezeichnung.trim()) {
      throw new Error(`Artikel ${nr}: Bezeichnung fehlt.`);
    }
    if (!Number.isInteger(a.preis)) {
      throw new Error(`Artikel ${nr} („${a.bezeichnung}“): Preis ist ungültig.`);
    }
    return {
      id: typeof a.id === 'string' && a.id ? a.id : neueId(),
      bezeichnung: a.bezeichnung.trim(),
      preis: a.preis as number,
      pfand: Number.isInteger(a.pfand) ? (a.pfand as number) : 0,
      farbe: (farbIds.has(a.farbe as string) ? a.farbe : 'rot') as FarbId,
    };
  });
}

@Injectable({ providedIn: 'root' })
export class ArtikelStore {
  private readonly _artikel = signal<Artikel[]>(laden(ARTIKEL_KEY, BEISPIEL_ARTIKEL));
  private readonly _pin = signal<string>(laden(PIN_KEY, STANDARD_PIN));

  readonly artikel = this._artikel.asReadonly();
  readonly istStandardPin = computed(() => this._pin() === STANDARD_PIN);

  constructor() {
    effect(() => speichern(ARTIKEL_KEY, this._artikel()));
    effect(() => speichern(PIN_KEY, this._pin()));
  }

  speichern(artikel: Artikel): void {
    this._artikel.update((liste) =>
      liste.some((a) => a.id === artikel.id)
        ? liste.map((a) => (a.id === artikel.id ? artikel : a))
        : [...liste, artikel],
    );
  }

  loeschen(id: string): void {
    this._artikel.update((liste) => liste.filter((a) => a.id !== id));
  }

  verschieben(id: string, richtung: -1 | 1): void {
    this._artikel.update((liste) => {
      const i = liste.findIndex((a) => a.id === id);
      const j = i + richtung;
      if (i < 0 || j < 0 || j >= liste.length) return liste;
      const neu = [...liste];
      [neu[i], neu[j]] = [neu[j], neu[i]];
      return neu;
    });
  }

  ersetzen(artikel: Artikel[]): void {
    this._artikel.set(artikel);
  }

  exportieren(): ArtikelExport {
    return {
      format: 'rsci-kassa-artikel',
      version: 1,
      exportiertAm: new Date().toISOString(),
      artikel: this._artikel(),
    };
  }

  pinPruefen(eingabe: string): boolean {
    return eingabe === this._pin();
  }

  pinAendern(neu: string): void {
    this._pin.set(neu);
  }
}
