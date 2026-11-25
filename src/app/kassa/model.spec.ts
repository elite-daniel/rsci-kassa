import { describe, expect, it } from 'vitest';
import { Artikel, bonieren, euro, mengeAendern, parseEuro, rueckgeld, summe, zeilen } from './model';

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
