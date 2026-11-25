import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArtikelStore } from '../kassa/artikel-store';
import { GastStore } from '../kassa/gast-store';
import { Artikel, FARBEN, euro } from '../kassa/model';

const MUENZEN_SCHEINE = [50, 100, 200, 500, 1000, 2000, 5000];

@Component({
  selector: 'app-kassa',
  imports: [RouterLink],
  template: `
    <section class="artikel" aria-label="Artikel">
      @for (a of artikelStore.artikel(); track a.id) {
        <button
          class="artikel-knopf"
          [style.background]="farbe(a).bg"
          [style.color]="farbe(a).fg"
          [class.hell]="a.farbe === 'weiss'"
          (click)="gast.bonieren(a)"
        >
          <span class="name">{{ a.bezeichnung }}</span>
          <span class="preis tabular">{{ euro(a.preis) }}</span>
          @if (a.pfand) {
            <span class="pfand tabular">+ {{ euro(a.pfand) }} Pfand</span>
          }
        </button>
      } @empty {
        <div class="leer card">
          <p>Noch keine Artikel angelegt.</p>
          <a class="btn" routerLink="/einstellungen">Artikel anlegen</a>
        </div>
      }
    </section>

    <aside class="bon">
      <div class="liste">
        @for (z of gast.zeilen(); track z.art === 'artikel' ? z.artikelId : 'pfand-' + z.einzelpreis) {
          <div class="zeile" [class.pfand-zeile]="z.art === 'pfand'">
            @if (z.art === 'artikel') {
              <button class="rund" (click)="gast.mengeAendern(z.artikelId, -1)" aria-label="Eins weniger">−</button>
              <span class="menge tabular">{{ z.menge }}</span>
              <button class="rund" (click)="gast.mengeAendern(z.artikelId, 1)" aria-label="Eins mehr">+</button>
            } @else {
              <span class="menge menge--pfand tabular">{{ z.menge }} ×</span>
            }
            <span class="text">
              <span class="bez">{{ z.art === 'artikel' ? z.bezeichnung : 'Pfand' }}</span>
              <small class="tabular">je {{ euro(z.einzelpreis) }}</small>
            </span>
            <span class="betrag tabular" [class.negativ]="z.betrag < 0">{{ euro(z.betrag) }}</span>
          </div>
        } @empty {
          <p class="hinweis">Artikel links antippen</p>
        }
      </div>

      <div class="summe" [class.auszahlen]="gast.summe() < 0">
        <span class="eyebrow">{{ gast.summe() < 0 ? 'Auszahlen' : 'Summe' }}</span>
        <span class="summe-betrag tabular">{{ euro(betragAbs()) }}</span>
      </div>

      @if (gast.summe() > 0) {
        <div class="geld">
          <div class="geld-knoepfe">
            @for (c of muenzenScheine; track c) {
              <button class="geld-knopf tabular" (click)="gast.geldDazu(c)">+{{ geldLabel(c) }}</button>
            }
            <button class="geld-knopf geld-knopf--passend" (click)="gast.passend()">Passend</button>
            <button class="geld-knopf geld-knopf--c" (click)="gast.gegebenLoeschen()" aria-label="Gegeben löschen">C</button>
          </div>
          <div class="geld-info tabular">
            <span>Gegeben <b>{{ euro(gast.gegeben()) }}</b></span>
            @if (gast.gegeben() > 0) {
              @if (gast.rueckgeld() >= 0) {
                <span class="retour">Retour <b>{{ euro(gast.rueckgeld()) }}</b></span>
              } @else {
                <span class="fehlt">Fehlt <b>{{ euro(-gast.rueckgeld()) }}</b></span>
              }
            }
          </div>
        </div>
      }

      <button class="btn naechster" [disabled]="gast.istLeer()" (click)="gast.naechsterGast()">Nächster Gast</button>

      @if (gast.kannRueckgaengig()) {
        <div class="toast" role="status">
          <span>Neuer Gast – alles auf 0.</span>
          <button class="btn btn--sm btn--ghost" (click)="gast.rueckgaengig()">Rückgängig</button>
        </div>
      }
    </aside>
  `,
  styles: `
    :host {
      display: grid;
      grid-template-columns: 1fr minmax(340px, 34%);
      height: 100%;
    }

    /* ---------- Artikel ---------- */
    .artikel {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
      grid-auto-rows: minmax(120px, auto);
      align-content: start;
      gap: 12px;
      padding: 14px;
      overflow-y: auto;
    }
    .artikel-knopf {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.25rem;
      padding: 14px 16px;
      border: 0;
      border-radius: var(--radius);
      text-align: left;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
      transition: transform 0.08s, filter 0.08s;
    }
    .artikel-knopf:active {
      transform: scale(0.96);
      filter: brightness(0.88);
    }
    .artikel-knopf.hell {
      box-shadow: inset 0 0 0 2px var(--line), 0 4px 12px rgba(0, 0, 0, 0.08);
    }
    .name {
      font-family: var(--display);
      font-weight: 800;
      font-size: 1.7rem;
      line-height: 1;
      text-transform: uppercase;
      overflow-wrap: anywhere;
    }
    .preis {
      font-weight: 700;
      font-size: 1.15rem;
    }
    .pfand {
      font-size: 0.8rem;
      opacity: 0.8;
      margin-top: -0.2rem;
    }
    .leer {
      grid-column: 1 / -1;
      padding: 2rem;
      text-align: center;
    }

    /* ---------- Bon (rechts) ---------- */
    .bon {
      position: relative;
      display: flex;
      flex-direction: column;
      min-height: 0;
      background: var(--white);
      border-left: 1px solid var(--line);
    }
    .liste {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: 6px 14px;
    }
    .hinweis {
      color: var(--muted);
      text-align: center;
      margin-top: 2.5rem;
    }
    .zeile {
      display: grid;
      grid-template-columns: auto 2ch auto 1fr auto;
      align-items: center;
      gap: 8px;
      padding: 8px 0;
      border-bottom: 1px solid var(--line);
    }
    .pfand-zeile {
      grid-template-columns: calc(2 * 40px + 2ch + 16px) 1fr auto;
      color: var(--muted);
    }
    .rund {
      width: 40px;
      height: 40px;
      border-radius: 999px;
      border: 2px solid var(--line);
      background: var(--paper);
      font-size: 1.3rem;
      font-weight: 700;
      line-height: 1;
    }
    .rund:active {
      background: var(--red);
      border-color: var(--red);
      color: var(--white);
    }
    .menge {
      text-align: center;
      font-weight: 700;
      font-size: 1.1rem;
    }
    .menge--pfand {
      text-align: right;
      padding-right: 4px;
    }
    .text {
      display: flex;
      flex-direction: column;
      min-width: 0;
      line-height: 1.2;
    }
    .bez {
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .text small {
      color: var(--muted);
      font-size: 0.78rem;
    }
    .betrag {
      font-weight: 700;
      font-size: 1.1rem;
    }
    .negativ {
      color: var(--ok);
    }

    .summe {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      padding: 10px 16px;
      background: var(--ink);
      color: var(--white);
    }
    .summe-betrag {
      font-family: var(--display);
      font-weight: 800;
      font-size: 2.8rem;
      line-height: 1;
    }
    .summe.auszahlen {
      background: var(--ok);
    }
    .summe.auszahlen .eyebrow {
      color: var(--white);
    }

    .geld {
      padding: 10px 14px 0;
    }
    .geld-knoepfe {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 6px;
    }
    .geld-knopf {
      min-height: 44px;
      border-radius: 12px;
      border: 2px solid var(--line);
      background: var(--paper);
      font-weight: 700;
      font-size: 0.95rem;
      padding: 0 4px;
    }
    .geld-knopf:active {
      background: var(--ink-2);
      color: var(--white);
    }
    .geld-knopf--passend {
      grid-column: span 2;
    }
    .geld-knopf--c {
      color: var(--red);
    }
    .geld-info {
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 0.25rem 1rem;
      padding: 8px 2px 0;
      font-size: 1.05rem;
    }
    .retour b {
      color: var(--ok);
      font-size: 1.35rem;
    }
    .fehlt {
      color: var(--red);
    }
    .fehlt b {
      font-size: 1.35rem;
    }

    .naechster {
      margin: 12px 14px 14px;
      min-height: 64px;
      font-size: 1.25rem;
      text-transform: uppercase;
      font-family: var(--display);
      font-weight: 800;
      letter-spacing: 0.06em;
    }

    .toast {
      position: absolute;
      left: 14px;
      right: 14px;
      top: 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 8px 8px 8px 16px;
      border-radius: 999px;
      background: var(--ink-2);
      color: var(--white);
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.3);
      animation: rein 0.2s ease-out;
    }
    @keyframes rein {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
    }

    @media (max-width: 760px) {
      :host {
        grid-template-columns: 1fr;
        grid-template-rows: 1fr auto;
      }
      .artikel {
        grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
        grid-auto-rows: minmax(96px, auto);
      }
      .bon {
        max-height: 60dvh;
        border-left: 0;
        border-top: 1px solid var(--line);
      }
    }
  `,
})
export default class KassaPage {
  protected readonly artikelStore = inject(ArtikelStore);
  protected readonly gast = inject(GastStore);
  protected readonly euro = euro;
  protected readonly muenzenScheine = MUENZEN_SCHEINE;
  protected readonly betragAbs = computed(() => Math.abs(this.gast.summe()));

  protected farbe(a: Artikel) {
    return FARBEN.find((f) => f.id === a.farbe) ?? FARBEN[0];
  }

  protected geldLabel(cent: number): string {
    return cent < 100 ? `${(cent / 100).toFixed(2).replace('.', ',')}` : `${cent / 100}`;
  }
}
