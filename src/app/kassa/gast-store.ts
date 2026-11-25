import { Injectable, computed, effect, signal } from '@angular/core';
import { Artikel, Cent, Position, bonieren, mengeAendern, rueckgeld, summe, zeilen } from './model';
import { laden, speichern } from './speicher';

const GAST_KEY = 'rsci-kassa.gast';
const RUECKGAENGIG_MS = 6000;

interface GastZustand {
  positionen: Position[];
  gegeben: Cent;
}

const LEER: GastZustand = { positionen: [], gegeben: 0 };

/** Der aktuelle Gast. Wird lokal gesichert, damit ein Neuladen des Tablets nichts verliert. */
@Injectable({ providedIn: 'root' })
export class GastStore {
  private readonly zustand = signal<GastZustand>(laden(GAST_KEY, LEER));
  private readonly _vorherigerGast = signal<GastZustand | null>(null);
  private rueckgaengigTimer?: ReturnType<typeof setTimeout>;

  readonly zeilen = computed(() => zeilen(this.zustand().positionen));
  readonly summe = computed(() => summe(this.zustand().positionen));
  readonly gegeben = computed(() => this.zustand().gegeben);
  readonly rueckgeld = computed(() => rueckgeld(this.summe(), this.gegeben()));
  readonly istLeer = computed(() => this.zustand().positionen.length === 0 && this.zustand().gegeben === 0);
  readonly kannRueckgaengig = computed(() => this._vorherigerGast() !== null);

  constructor() {
    effect(() => speichern(GAST_KEY, this.zustand()));
  }

  bonieren(artikel: Artikel): void {
    this.verwerfeRueckgaengig();
    this.zustand.update((z) => ({ ...z, positionen: bonieren(z.positionen, artikel) }));
  }

  mengeAendern(artikelId: string, delta: number): void {
    this.zustand.update((z) => ({ ...z, positionen: mengeAendern(z.positionen, artikelId, delta) }));
  }

  geldDazu(betrag: Cent): void {
    this.zustand.update((z) => ({ ...z, gegeben: z.gegeben + betrag }));
  }

  passend(): void {
    this.zustand.update((z) => ({ ...z, gegeben: Math.max(0, summe(z.positionen)) }));
  }

  gegebenLoeschen(): void {
    this.zustand.update((z) => ({ ...z, gegeben: 0 }));
  }

  naechsterGast(): void {
    if (this.istLeer()) return;
    this._vorherigerGast.set(this.zustand());
    this.zustand.set(LEER);
    clearTimeout(this.rueckgaengigTimer);
    this.rueckgaengigTimer = setTimeout(() => this._vorherigerGast.set(null), RUECKGAENGIG_MS);
  }

  rueckgaengig(): void {
    const vorher = this._vorherigerGast();
    if (!vorher) return;
    this.zustand.set(vorher);
    this.verwerfeRueckgaengig();
  }

  private verwerfeRueckgaengig(): void {
    clearTimeout(this.rueckgaengigTimer);
    this._vorherigerGast.set(null);
  }
}
