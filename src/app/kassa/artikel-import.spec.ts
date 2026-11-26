import { describe, expect, it } from 'vitest';
import { artikelAusImport } from './artikel-daten';

describe('artikelAusImport', () => {
  it('liest alte v1-Dateien ohne Kategorien und mit ausgeschalteten Kategorien', () => {
    const d = artikelAusImport({
      format: 'rsci-kassa-artikel',
      version: 1,
      artikel: [{ id: 'bier', bezeichnung: 'Bier', preis: 400, pfand: 200, farbe: 'rot' }],
    });
    expect(d.kategorien).toEqual([]);
    expect(d.kategorienEinstellung).toEqual({ aktiv: false, titelAnzeigen: true, sonstigesFarbe: 'grau' });
    expect(d.artikel[0].kategorieId).toBeUndefined();
  });

  it('übernimmt Kategorien und Schalter aus v2 und verwirft Verweise auf unbekannte Kategorien', () => {
    const d = artikelAusImport({
      format: 'rsci-kassa-artikel',
      version: 2,
      artikel: [
        { id: 'bier', bezeichnung: 'Bier', preis: 400, pfand: 200, farbe: 'rot', kategorieId: 'g' },
        { id: 'x', bezeichnung: 'X', preis: 100, pfand: 0, farbe: 'rot', kategorieId: 'gibts-nicht' },
      ],
      kategorien: [{ id: 'g', bezeichnung: ' Getränke ', farbe: 'blau' }],
      kategorienEinstellung: { aktiv: true, titelAnzeigen: false, sonstigesFarbe: 'unbekannt' },
    });
    expect(d.kategorien).toEqual([{ id: 'g', bezeichnung: 'Getränke', farbe: 'blau' }]);
    expect(d.kategorienEinstellung).toEqual({ aktiv: true, titelAnzeigen: false, sonstigesFarbe: 'grau' });
    expect(d.artikel.map((a) => a.kategorieId)).toEqual(['g', undefined]);
  });
});
