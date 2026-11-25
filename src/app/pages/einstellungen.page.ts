import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ArtikelStore, artikelAusImport, neueId } from '../kassa/artikel-store';
import { Artikel, FARBEN, FarbId, centAlsEingabe, euro, parseEuro } from '../kassa/model';

interface Entwurf {
  id: string | null;
  bezeichnung: string;
  preis: string;
  pfand: string;
  farbe: FarbId;
}

const LEERER_ENTWURF: Entwurf = { id: null, bezeichnung: '', preis: '', pfand: '', farbe: 'rot' };

@Component({
  selector: 'app-einstellungen',
  imports: [FormsModule, RouterLink],
  template: `
    @if (!entsperrt()) {
      <div class="pin-sperre">
        <div class="card pin-karte">
          <p class="eyebrow">Einstellungen</p>
          <h2>PIN eingeben</h2>
          <div class="pin-punkte" [class.falsch]="pinFalsch()">
            @for (i of [0, 1, 2, 3]; track i) {
              <span [class.voll]="pinEingabe().length > i"></span>
            }
          </div>
          <div class="ziffern">
            @for (z of ['1', '2', '3', '4', '5', '6', '7', '8', '9']; track z) {
              <button (click)="ziffer(z)">{{ z }}</button>
            }
            <a routerLink="/" class="ziffern-zurueck">Zurück</a>
            <button (click)="ziffer('0')">0</button>
            <button (click)="pinEingabe.set(pinEingabe().slice(0, -1))" aria-label="Löschen">⌫</button>
          </div>
        </div>
      </div>
    } @else {
      <div class="inhalt">
        <div class="titel">
          <div>
            <p class="eyebrow">Einstellungen</p>
            <h2>Artikel</h2>
          </div>
          <a class="btn btn--dark" routerLink="/">Fertig – zur Kassa</a>
        </div>

        @if (store.istStandardPin()) {
          <p class="warnung">Die PIN ist noch <b>0000</b>. Bitte unten eine eigene PIN festlegen.</p>
        }

        <!-- Artikel-Editor -->
        <form class="card editor" (ngSubmit)="entwurfSpeichern()">
          <h3>{{ entwurf().id ? 'Artikel bearbeiten' : 'Neuer Artikel' }}</h3>
          <div class="editor-felder">
            <label class="field bez-feld">
              Bezeichnung
              <input name="bez" [(ngModel)]="entwurf().bezeichnung" maxlength="30" placeholder="z. B. Bier" required />
            </label>
            <label class="field">
              Preis €
              <span class="mit-vorzeichen">
                <button type="button" class="vorzeichen" (click)="vorzeichenWechseln()" title="Plus/Minus umschalten">±</button>
                <input name="preis" [(ngModel)]="entwurf().preis" inputmode="decimal" placeholder="4,00" required />
              </span>
            </label>
            <label class="field">
              Pfand €
              <input name="pfand" [(ngModel)]="entwurf().pfand" inputmode="decimal" placeholder="kein Pfand" />
            </label>
          </div>
          <div class="field">
            Farbe
            <div class="farben">
              @for (f of farben; track f.id) {
                <button
                  type="button"
                  class="farbfeld"
                  [style.background]="f.bg"
                  [class.gewaehlt]="entwurf().farbe === f.id"
                  [attr.aria-label]="f.name"
                  [title]="f.name"
                  (click)="entwurf.set({ ...entwurf(), farbe: f.id })"
                ></button>
              }
            </div>
          </div>
          <p class="tipp">Für eine Pfandrückgabe einen Artikel mit Minuspreis anlegen, z. B. „Becher retour“ mit −2,00.</p>
          @if (fehler()) {
            <p class="fehler">{{ fehler() }}</p>
          }
          <div class="aktionen">
            <button type="submit" class="btn">{{ entwurf().id ? 'Änderungen speichern' : 'Artikel hinzufügen' }}</button>
            @if (entwurf().id) {
              <button type="button" class="btn btn--ghost" (click)="neuerEntwurf()">Abbrechen</button>
            }
          </div>
        </form>

        <!-- Artikelliste -->
        <ul class="card liste">
          @for (a of store.artikel(); track a.id; let erster = $first; let letzter = $last) {
            <li [class.in-bearbeitung]="entwurf().id === a.id">
              <span class="farbpunkt" [style.background]="farbeVon(a.farbe)"></span>
              <span class="info">
                <b>{{ a.bezeichnung }}</b>
                <small class="tabular">
                  {{ euro(a.preis) }}
                  @if (a.pfand) {
                    · Pfand {{ euro(a.pfand) }}
                  }
                </small>
              </span>
              <button class="icon" [disabled]="erster" (click)="store.verschieben(a.id, -1)" aria-label="Nach oben">↑</button>
              <button class="icon" [disabled]="letzter" (click)="store.verschieben(a.id, 1)" aria-label="Nach unten">↓</button>
              <button class="btn btn--sm btn--ghost" (click)="bearbeiten(a)">Bearbeiten</button>
              <button class="btn btn--sm btn--ghost loeschen" (click)="loeschen(a)">Löschen</button>
            </li>
          } @empty {
            <li class="leer">Noch keine Artikel.</li>
          }
        </ul>

        <div class="unten">
          <section class="card block">
            <h3>Artikel übertragen</h3>
            <p>Artikelliste als Datei sichern oder auf einer anderen Kassa einlesen. Beim Einlesen wird die aktuelle Liste ersetzt.</p>
            <div class="aktionen">
              <button class="btn btn--dark" (click)="exportieren()">Exportieren (JSON)</button>
              <label class="btn btn--ghost">
                Importieren…
                <input type="file" accept=".json,application/json" hidden (change)="importieren($event)" />
              </label>
            </div>
            @if (importMeldung()) {
              <p [class.fehler]="importFehler()" [class.ok]="!importFehler()">{{ importMeldung() }}</p>
            }
          </section>

          <section class="card block">
            <h3>PIN ändern</h3>
            <form class="aktionen" (ngSubmit)="pinAendern()">
              <label class="field">
                Neue PIN (4 Ziffern)
                <input
                  name="pin"
                  [(ngModel)]="neuePin"
                  inputmode="numeric"
                  maxlength="4"
                  pattern="[0-9]{4}"
                  autocomplete="off"
                />
              </label>
              <button type="submit" class="btn btn--dark">PIN speichern</button>
            </form>
            @if (pinMeldung()) {
              <p [class.fehler]="pinMeldungFehler()" [class.ok]="!pinMeldungFehler()">{{ pinMeldung() }}</p>
            }
          </section>
        </div>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
      overflow-y: auto;
    }

    /* ---------- PIN ---------- */
    .pin-sperre {
      display: grid;
      place-items: center;
      min-height: 100%;
      padding: 1rem;
    }
    .pin-karte {
      padding: 1.5rem 1.75rem;
      text-align: center;
      width: min(340px, 100%);
    }
    .pin-karte h2 {
      font-size: 2.2rem;
      margin: 0.2rem 0 1rem;
    }
    .pin-punkte {
      display: flex;
      justify-content: center;
      gap: 14px;
      margin-bottom: 1.2rem;
    }
    .pin-punkte span {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 2px solid var(--ink-2);
    }
    .pin-punkte span.voll {
      background: var(--ink-2);
    }
    .pin-punkte.falsch span {
      border-color: var(--red);
      background: var(--red);
      animation: wackeln 0.3s;
    }
    @keyframes wackeln {
      25% { transform: translateX(-5px); }
      75% { transform: translateX(5px); }
    }
    .ziffern {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }
    .ziffern button,
    .ziffern-zurueck {
      height: 60px;
      border-radius: 14px;
      border: 2px solid var(--line);
      background: var(--paper);
      font: 700 1.5rem var(--body);
    }
    .ziffern button:active {
      background: var(--red);
      color: var(--white);
    }
    .ziffern-zurueck {
      display: grid;
      place-items: center;
      font-size: 0.9rem;
      text-decoration: none;
      color: var(--muted);
    }

    /* ---------- Inhalt ---------- */
    .inhalt {
      max-width: 980px;
      margin: 0 auto;
      padding: 1.25rem 1rem 3rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .titel {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .titel h2 {
      font-size: 2.6rem;
    }
    h3 {
      font-size: 1.5rem;
      margin-bottom: 0.75rem;
    }
    .warnung {
      margin: 0;
      padding: 0.75rem 1rem;
      border-radius: 12px;
      background: #fff1f1;
      border: 1px solid #f3c2c4;
    }

    .editor,
    .block {
      padding: 1.1rem 1.25rem;
    }
    .editor-felder {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
    }
    .mit-vorzeichen {
      display: flex;
      gap: 6px;
    }
    .mit-vorzeichen input {
      flex: 1;
      min-width: 0;
    }
    .vorzeichen {
      width: 48px;
      border-radius: 12px;
      border: 2px solid var(--line);
      background: var(--paper);
      font-size: 1.3rem;
      font-weight: 700;
    }
    .farben {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .farbfeld {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 2px solid var(--line);
    }
    .farbfeld.gewaehlt {
      outline: 3px solid var(--red);
      outline-offset: 3px;
    }
    .tipp {
      color: var(--muted);
      font-size: 0.85rem;
      margin: 0.75rem 0;
    }
    .aktionen {
      display: flex;
      flex-wrap: wrap;
      align-items: end;
      gap: 0.6rem;
    }
    .fehler {
      color: var(--red);
      font-weight: 600;
    }
    .ok {
      color: var(--ok);
      font-weight: 600;
    }

    .liste {
      list-style: none;
      margin: 0;
      padding: 0.25rem 0;
    }
    .liste li {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.6rem 1rem;
      border-bottom: 1px solid var(--line);
    }
    .liste li:last-child {
      border-bottom: 0;
    }
    .liste li.in-bearbeitung {
      background: #fff6f6;
    }
    .liste .leer {
      color: var(--muted);
    }
    .farbpunkt {
      flex: none;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: 1px solid var(--line);
    }
    .info {
      flex: 1;
      display: flex;
      flex-direction: column;
      line-height: 1.25;
      min-width: 0;
    }
    .info small {
      color: var(--muted);
    }
    .icon {
      width: 40px;
      height: 40px;
      border-radius: 999px;
      border: 2px solid var(--line);
      background: var(--paper);
      font-weight: 700;
    }
    .icon:disabled {
      opacity: 0.3;
    }
    .loeschen {
      color: var(--red);
    }

    .unten {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .block p {
      margin: 0 0 0.75rem;
    }

    @media (max-width: 760px) {
      .editor-felder,
      .unten {
        grid-template-columns: 1fr;
      }
      .liste li {
        flex-wrap: wrap;
      }
    }
  `,
})
export default class EinstellungenPage {
  protected readonly store = inject(ArtikelStore);
  protected readonly farben = FARBEN;
  protected readonly euro = euro;

