import { describe, expect, it } from 'vitest';
import { ArtikelDaten } from './artikel-daten';
import {
  KEINE_PROFILE,
  STANDARD,
  aktiveDaten,
  aktivesAendern,
  profilAktivieren,
  profilAnlegen,
  profilErsetzen,
  profilLoeschen,
  profilUmbenennen,
  profileAusSpeicher,
} from './profile';

const standard: ArtikelDaten = {
  artikel: [{ id: 'bier', bezeichnung: 'Bier', preis: 400, pfand: 200, farbe: 'rot' }],
  kategorien: [],
  kategorienEinstellung: { aktiv: false, titelAnzeigen: true, sonstigesFarbe: 'grau' },
};

const teurer = (d: ArtikelDaten): ArtikelDaten => ({ ...d, artikel: d.artikel.map((a) => ({ ...a, preis: 450 })) });

describe('Standard', () => {
  it('ist eine gültige Artikelliste mit Artikeln', () => {
    expect(STANDARD.artikel.length).toBeGreaterThan(0);
  });
});

describe('Profile', () => {
  it('ohne Profil ist der Standard aktiv', () => {
    expect(aktiveDaten(KEINE_PROFILE, standard)).toBe(standard);
  });

  it('ein neues Profil ist eine aktive Kopie des Standards und ändert ihn nicht', () => {
    let p = profilAnlegen(KEINE_PROFILE, 'Sommerfest', standard, 'p1');
    expect(p.aktivId).toBe('p1');
    p = aktivesAendern(p, teurer);
    expect(aktiveDaten(p, standard).artikel[0].preis).toBe(450);
    expect(standard.artikel[0].preis).toBe(400);
  });

  it('Änderungen bei aktivem Standard bewirken nichts', () => {
    const p = profilAktivieren(profilAnlegen(KEINE_PROFILE, 'A', standard, 'p1'), null);
    expect(aktivesAendern(p, teurer)).toBe(p);
  });

  it('löscht man das aktive Profil, ist der Standard aktiv', () => {
    const p = profilLoeschen(profilAnlegen(KEINE_PROFILE, 'A', standard, 'p1'), 'p1');
    expect(p).toEqual(KEINE_PROFILE);
  });

  it('löscht man ein anderes Profil, bleibt das aktive aktiv', () => {
    let p = profilAnlegen(KEINE_PROFILE, 'A', standard, 'p1');
    p = profilAnlegen(p, 'B', standard, 'p2');
    expect(profilLoeschen(p, 'p1').aktivId).toBe('p2');
  });

  it('aus Standard laden ersetzt den Inhalt, Name bleibt', () => {
    let p = aktivesAendern(profilAnlegen(KEINE_PROFILE, 'A', standard, 'p1'), teurer);
    p = profilUmbenennen(p, 'p1', 'Weihnachtsmarkt');
    p = profilErsetzen(p, 'p1', standard);
    expect(p.profile[0].name).toBe('Weihnachtsmarkt');
    expect(p.profile[0].artikel[0].preis).toBe(400);
  });

  it('unbekannte Profile lassen sich nicht aktivieren', () => {
    expect(profilAktivieren(KEINE_PROFILE, 'gibts-nicht')).toBe(KEINE_PROFILE);
  });
});

describe('profileAusSpeicher', () => {
  it('liest gespeicherte Profile wieder ein', () => {
    const p = profilAnlegen(KEINE_PROFILE, 'A', standard, 'p1');
    expect(profileAusSpeicher(JSON.parse(JSON.stringify(p)))).toEqual(p);
  });

  it('verwirft Unlesbares und fällt auf den Standard zurück', () => {
    expect(profileAusSpeicher(null)).toEqual(KEINE_PROFILE);
    expect(profileAusSpeicher({ profile: [{ id: 'x', name: 'X', artikel: 'kaputt' }], aktivId: 'x' })).toEqual(KEINE_PROFILE);
  });
});
