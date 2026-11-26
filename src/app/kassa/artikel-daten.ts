import {
  Artikel,
  FARBEN,
  FarbId,
  Kategorie,
  KategorienEinstellung,
  STANDARD_KATEGORIEN_EINSTELLUNG,
  kategorieVon,
} from './model';

export interface ArtikelExport {
  format: 'rsci-kassa-artikel';
  version: 2;
  exportiertAm: string;
  artikel: Artikel[];
  kategorien: Kategorie[];
  kategorienEinstellung: KategorienEinstellung;
}

/** Alles, was eine Artikelliste ausmacht – das, was exportiert und importiert wird. */
export interface ArtikelDaten {
  artikel: Artikel[];
  kategorien: Kategorie[];
  kategorienEinstellung: KategorienEinstellung;
}

export function neueId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `a-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const FARB_IDS = new Set<string>(FARBEN.map((f) => f.id));

function farbeOder(wert: unknown, standard: FarbId): FarbId {
  return (FARB_IDS.has(wert as string) ? wert : standard) as FarbId;
}

/** Prüft und normalisiert eine eingelesene Datei (v1 oder v2, oder ein bloßes Artikel-Array).
 *  Wirft mit verständlicher Meldung. */
export function artikelAusImport(daten: unknown): ArtikelDaten {
  const export_ = (Array.isArray(daten) ? { artikel: daten } : daten) as Partial<ArtikelExport> | null;
  const liste = export_?.artikel;
  if (!Array.isArray(liste)) {
    throw new Error('Die Datei enthält keine Artikelliste.');
  }

  const rohKategorien = Array.isArray(export_?.kategorien) ? export_.kategorien : [];
  const kategorien: Kategorie[] = rohKategorien.map((k: Partial<Kategorie>, i) => {
    if (typeof k?.bezeichnung !== 'string' || !k.bezeichnung.trim()) {
      throw new Error(`Kategorie ${i + 1}: Bezeichnung fehlt.`);
    }
    return {
      id: typeof k.id === 'string' && k.id ? k.id : neueId(),
      bezeichnung: k.bezeichnung.trim(),
      farbe: farbeOder(k.farbe, 'rot'),
    };
  });

  const e = (export_?.kategorienEinstellung ?? {}) as Partial<KategorienEinstellung>;
  const kategorienEinstellung: KategorienEinstellung = {
    aktiv: typeof e.aktiv === 'boolean' ? e.aktiv : STANDARD_KATEGORIEN_EINSTELLUNG.aktiv,
    titelAnzeigen: typeof e.titelAnzeigen === 'boolean' ? e.titelAnzeigen : STANDARD_KATEGORIEN_EINSTELLUNG.titelAnzeigen,
    sonstigesFarbe: farbeOder(e.sonstigesFarbe, STANDARD_KATEGORIEN_EINSTELLUNG.sonstigesFarbe),
  };

  const artikel = liste.map((a: Partial<Artikel>, i) => {
    const nr = i + 1;
    if (typeof a?.bezeichnung !== 'string' || !a.bezeichnung.trim()) {
      throw new Error(`Artikel ${nr}: Bezeichnung fehlt.`);
    }
    if (!Number.isInteger(a.preis)) {
      throw new Error(`Artikel ${nr} („${a.bezeichnung}“): Preis ist ungültig.`);
    }
    const artikel: Artikel = {
      id: typeof a.id === 'string' && a.id ? a.id : neueId(),
      bezeichnung: a.bezeichnung.trim(),
      preis: a.preis as number,
      pfand: Number.isInteger(a.pfand) ? (a.pfand as number) : 0,
      farbe: farbeOder(a.farbe, 'rot'),
    };
    const kategorieId = kategorieVon(a as Artikel, kategorien);
    return kategorieId ? { ...artikel, kategorieId } : artikel;
  });

  return { artikel, kategorien, kategorienEinstellung };
}