  protected readonly entsperrt = signal(false);
  protected readonly pinEingabe = signal('');
  protected readonly pinFalsch = signal(false);

  protected readonly entwurf = signal<Entwurf>({ ...LEERER_ENTWURF });
  protected readonly fehler = signal('');

  protected readonly importMeldung = signal('');
  protected readonly importFehler = signal(false);

  protected neuePin = '';
  protected readonly pinMeldung = signal('');
  protected readonly pinMeldungFehler = signal(false);

  protected ziffer(z: string): void {
    if (this.pinFalsch()) return;
    const eingabe = this.pinEingabe() + z;
    this.pinEingabe.set(eingabe);
    if (eingabe.length < 4) return;
    if (this.store.pinPruefen(eingabe)) {
      this.entsperrt.set(true);
    } else {
      this.pinFalsch.set(true);
      setTimeout(() => {
        this.pinFalsch.set(false);
        this.pinEingabe.set('');
      }, 600);
    }
  }

  protected farbeVon(id: FarbId): string {
    return FARBEN.find((f) => f.id === id)?.bg ?? FARBEN[0].bg;
  }

  protected neuerEntwurf(): void {
    this.entwurf.set({ ...LEERER_ENTWURF });
    this.fehler.set('');
  }

  protected bearbeiten(a: Artikel): void {
    this.entwurf.set({
      id: a.id,
      bezeichnung: a.bezeichnung,
      preis: centAlsEingabe(a.preis),
      pfand: a.pfand ? centAlsEingabe(a.pfand) : '',
      farbe: a.farbe,
    });
    this.fehler.set('');
    globalThis.scrollTo?.({ top: 0, behavior: 'smooth' });
    document.querySelector('app-einstellungen')?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected vorzeichenWechseln(): void {
    const e = this.entwurf();
    const p = e.preis.trim();
    const neu = p.startsWith('-') || p.startsWith('−') ? p.slice(1) : `-${p}`;
    this.entwurf.set({ ...e, preis: neu });
  }

  protected entwurfSpeichern(): void {
    const e = this.entwurf();
    const bezeichnung = e.bezeichnung.trim();
    const preis = parseEuro(e.preis);
    const pfand = e.pfand.trim() ? parseEuro(e.pfand) : 0;
    if (!bezeichnung) return this.fehler.set('Bitte eine Bezeichnung eingeben.');
    if (preis === null) return this.fehler.set('Preis ist ungültig – z. B. 4,00 oder -2,00.');
    if (pfand === null || pfand < 0) return this.fehler.set('Pfand ist ungültig – z. B. 2,00 oder leer lassen.');

    this.store.speichern({ id: e.id ?? neueId(), bezeichnung, preis, pfand, farbe: e.farbe });
    this.neuerEntwurf();
  }

  protected loeschen(a: Artikel): void {
    if (!confirm(`„${a.bezeichnung}“ wirklich löschen?`)) return;
    this.store.loeschen(a.id);
    if (this.entwurf().id === a.id) this.neuerEntwurf();
  }

  protected exportieren(): void {
    const datei = new Blob([JSON.stringify(this.store.exportieren(), null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(datei);
    link.download = `rsci-kassa-artikel-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  protected async importieren(ereignis: Event): Promise<void> {
    const input = ereignis.target as HTMLInputElement;
    const datei = input.files?.[0];
    input.value = '';
    if (!datei) return;
    try {
      const artikel = artikelAusImport(JSON.parse(await datei.text()));
      if (!confirm(`${artikel.length} Artikel einlesen? Die aktuelle Liste wird ersetzt.`)) return;
      this.store.ersetzen(artikel);
      this.neuerEntwurf();
      this.importFehler.set(false);
      this.importMeldung.set(`${artikel.length} Artikel eingelesen.`);
    } catch (e) {
      this.importFehler.set(true);
      this.importMeldung.set(e instanceof SyntaxError ? 'Die Datei ist keine gültige JSON-Datei.' : (e as Error).message);
    }
  }

  protected pinAendern(): void {
    if (!/^\d{4}$/.test(this.neuePin)) {
      this.pinMeldungFehler.set(true);
      this.pinMeldung.set('Die PIN muss genau 4 Ziffern haben.');
      return;
    }
    this.store.pinAendern(this.neuePin);
    this.neuePin = '';
    this.pinMeldungFehler.set(false);
    this.pinMeldung.set('PIN gespeichert.');
  }
}
