/** Alle Beträge in Cent (ganzzahlig), um Rundungsfehler zu vermeiden. */
export type Cent = number;

export const FARBEN = [
  { id: 'rot', name: 'Rot', bg: '#e1141e', fg: '#ffffff' },
  { id: 'dunkelrot', name: 'Dunkelrot', bg: '#9e0c14', fg: '#ffffff' },
  { id: 'schwarz', name: 'Schwarz', bg: '#151519', fg: '#ffffff' },
  { id: 'grau', name: 'Grau', bg: '#5b5b66', fg: '#ffffff' },
  { id: 'weiss', name: 'Weiß', bg: '#ffffff', fg: '#17171b' },
  { id: 'gold', name: 'Gold', bg: '#c99a1e', fg: '#17171b' },
  { id: 'gruen', name: 'Grün', bg: '#2f7d3a', fg: '#ffffff' },
  { id: 'blau', name: 'Blau', bg: '#1f4e8c', fg: '#ffffff' },
] as const;

export type FarbId = (typeof FARBEN)[number]['id'];

export interface Artikel {
  id: string;
  bezeichnung: string;
  /** Darf negativ sein (z. B. Pfandrückgabe). */
  preis: Cent;
  /** 0 = kein Pfand. */
  pfand: Cent;
  farbe: FarbId;
}

/** Ein bonierter Artikel des aktuellen Gastes. Hält eine Kopie des Artikels,
 *  damit spätere Änderungen in den Einstellungen den laufenden Gast nicht verändern. */
export interface Position {
  artikel: Artikel;
  menge: number;
}

export type Zeile =
  | { art: 'artikel'; artikelId: string; bezeichnung: string; menge: number; einzelpreis: Cent; betrag: Cent }
  | { art: 'pfand'; menge: number; einzelpreis: Cent; betrag: Cent };

export function bonieren(positionen: readonly Position[], artikel: Artikel): Position[] {
  const vorhanden = positionen.find((p) => p.artikel.id === artikel.id);
  if (vorhanden) {
    return positionen.map((p) => (p === vorhanden ? { ...p, menge: p.menge + 1 } : p));
  }
  return [...positionen, { artikel: { ...artikel }, menge: 1 }];
}

export function mengeAendern(positionen: readonly Position[], artikelId: string, delta: number): Position[] {
  return positionen
    .map((p) => (p.artikel.id === artikelId ? { ...p, menge: p.menge + delta } : p))
    .filter((p) => p.menge > 0);
}

/** Artikelzeilen in Bonier-Reihenfolge, danach eine Pfandzeile je Pfandbetrag. */
export function zeilen(positionen: readonly Position[]): Zeile[] {
  const artikelZeilen: Zeile[] = positionen.map((p) => ({
    art: 'artikel',
    artikelId: p.artikel.id,
    bezeichnung: p.artikel.bezeichnung,
    menge: p.menge,
    einzelpreis: p.artikel.preis,
    betrag: p.artikel.preis * p.menge,
  }));

  const pfandMengen = new Map<Cent, number>();
  for (const p of positionen) {
    if (p.artikel.pfand !== 0) {
      pfandMengen.set(p.artikel.pfand, (pfandMengen.get(p.artikel.pfand) ?? 0) + p.menge);
    }
  }
  const pfandZeilen: Zeile[] = [...pfandMengen]
    .sort(([a], [b]) => a - b)
    .map(([einzelpreis, menge]) => ({ art: 'pfand', menge, einzelpreis, betrag: einzelpreis * menge }));

  return [...artikelZeilen, ...pfandZeilen];
}

export function summe(positionen: readonly Position[]): Cent {
  return zeilen(positionen).reduce((s, z) => s + z.betrag, 0);
}

/** Positiv = Rückgeld, negativ = es fehlt noch so viel. */
export function rueckgeld(summe: Cent, gegeben: Cent): Cent {
  return gegeben - summe;
}

const euroFormat = new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR' });

export function euro(cent: Cent): string {
  return euroFormat.format(cent / 100);
}

/** "4", "4,5", "-2,00", "€ 3.50" → Cent. Gibt null bei ungültiger Eingabe. */
export function parseEuro(eingabe: string): Cent | null {
  const s = eingabe.replace(/€|\s/g, '').replace(',', '.');
  if (!/^[-−]?\d+(\.\d{0,2})?$/.test(s)) return null;
  return Math.round(Number(s.replace('−', '-')) * 100);
}

export function centAlsEingabe(cent: Cent): string {
  return (cent / 100).toFixed(2).replace('.', ',');
}
