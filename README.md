# RSCI Kassa

Kleine Kassa für Veranstaltungen des RSC Inzing: Artikel antippen, Summe inkl. Pfand ablesen, Rückgeld berechnen, „Nächster Gast“. Es werden keine Belege erstellt und keine Umsätze gespeichert.

**Live:** https://elite-daniel.github.io/rsci-kassa/

Begriffe stehen im [Glossar](GLOSSARY.md), Architekturentscheidungen in [docs/adr](docs/adr).

## Am Tablet installieren (Android, Chrome)

1. Am Tablet in Chrome die Live-Adresse öffnen (Internet nötig).
2. Menü ⋮ → **„App installieren“** bzw. **„Zum Startbildschirm hinzufügen“**.
3. Die Kassa über das neue Symbol starten. Ab jetzt läuft sie **ohne Internet**.
4. Zahnrad → PIN **0000** → gleich unten eine eigene PIN festlegen.

Ab Werk ist der **Standard** aktiv. Alle Tablets haben damit dieselben Artikel.

## Standard und Profile

- **Standard**: [src/app/kassa/standard.json](src/app/kassa/standard.json). Er gilt für alle Tablets und kann nur hier im Repo geändert werden. Nach dem Push auf `main` kommt er mit dem nächsten Update auf die Tablets.
- **Profile**: Eigene Artikellisten auf einem Tablet, z. B. für eine Veranstaltung (Einstellungen → Profil → **Neues Profil**). Ein Profil startet als Kopie des Standards und ist danach unabhängig. **Aus Standard laden** setzt es wieder auf den aktuellen Standard zurück.
- Wer bei aktivem Standard einen Artikel ändert, wird gefragt, ob ein neues Profil angelegt werden soll.

Profile, PIN und der aktuelle Gast liegen **nur auf diesem Tablet** (im Browser-Speicher der App). Siehe [ADR 0002](docs/adr/0002-standard-im-repo-profile-am-geraet.md).

## Profil auf ein anderes Tablet übertragen

Einstellungen → **Exportieren (JSON)**. Die Datei aufs andere Tablet bringen (Mail, USB, Cloud) und dort Einstellungen → **Importieren…**. Ist dort ein Profil aktiv, wird sein Inhalt ersetzt. Ist der Standard aktiv, entsteht ein neues Profil.

> ⚠️ Wird die App deinstalliert, die Browserdaten gelöscht oder die Adresse geändert (z. B. Umzug auf eine eigene Domain), sind Profile und PIN weg. Der Standard bleibt, weil er mit der App kommt.

**PIN vergessen?** App-Speicher löschen (Chrome → Website-Einstellungen → Daten löschen). Danach gilt wieder 0000 mit dem Standard, also vorher Profile exportieren.

## Updates

Jeder Push auf `main` veröffentlicht automatisch (GitHub Action). Ist das Tablet online, erscheint oben **„Neue Version verfügbar – jetzt laden“**. Die Kassa aktualisiert sich erst nach diesem Tipp, nie mitten im Betrieb.

## Entwicklung

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # Unit-Tests der Rechenlogik
npm run build      # → dist/analog/public (inkl. Service Worker)
npm run preview    # Build lokal ansehen
npm run icons      # App-Icons neu aus public/logo.png erzeugen
```

Für eine eigene Domain statt GitHub Pages mit `BASE_PATH=/ npm run build` bauen.

Aufbau: Rechenlogik in [src/app/kassa/model.ts](src/app/kassa/model.ts), Zustand in `artikel-store.ts` / `gast-store.ts`, Seiten in `src/app/pages/`.
