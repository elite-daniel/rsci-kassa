import { describe, expect, it } from 'vitest';
import {
  Artikel,
  Kategorie,
  KategorienEinstellung,
  bonieren,
  euro,
  gruppen,
  mengeAendern,
  parseEuro,
  rueckgeld,
  summe,
  verschiebenInGruppe,
  zeilen,
} from './model';

const bier: Artikel = { id: 'bier', bezeichnung: 'Bier', preis: 400, pfand: 200, farbe: 'rot' };
const spritzer: Artikel = { id: 'spritzer', bezeichnung: 'Spritzer', preis: 350, pfand: 200, farbe: 'rot' };
const glas: Artikel = { id: 'wein', bezeichnung: 'Wein', preis: 450, pfand: 300, farbe: 'rot' };
const wuerstel: Artikel = { id: 'wuerstel', bezeichnung: 'Würstel', preis: 400, pfand: 0, farbe: 'gold' };
const becherRetour: Artikel = { id: 'retour', bezeichnung: 'Becher retour', preis: -200, pfand: 0, farbe: 'grau' };

describe('bonieren', () => {
  it('fasst denselben Artikel zu einer Zeile zusammen', () => {
    const p = bonieren(bonieren(bonieren([], bier), bier), bier);
    expect(zeilen(p)[0]).toMatchObject({ bezeichnung: 'Bier', menge: 3, betrag: 1200 });
  });

  it('legt Pfand als eigene Zeile an, gruppiert nach Betrag', () => {
    let p = bonieren([], bier);
    p = bonieren(p, bier);
    p = bonieren(p, spritzer);
    p = bonieren(p, glas);
    const pfand = zeilen(p).filter((z) => z.art === 'pfand');
    expect(pfand).toEqual([
      { art: 'pfand', menge: 3, einzelpreis: 200, betrag: 600 },
      { art: 'pfand', menge: 1, einzelpreis: 300, betrag: 300 },
    ]);
  });

  it('erzeugt keine Pfandzeile für Artikel ohne Pfand', () => {
    expect(zeilen(bonieren([], wuerstel))).toHaveLength(1);
  });

  it('kopiert den Artikel, damit spätere Preisänderungen den Gast nicht betreffen', () => {
    const a = { ...bier };
    const p = bonieren([], a);
    a.preis = 999;
    expect(summe(p)).toBe(600);
  });
});

describe('mengeAendern', () => {
  it('reduziert Artikel und Pfand gemeinsam und entfernt die Zeile bei 0', () => {
    let p = bonieren(bonieren([], bier), bier);
    p = mengeAendern(p, 'bier', -1);
    expect(summe(p)).toBe(600);
    p = mengeAendern(p, 'bier', -1);
    expect(zeilen(p)).toEqual([]);
  });
});

describe('summe', () => {
  it('rechnet Pfandrückgabe negativ', () => {
    let p = bonieren([], bier); // 4 + 2
    p = bonieren(p, becherRetour); // -2
    expect(summe(p)).toBe(400);
  });

  it('wird negativ, wenn nur zurückgegeben wird', () => {
    const p = bonieren(bonieren(bonieren([], becherRetour), becherRetour), becherRetour);
    expect(summe(p)).toBe(-600);
  });
});

describe('rueckgeld', () => {
  it('berechnet Rückgeld bzw. Fehlbetrag', () => {
    expect(rueckgeld(1250, 2000)).toBe(750);
    expect(rueckgeld(1250, 1000)).toBe(-250);
  });
});

describe('parseEuro / euro', () => {
  it('versteht übliche Eingaben', () => {
    expect(parseEuro('4')).toBe(400);
    expect(parseEuro('3,5')).toBe(350);
    expect(parseEuro('€ 2.50')).toBe(250);
    expect(parseEuro('-2,00')).toBe(-200);
    expect(parseEuro('−2')).toBe(-200);
    expect(parseEuro('abc')).toBeNull();
    expect(parseEuro('1,234')).toBeNull();
  });

  it('formatiert österreichisch', () => {
    expect(euro(1250).replace(/\s/g, ' ')).toBe('€ 12,50');
  });
});

describe('gruppen', () => {
  const getraenke: Kategorie = { id: 'g', bezeichnung: 'Getränke', farbe: 'blau' };
  const essen: Kategorie = { id: 'e', bezeichnung: 'Essen', farbe: 'gold' };
  const an: KategorienEinstellung = { aktiv: true, titelAnzeigen: true, sonstigesFarbe: 'lila' };
  const artikel: Artikel[] = [
    { ...wuerstel, kategorieId: 'e' },
    { ...bier, kategorieId: 'g' },
    becherRetour,
    { ...spritzer, kategorieId: 'g' },
  ];

  it('zeigt bei ausgeschalteten Kategorien eine Gruppe ohne Titel in Artikel-Reihenfolge', () => {
    const g = gruppen(artikel, [getraenke, essen], { ...an, aktiv: false });
    expect(g).toHaveLength(1);
    expect(g[0].titel).toBeNull();
    expect(g[0].artikel.map((a) => a.id)).toEqual(['wuerstel', 'bier', 'retour', 'spritzer']);
  });

  it('gruppiert in Kategorie-Reihenfolge mit Sonstiges am Ende', () => {
    const g = gruppen(artikel, [getraenke, essen], an);
    expect(g.map((x) => [x.titel, x.farbe, x.artikel.map((a) => a.id)])).toEqual([
      ['Getränke', 'blau', ['bier', 'spritzer']],
      ['Essen', 'gold', ['wuerstel']],
      ['Sonstiges', 'lila', ['retour']],
    ]);
  });

  it('lässt leere Gruppen weg und zählt Artikel gelöschter Kategorien zu Sonstiges', () => {
    const g = gruppen([{ ...bier, kategorieId: 'weg' }], [getraenke], an);
    expect(g.map((x) => x.titel)).toEqual(['Sonstiges']);
  });
});

describe('verschiebenInGruppe', () => {
  const liste = [
    { id: 'a', g: 'x' },
    { id: 'b', g: 'y' },
    { id: 'c', g: 'x' },
  ];
  const gruppeVon = (t: { g: string }) => t.g;

  it('tauscht mit dem nächsten Nachbarn derselben Gruppe', () => {
    expect(verschiebenInGruppe(liste, 'c', -1, gruppeVon).map((t) => t.id)).toEqual(['c', 'b', 'a']);
  });

  it('bleibt am Rand der Gruppe stehen', () => {
    expect(verschiebenInGruppe(liste, 'b', 1, gruppeVon).map((t) => t.id)).toEqual(['a', 'b', 'c']);
  });

  it('verschiebt ohne Gruppen einfach um eins', () => {
    expect(verschiebenInGruppe(liste, 'a', 1).map((t) => t.id)).toEqual(['b', 'a', 'c']);
  });
});
