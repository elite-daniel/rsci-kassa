import { Injectable, computed, effect, signal } from '@angular/core';
import { ArtikelDaten, ArtikelExport } from './artikel-daten';
import { Artikel, Kategorie, KategorienEinstellung, gruppen, kategorieVon, verschiebenInGruppe } from './model';
import {
  Profile,
  STANDARD,
  aktiveDaten,
  aktivesAendern,
  aktivesProfil,
  profilAktivieren,
  profilAnlegen,
  profilErsetzen,
  profilLoeschen,
  profilUmbenennen,
  profileAusSpeicher,
} from './profile';
import { entfernen, laden, speichern } from './speicher';

const PROFILE_KEY = 'rsci-kassa.profile';
const PIN_KEY = 'rsci-kassa.pin';
/** Speicherstellen vor den Profilen. Sie werden nicht übernommen (es gab noch keine Kassa im Betrieb). */
const ALTE_KEYS = ['rsci-kassa.artikel', 'rsci-kassa.kategorien', 'rsci-kassa.kategorien-einstellung'];
export const STANDARD_PIN = '0000';

/** Artikel und Kategorien des aktiven Profils bzw. des Standards (siehe GLOSSARY: Standard, Profil). */
@Injectable({ providedIn: 'root' })
export class ArtikelStore {
  private readonly _profile = signal<Profile>(profileAusSpeicher(laden<unknown>(PROFILE_KEY, null)));
  private readonly _pin = signal<string>(laden(PIN_KEY, STANDARD_PIN));

  readonly standard = STANDARD;
  readonly profile = computed(() => this._profile().profile);
  readonly aktivesProfil = computed(() => aktivesProfil(this._profile()));
  /** true = der Standard ist aktiv und am Gerät nicht änderbar. */
  readonly standardAktiv = computed(() => this.aktivesProfil() === null);
  readonly aktiverName = computed(() => this.aktivesProfil()?.name ?? 'Standard');

  private readonly daten = computed(() => aktiveDaten(this._profile(), STANDARD));
  readonly artikel = computed(() => this.daten().artikel);
  readonly kategorien = computed(() => this.daten().kategorien);
  readonly kategorienEinstellung = computed(() => this.daten().kategorienEinstellung);
  readonly gruppen = computed(() => gruppen(this.artikel(), this.kategorien(), this.kategorienEinstellung()));
  readonly istStandardPin = computed(() => this._pin() === STANDARD_PIN);

  constructor() {
    ALTE_KEYS.forEach(entfernen);
    effect(() => speichern(PROFILE_KEY, this._profile()));
    effect(() => speichern(PIN_KEY, this._pin()));
  }

  // ---------- Profile ----------

  /** Neues Profil als Kopie des Standards; es ist danach aktiv. */
  profilAnlegen(name: string, daten: ArtikelDaten = STANDARD): void {
    this._profile.update((p) => profilAnlegen(p, name, daten));
  }

  /** null = Standard aktivieren. */
  profilAktivieren(id: string | null): void {
    this._profile.update((p) => profilAktivieren(p, id));
  }

  profilUmbenennen(id: string, name: string): void {
    this._profile.update((p) => profilUmbenennen(p, id, name));
  }

  profilLoeschen(id: string): void {
    this._profile.update((p) => profilLoeschen(p, id));
  }

  profilAusStandardLaden(id: string): void {
    this._profile.update((p) => profilErsetzen(p, id, STANDARD));
  }

  // ---------- Inhalt des aktiven Profils (bei aktivem Standard ohne Wirkung) ----------

  private aendern(aenderung: (d: ArtikelDaten) => ArtikelDaten): void {
    this._profile.update((p) => aktivesAendern(p, aenderung));
  }

  private aendernArtikel(aenderung: (liste: Artikel[], d: ArtikelDaten) => Artikel[]): void {
    this.aendern((d) => ({ ...d, artikel: aenderung(d.artikel, d) }));
  }

  /** Die Gruppe, in der ein Artikel gerade angezeigt wird (null = Sonstiges bzw. keine Gruppierung). */
  private static gruppeVon(d: ArtikelDaten): (a: Artikel) => string | null {
    return (a) => (d.kategorienEinstellung.aktiv ? kategorieVon(a, d.kategorien) : null);
  }

  /** Wechselt ein bestehender Artikel die Gruppe, rutscht er ans Ende der neuen Gruppe. */
  speichern(artikel: Artikel): void {
    this.aendernArtikel((liste, d) => {
      const alt = liste.find((a) => a.id === artikel.id);
      if (!alt) return [...liste, artikel];
      const gruppeVon = ArtikelStore.gruppeVon(d);
      if (gruppeVon(alt) !== gruppeVon(artikel)) {
        return [...liste.filter((a) => a.id !== artikel.id), artikel];
      }
      return liste.map((a) => (a.id === artikel.id ? artikel : a));
    });
  }

  loeschen(id: string): void {
    this.aendernArtikel((liste) => liste.filter((a) => a.id !== id));
  }

  /** Verschiebt innerhalb der angezeigten Gruppe. */
  verschieben(id: string, richtung: -1 | 1): void {
    this.aendernArtikel((liste, d) => verschiebenInGruppe(liste, id, richtung, ArtikelStore.gruppeVon(d)));
  }

  kategorienEinstellen(aenderung: Partial<KategorienEinstellung>): void {
    this.aendern((d) => ({ ...d, kategorienEinstellung: { ...d.kategorienEinstellung, ...aenderung } }));
  }

  kategorieSpeichern(kategorie: Kategorie): void {
    this.aendern((d) => ({
      ...d,
      kategorien: d.kategorien.some((k) => k.id === kategorie.id)
        ? d.kategorien.map((k) => (k.id === kategorie.id ? kategorie : k))
        : [...d.kategorien, kategorie],
    }));
  }

  /** Die Artikel bleiben erhalten und sind danach ohne Kategorie. */
  kategorieLoeschen(id: string): void {
    this.aendern((d) => ({
      ...d,
      kategorien: d.kategorien.filter((k) => k.id !== id),
      artikel: d.artikel.map((a) => (a.kategorieId === id ? { ...a, kategorieId: null } : a)),
    }));
  }

  kategorieVerschieben(id: string, richtung: -1 | 1): void {
    this.aendern((d) => ({ ...d, kategorien: verschiebenInGruppe(d.kategorien, id, richtung) }));
  }

  anzahlArtikelIn(kategorieId: string): number {
    return this.artikel().filter((a) => a.kategorieId === kategorieId).length;
  }

  ersetzen(daten: ArtikelDaten): void {
    const aktiv = this.aktivesProfil();
    if (aktiv) this._profile.update((p) => profilErsetzen(p, aktiv.id, daten));
  }

  exportieren(): ArtikelExport {
    const d = this.daten();
    return {
      format: 'rsci-kassa-artikel',
      version: 2,
      exportiertAm: new Date().toISOString(),
      artikel: d.artikel,
      kategorien: d.kategorien,
      kategorienEinstellung: d.kategorienEinstellung,
    };
  }

  // ---------- PIN (pro Gerät, nie im Standard) ----------

  pinPruefen(eingabe: string): boolean {
    return eingabe === this._pin();
  }

  pinAendern(neu: string): void {
    this._pin.set(neu);
  }
}
