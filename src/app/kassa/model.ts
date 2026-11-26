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
  { id: 'orange', name: 'Orange', bg: '#e8740c', fg: '#17171b' },
  { id: 'lila', name: 'Lila', bg: '#6a3d9a', fg: '#ffffff' },
] as const;

export type FarbId = (typeof FARBEN)[number]['id'];

export function farbe(id: FarbId) {
  return FARBEN.find((f) => f.id === id) ?? FARBEN[0];
}

export interface Artikel {
  id: string;
  bezeichnung: string;
  /** Darf negativ sein (z. B. Pfandrückgabe). */
  preis: Cent;
  /** 0 = kein Pfand. */
  pfand: Cent;
  farbe: FarbId;
  /** Fehlt, ist null oder zeigt auf eine gelöschte Kategorie = ohne Kategorie (→ Sonstiges). */
  kategorieId?: string | null;
}

export interface Kategorie {
  id: string;
  bezeichnung: string;
  farbe: FarbId;
}

export interface KategorienEinstellung {
  /** Kategorien zuordnen und die Kassa danach gruppieren. Aus = alles nur ausgeblendet. */
  aktiv: boolean;
  titelAnzeigen: boolean;
  sonstigesFarbe: FarbId;
}

export const STANDARD_KATEGORIEN_EINSTELLUNG: KategorienEinstellung = {
  aktiv: false,
  titelAnzeigen: true,
  sonstigesFarbe: 'grau',
};

export const SONSTIGES = 'Sonstiges';

/** Eine Gruppe von Artikelknöpfen. kategorieId null = Sonstiges (bzw. alle, wenn Kategorien aus sind). */
export interface Gruppe {
  kategorieId: string | null;
  titel: string | null;
  farbe: FarbId;
  artikel: Artikel[];
}

/** Die Kategorie, zu der ein Artikel tatsächlich zählt – null, wenn keine (mehr) existiert. */
export function kategorieVon(artikel: Artikel, kategorien: readonly Kategorie[]): string | null {
  const id = artikel.kategorieId ?? null;
  return id !== null && kategorien.some((k) => k.id === id) ? id : null;
}

/** Artikel für die Anzeige: bei aktiven Kategorien in Kategorie-Reihenfolge gruppiert, Sonstiges am Ende,
 *  leere Gruppen weggelassen. Innerhalb einer Gruppe gilt die Artikel-Reihenfolge. */
export function gruppen(
  artikel: readonly Artikel[],
  kategorien: readonly Kategorie[],
  einstellung: KategorienEinstellung,
): Gruppe[] {
  if (!einstellung.aktiv) {
    return artikel.length ? [{ kategorieId: null, titel: null, farbe: einstellung.sonstigesFarbe, artikel: [...artikel] }] : [];
  }
  const alle: Gruppe[] = [
    ...kategorien.map((k) => ({ kategorieId: k.id, titel: k.bezeichnung, farbe: k.farbe, artikel: [] as Artikel[] })),
    { kategorieId: null, titel: SONSTIGES, farbe: einstellung.sonstigesFarbe, artikel: [] },
  ];
  for (const a of artikel) {
    const id = kategorieVon(a, kategorien);
    alle.find((g) => g.kategorieId === id)!.artikel.push(a);
  }
  return alle.filter((g) => g.artikel.length > 0);
}

/** Tauscht das Element mit dem nächsten Nachbarn derselben Gruppe in die gewünschte Richtung. */
export function verschiebenInGruppe<T extends { id: string }>(
  liste: readonly T[],
  id: string,
  richtung: -1 | 1,
  gruppeVon: (t: T) => string | null = () => null,
): T[] {
  const i = liste.findIndex((t) => t.id === id);
  if (i < 0) return [...liste];
  const gruppe = gruppeVon(liste[i]);
  let j = i + richtung;
  while (j >= 0 && j < liste.length && gruppeVon(liste[j]) !== gruppe) j += richtung;
  if (j < 0 || j >= liste.length) return [...liste];
  const neu = [...liste];
  [neu[i], neu[j]] = [neu[j], neu[i]];
  return neu;
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
