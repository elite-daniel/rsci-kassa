/** Dünne, fehlertolerante Hülle um localStorage (kann im Privatmodus fehlen oder werfen). */
export function laden<T>(schluessel: string, standard: T): T {
  try {
    const roh = globalThis.localStorage?.getItem(schluessel);
    return roh == null ? standard : (JSON.parse(roh) as T);
  } catch {
    return standard;
  }
}

export function speichern(schluessel: string, wert: unknown): void {
  try {
    globalThis.localStorage?.setItem(schluessel, JSON.stringify(wert));
  } catch {
    // Speicher voll oder gesperrt – die Kassa funktioniert trotzdem weiter.
  }
}

export function entfernen(schluessel: string): void {
  try {
    globalThis.localStorage?.removeItem(schluessel);
  } catch {
    // egal
  }
}
