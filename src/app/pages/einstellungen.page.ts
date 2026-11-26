import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { artikelAusImport, neueId } from '../kassa/artikel-daten';
import { ArtikelStore } from '../kassa/artikel-store';
import { Artikel, FARBEN, FarbId, Kategorie, SONSTIGES, centAlsEingabe, euro, farbe, kategorieVon, parseEuro } from '../kassa/model';

interface Entwurf {
  id: string | null;
  bezeichnung: string;
  preis: string;
  pfand: string;
  farbe: FarbId;
  kategorieId: string | null;
}

interface KategorieEntwurf {
  id: string | null;
  /** true = es wird nur die Farbe von Sonstiges bearbeitet. */
  sonstiges: boolean;
  bezeichnung: string;
  farbe: FarbId;
}

const LEERE_KATEGORIE: KategorieEntwurf = { id: null, sonstiges: false, bezeichnung: '', farbe: 'rot' };

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
          <p class="version">Version {{ version }}</p>
        </div>
      </div>
    } @else {
      <div class="inhalt">
        <div class="titel">
          <div>
            <p class="eyebrow">Einstellungen · {{ store.aktiverName() }}</p>
            <h2>Artikel</h2>
          </div>
          <a class="btn btn--dark" routerLink="/">Fertig – zur Kassa</a>
        </div>

        @if (store.istStandardPin()) {
          <p class="warnung">Die PIN ist noch <b>0000</b>. Bitte unten eine eigene PIN festlegen.</p>
        }

        <!-- Profile -->
        <section class="card block">
          <h3>Profil</h3>
          <p>
            Das aktive Profil erscheint an der Kassa. Der <b>Standard</b> wird zentral gepflegt, kommt mit jedem Update
            und kann hier nicht geändert werden. Ein neues Profil startet als Kopie des Standards.
          </p>
          <ul class="liste profile-liste">
            <li [class.aktiv]="store.standardAktiv()">
              <span class="info">
                <b>Standard</b>
                <small>zentral gepflegt · nur lesbar · {{ store.standard.artikel.length }} Artikel</small>
              </span>
              @if (store.standardAktiv()) {
                <span class="marke">Aktiv</span>
              } @else {
                <button class="btn btn--sm btn--ghost" (click)="profilAktivieren(null)">Aktivieren</button>
              }
            </li>
            @for (p of store.profile(); track p.id) {
              <li [class.aktiv]="store.aktivesProfil()?.id === p.id">
                <span class="info">
                  <b>{{ p.name }}</b>
                  <small>{{ p.artikel.length }} Artikel</small>
                </span>
                @if (store.aktivesProfil()?.id === p.id) {
                  <span class="marke">Aktiv</span>
                } @else {
                  <button class="btn btn--sm btn--ghost" (click)="profilAktivieren(p.id)">Aktivieren</button>
                }
                <button class="btn btn--sm btn--ghost" (click)="profilUmbenennen(p.id, p.name)">Umbenennen</button>
                <button class="btn btn--sm btn--ghost" (click)="profilAusStandardLaden(p.id, p.name)">Aus Standard laden</button>
                <button class="btn btn--sm btn--ghost loeschen" (click)="profilLoeschen(p.id, p.name)">Löschen</button>
              </li>
            }
          </ul>
          <div class="aktionen">
            <button class="btn btn--dark" (click)="neuesProfil()">Neues Profil</button>
          </div>
        </section>

        @if (store.standardAktiv()) {
          <p class="hinweis-standard">
            Der <b>Standard</b> ist aktiv. Wer unten etwas ändert, legt damit ein neues Profil an.
          </p>
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
          @if (store.kategorienEinstellung().aktiv) {
            <label class="field kategorie-feld">
              Kategorie
              <select name="kategorie" [ngModel]="entwurf().kategorieId" (ngModelChange)="kategorieWaehlen($event)">
                @for (k of store.kategorien(); track k.id) {
                  <option [ngValue]="k.id">{{ k.bezeichnung }}</option>
                }
                <option [ngValue]="null">Ohne Kategorie ({{ sonstiges }})</option>
              </select>
            </label>
          }
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
          @for (g of store.gruppen(); track g.kategorieId) {
            @if (g.titel) {
              <li class="gruppen-kopf">
                <span class="farbpunkt farbpunkt--klein" [style.background]="farbeVon(g.farbe)"></span>
                {{ g.titel }}
              </li>
            }
            @for (a of g.artikel; track a.id; let erster = $first; let letzter = $last) {
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
                <button class="icon" [disabled]="erster" (click)="verschieben(a.id, -1)" aria-label="Nach oben">↑</button>
                <button class="icon" [disabled]="letzter" (click)="verschieben(a.id, 1)" aria-label="Nach unten">↓</button>
                <button class="btn btn--sm btn--ghost" (click)="bearbeiten(a)">Bearbeiten</button>
                <button class="btn btn--sm btn--ghost loeschen" (click)="loeschen(a)">Löschen</button>
              </li>
            }
          } @empty {
            <li class="leer">Noch keine Artikel.</li>
          }
        </ul>

        <!-- Kategorien -->
        <section class="card block kategorien">
          <h3>Kategorien</h3>
          <label class="schalter">
            <input
              type="checkbox"
              [checked]="store.kategorienEinstellung().aktiv"
              (change)="kategorienSchalten($any($event.target))"
            />
            Kategorien verwenden
            <small>Artikel Kategorien zuordnen und an der Kassa danach gruppieren.</small>
          </label>
          @if (store.kategorienEinstellung().aktiv) {
            <label class="schalter">
              <input
                type="checkbox"
                [checked]="store.kategorienEinstellung().titelAnzeigen"
                (change)="titelSchalten($any($event.target))"
              />
              Kategorietitel anzeigen
              <small>Aus: Die Artikel bleiben gruppiert, nur ohne Überschrift.</small>
            </label>

            <ul class="liste kategorien-liste">
              @for (k of store.kategorien(); track k.id; let erster = $first; let letzter = $last) {
                <li [class.in-bearbeitung]="kategorieEntwurf().id === k.id">
                  <span class="farbpunkt" [style.background]="farbeVon(k.farbe)"></span>
                  <span class="info">
                    <b>{{ k.bezeichnung }}</b>
                    <small>{{ store.anzahlArtikelIn(k.id) }} Artikel</small>
                  </span>
                  <button class="icon" [disabled]="erster" (click)="kategorieVerschieben(k.id, -1)" aria-label="Nach oben">↑</button>
                  <button class="icon" [disabled]="letzter" (click)="kategorieVerschieben(k.id, 1)" aria-label="Nach unten">↓</button>
                  <button class="btn btn--sm btn--ghost" (click)="kategorieBearbeiten(k)">Bearbeiten</button>
                  <button class="btn btn--sm btn--ghost loeschen" (click)="kategorieLoeschen(k)">Löschen</button>
                </li>
              }
              <li [class.in-bearbeitung]="kategorieEntwurf().sonstiges">
                <span class="farbpunkt" [style.background]="farbeVon(store.kategorienEinstellung().sonstigesFarbe)"></span>
                <span class="info">
                  <b>{{ sonstiges }}</b>
                  <small>Artikel ohne Kategorie · immer am Ende</small>
                </span>
                <button class="btn btn--sm btn--ghost" (click)="sonstigesBearbeiten()">Farbe ändern</button>
              </li>
            </ul>

            <form class="kategorie-editor" (ngSubmit)="kategorieSpeichern()">
              <h4>
                {{ kategorieEntwurf().sonstiges ? 'Farbe für ' + sonstiges : kategorieEntwurf().id ? 'Kategorie bearbeiten' : 'Neue Kategorie' }}
              </h4>
              @if (!kategorieEntwurf().sonstiges) {
                <label class="field">
                  Bezeichnung
                  <input
                    name="kat-bez"
                    [(ngModel)]="kategorieEntwurf().bezeichnung"
                    maxlength="30"
                    placeholder="z. B. Getränke"
                  />
                </label>
              }
              <div class="field">
                Farbe
                <div class="farben">
                  @for (f of farben; track f.id) {
                    <button
                      type="button"
                      class="farbfeld"
                      [style.background]="f.bg"
                      [class.gewaehlt]="kategorieEntwurf().farbe === f.id"
                      [attr.aria-label]="f.name"
                      [title]="f.name"
                      (click)="kategorieEntwurf.set({ ...kategorieEntwurf(), farbe: f.id })"
                    ></button>
                  }
                </div>
              </div>
              @if (kategorieFehler()) {
                <p class="fehler">{{ kategorieFehler() }}</p>
              }
              <div class="aktionen">
                <button type="submit" class="btn btn--dark">
                  {{ kategorieEntwurf().id || kategorieEntwurf().sonstiges ? 'Änderungen speichern' : 'Kategorie hinzufügen' }}
                </button>
                @if (kategorieEntwurf().id || kategorieEntwurf().sonstiges) {
                  <button type="button" class="btn btn--ghost" (click)="neueKategorie()">Abbrechen</button>
                }
              </div>
            </form>
          }
        </section>

        <div class="unten">
          <section class="card block">
            <h3>Artikel übertragen</h3>
            <p>
              Artikelliste als Datei sichern oder auf einer anderen Kassa einlesen. Das Einlesen ersetzt das aktive Profil.
              Ist der Standard aktiv, entsteht ein neues Profil.
            </p>
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

        <p class="version">Version {{ version }}</p>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
      overflow-y: auto;
    }

    .version {
      margin: 0.75rem 0 0;
      text-align: center;
      color: var(--muted);
      font-size: 0.85rem;
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
    .hinweis-standard {
      margin: 0;
      padding: 0.75rem 1rem;
      border-radius: 12px;
      background: var(--paper);
      border: 1px solid var(--line);
    }
    .profile-liste {
      border: 1px solid var(--line);
      border-radius: 12px;
      margin: 0 0 1rem;
    }
    .profile-liste li.aktiv {
      background: #fff6f6;
    }
    .marke {
      padding: 0.3rem 0.8rem;
      border-radius: 999px;
      background: var(--red);
      color: var(--white);
      font-weight: 700;
      font-size: 0.85rem;
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

    .liste .gruppen-kopf {
      gap: 0.5rem;
      padding: 0.45rem 1rem;
      background: var(--paper);
      font-family: var(--display);
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .farbpunkt--klein {
      width: 14px;
      height: 14px;
    }
    .kategorie-feld {
      max-width: 360px;
      margin-bottom: 0.75rem;
    }
    .kategorie-feld select {
      min-height: 48px;
      border-radius: 12px;
      border: 2px solid var(--line);
      background: var(--white);
      padding: 0 0.75rem;
      font: inherit;
    }
    .schalter {
      display: grid;
      grid-template-columns: auto 1fr;
      align-items: center;
      column-gap: 0.75rem;
      margin-bottom: 0.75rem;
      font-weight: 600;
    }
    .schalter input {
      grid-row: span 2;
      width: 26px;
      height: 26px;
      accent-color: var(--red);
    }
    .schalter small {
      color: var(--muted);
      font-weight: 400;
    }
    .kategorien-liste {
      border: 1px solid var(--line);
      border-radius: 12px;
      margin: 0.5rem 0 1rem;
    }
    .kategorie-editor {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .kategorie-editor .field:first-of-type {
      max-width: 360px;
    }
    h4 {
      margin: 0;
      font-size: 1.15rem;
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
  protected readonly sonstiges = SONSTIGES;
  protected readonly version = __VERSION__;

  protected readonly entsperrt = signal(false);
  protected readonly pinEingabe = signal('');
  protected readonly pinFalsch = signal(false);

  protected readonly entwurf = signal<Entwurf>(this.leererEntwurf());
  protected readonly fehler = signal('');

  protected readonly kategorieEntwurf = signal<KategorieEntwurf>({ ...LEERE_KATEGORIE });
  protected readonly kategorieFehler = signal('');

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
    return farbe(id).bg;
  }

  /** Bei aktiven Kategorien schlägt ein neuer Artikel ohne Kategorie die Farbe von Sonstiges vor. */
  private leererEntwurf(): Entwurf {
    const e = this.store.kategorienEinstellung();
    return { id: null, bezeichnung: '', preis: '', pfand: '', farbe: e.aktiv ? e.sonstigesFarbe : 'rot', kategorieId: null };
  }

  protected neuerEntwurf(): void {
    this.entwurf.set(this.leererEntwurf());
    this.fehler.set('');
  }

  /** Nur ein neuer Artikel übernimmt die Kategoriefarbe; bei bestehenden bleibt die gewählte Farbe. */
  protected kategorieWaehlen(kategorieId: string | null): void {
    const e = this.entwurf();
    if (e.id) {
      this.entwurf.set({ ...e, kategorieId });
      return;
    }
    const k = this.store.kategorien().find((k) => k.id === kategorieId);
    this.entwurf.set({ ...e, kategorieId, farbe: k?.farbe ?? this.store.kategorienEinstellung().sonstigesFarbe });
  }

  // ---------- Profile ----------

  /** Nach einem Profilwechsel passen offene Entwürfe nicht mehr zum Inhalt. */
  private nachWechsel(): void {
    this.neuerEntwurf();
    this.neueKategorie();
    this.importMeldung.set('');
  }

  private profilNameFragen(vorschlag: string): string | null {
    const name = prompt('Name des Profils (z. B. Sommerfest)', vorschlag)?.trim();
    return name ? name.slice(0, 40) : null;
  }

  protected neuesProfil(): void {
    const name = this.profilNameFragen('Neues Profil');
    if (!name) return;
    this.store.profilAnlegen(name);
    this.nachWechsel();
  }

  protected profilAktivieren(id: string | null): void {
    this.store.profilAktivieren(id);
    this.nachWechsel();
  }

  protected profilUmbenennen(id: string, alt: string): void {
    const name = this.profilNameFragen(alt);
    if (name) this.store.profilUmbenennen(id, name);
  }

  protected profilAusStandardLaden(id: string, name: string): void {
    if (!confirm(`Artikel und Kategorien von „${name}“ durch den aktuellen Standard ersetzen?`)) return;
    this.store.profilAusStandardLaden(id);
    if (this.store.aktivesProfil()?.id === id) this.nachWechsel();
  }

  protected profilLoeschen(id: string, name: string): void {
    const aktiv = this.store.aktivesProfil()?.id === id;
    if (!confirm(`Profil „${name}“ löschen?${aktiv ? ' Danach ist der Standard aktiv.' : ''}`)) return;
    this.store.profilLoeschen(id);
    if (aktiv) this.nachWechsel();
  }

  /** Der Standard ist am Gerät nur lesbar: Vor der ersten Änderung wird ein Profil angelegt.
   *  Die Ids im neuen Profil sind dieselben wie im Standard, offene Entwürfe passen also weiter. */
  private bearbeitbar(): boolean {
    if (!this.store.standardAktiv()) return true;
    if (!confirm('Der Standard kann hier nicht geändert werden. Neues Profil aus dem Standard anlegen?')) return false;
    const name = this.profilNameFragen('Neues Profil');
    if (!name) return false;
    this.store.profilAnlegen(name);
    return true;
  }

  // ---------- Kategorien ----------

  protected kategorienSchalten(schalter: HTMLInputElement): void {
    if (!this.bearbeitbar()) {
      schalter.checked = !schalter.checked;
      return;
    }
    this.store.kategorienEinstellen({ aktiv: schalter.checked });
    if (!this.entwurf().id) this.neuerEntwurf();
    this.neueKategorie();
  }

  protected titelSchalten(schalter: HTMLInputElement): void {
    if (!this.bearbeitbar()) {
      schalter.checked = !schalter.checked;
      return;
    }
    this.store.kategorienEinstellen({ titelAnzeigen: schalter.checked });
  }

  protected kategorieVerschieben(id: string, richtung: -1 | 1): void {
    if (this.bearbeitbar()) this.store.kategorieVerschieben(id, richtung);
  }

  protected verschieben(id: string, richtung: -1 | 1): void {
    if (this.bearbeitbar()) this.store.verschieben(id, richtung);
  }

  protected neueKategorie(): void {
    this.kategorieEntwurf.set({ ...LEERE_KATEGORIE });
    this.kategorieFehler.set('');
  }

  protected kategorieBearbeiten(k: Kategorie): void {
    this.kategorieEntwurf.set({ id: k.id, sonstiges: false, bezeichnung: k.bezeichnung, farbe: k.farbe });
    this.kategorieFehler.set('');
  }

  protected sonstigesBearbeiten(): void {
    const farbe = this.store.kategorienEinstellung().sonstigesFarbe;
    this.kategorieEntwurf.set({ id: null, sonstiges: true, bezeichnung: SONSTIGES, farbe });
    this.kategorieFehler.set('');
  }

  protected kategorieSpeichern(): void {
    const e = this.kategorieEntwurf();
    if (!e.sonstiges && !e.bezeichnung.trim()) return this.kategorieFehler.set('Bitte eine Bezeichnung eingeben.');
    if (!this.bearbeitbar()) return;
    if (e.sonstiges) {
      this.store.kategorienEinstellen({ sonstigesFarbe: e.farbe });
    } else {
      const bezeichnung = e.bezeichnung.trim();
      if (!bezeichnung) return this.kategorieFehler.set('Bitte eine Bezeichnung eingeben.');
      this.store.kategorieSpeichern({ id: e.id ?? neueId(), bezeichnung, farbe: e.farbe });
    }
    this.neueKategorie();
  }

  protected kategorieLoeschen(k: Kategorie): void {
    const anzahl = this.store.anzahlArtikelIn(k.id);
    const folge = anzahl === 0 ? '' : anzahl === 1 ? ' 1 Artikel verliert seine Kategorie.' : ` ${anzahl} Artikel verlieren ihre Kategorie.`;
    if (!confirm(`Kategorie „${k.bezeichnung}“ löschen?${folge}`)) return;
    if (!this.bearbeitbar()) return;
    this.store.kategorieLoeschen(k.id);
    if (this.kategorieEntwurf().id === k.id) this.neueKategorie();
    if (this.entwurf().kategorieId === k.id) this.entwurf.set({ ...this.entwurf(), kategorieId: null });
  }

  protected bearbeiten(a: Artikel): void {
    this.entwurf.set({
      id: a.id,
      bezeichnung: a.bezeichnung,
      preis: centAlsEingabe(a.preis),
      pfand: a.pfand ? centAlsEingabe(a.pfand) : '',
      farbe: a.farbe,
      kategorieId: kategorieVon(a, this.store.kategorien()),
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
    if (!this.bearbeitbar()) return;

    // Bei ausgeschalteten Kategorien bleibt die gespeicherte Zuordnung unverändert erhalten.
    const kategorieId = this.store.kategorienEinstellung().aktiv
      ? e.kategorieId
      : (this.store.artikel().find((a) => a.id === e.id)?.kategorieId ?? null);
    this.store.speichern({ id: e.id ?? neueId(), bezeichnung, preis, pfand, farbe: e.farbe, kategorieId });
    this.neuerEntwurf();
  }

  protected loeschen(a: Artikel): void {
    if (!confirm(`„${a.bezeichnung}“ wirklich löschen?`)) return;
    if (!this.bearbeitbar()) return;
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
      const daten = artikelAusImport(JSON.parse(await datei.text()));
      const umfang =
        `${daten.artikel.length} Artikel` + (daten.kategorien.length ? ` und ${daten.kategorien.length} Kategorien` : '');
      if (this.store.standardAktiv()) {
        const name = datei.name.replace(/\.json$/i, '').slice(0, 40) || 'Importiert';
        if (!confirm(`${umfang} als neues Profil „${name}“ einlesen?`)) return;
        this.store.profilAnlegen(name, daten);
      } else {
        const profil = this.store.aktiverName();
        if (!confirm(`${umfang} einlesen? Der Inhalt von „${profil}“ wird ersetzt.`)) return;
        this.store.ersetzen(daten);
      }
      this.nachWechsel();
      this.importFehler.set(false);
      this.importMeldung.set(`${umfang} eingelesen.`);
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
