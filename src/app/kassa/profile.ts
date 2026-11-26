import { ArtikelDaten, artikelAusImport, neueId } from './artikel-daten';
import standardDatei from './standard.json';

/** Der Standard: zentral im Repo gepflegt (standard.json), am Gerät nur lesbar. Siehe ADR 0002. */
export const STANDARD: ArtikelDaten = artikelAusImport(standardDatei);

export interface Profil extends ArtikelDaten {
  id: string;
  name: string;
}

/** Alle Profile eines Geräts. aktivId null = der Standard ist aktiv. */
export interface Profile {
  profile: Profil[];
  aktivId: string | null;
}

export const KEINE_PROFILE: Profile = { profile: [], aktivId: null };

/** Tiefe Kopie, damit Profil und Standard nie dieselben Objekte teilen. */
function kopie(daten: ArtikelDaten): ArtikelDaten {
  return structuredClone({
    artikel: daten.artikel,
    kategorien: daten.kategorien,
    kategorienEinstellung: daten.kategorienEinstellung,
  });
}

export function aktivesProfil(p: Profile): Profil | null {
  return p.profile.find((x) => x.id === p.aktivId) ?? null;
}

/** Was an der Kassa erscheint: das aktive Profil oder der Standard. */
export function aktiveDaten(p: Profile, standard: ArtikelDaten): ArtikelDaten {
  return aktivesProfil(p) ?? standard;
}

/** Legt ein Profil als Kopie von `daten` an (normalerweise der Standard) und macht es aktiv. */
export function profilAnlegen(p: Profile, name: string, daten: ArtikelDaten, id = neueId()): Profile {
  return { profile: [...p.profile, { id, name, ...kopie(daten) }], aktivId: id };
}

export function profilAktivieren(p: Profile, id: string | null): Profile {
  return id === null || p.profile.some((x) => x.id === id) ? { ...p, aktivId: id } : p;
}

export function profilUmbenennen(p: Profile, id: string, name: string): Profile {
  return { ...p, profile: p.profile.map((x) => (x.id === id ? { ...x, name } : x)) };
}

/** Wird das aktive Profil gelöscht, ist danach der Standard aktiv. */
export function profilLoeschen(p: Profile, id: string): Profile {
  return { profile: p.profile.filter((x) => x.id !== id), aktivId: p.aktivId === id ? null : p.aktivId };
}

/** Ersetzt Artikel und Kategorien eines Profils; Name und Id bleiben. */
export function profilErsetzen(p: Profile, id: string, daten: ArtikelDaten): Profile {
  return { ...p, profile: p.profile.map((x) => (x.id === id ? { id: x.id, name: x.name, ...kopie(daten) } : x)) };
}

/** Ändert das aktive Profil. Ist der Standard aktiv, bleibt alles unverändert. */
export function aktivesAendern(p: Profile, aenderung: (d: ArtikelDaten) => ArtikelDaten): Profile {
  const aktiv = aktivesProfil(p);
  if (!aktiv) return p;
  const neu = aenderung(aktiv);
  return { ...p, profile: p.profile.map((x) => (x === aktiv ? { ...x, ...neu, id: x.id, name: x.name } : x)) };
}

/** Prüft gespeicherte Profile und verwirft, was nicht lesbar ist. */
export function profileAusSpeicher(roh: unknown): Profile {
  const r = roh as Partial<Profile> | null;
  if (!r || !Array.isArray(r.profile)) return KEINE_PROFILE;
  const profile: Profil[] = [];
  for (const x of r.profile as Partial<Profil>[]) {
    if (typeof x?.id !== 'string' || typeof x.name !== 'string') continue;
    try {
      profile.push({ id: x.id, name: x.name, ...artikelAusImport(x) });
    } catch {
      // Unlesbares Profil überspringen, statt die Kassa nicht starten zu lassen.
    }
  }
  const aktivId = profile.some((x) => x.id === r.aktivId) ? (r.aktivId as string) : null;
  return { profile, aktivId };
}
