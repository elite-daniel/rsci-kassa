# PWA auf GitHub Pages, Artikel nur im Browser des Tablets

Die Kassa ist eine statische, offline-fähige PWA, ausgeliefert über GitHub Pages (`https://elite-daniel.github.io/rsci-kassa/`). Artikel und PIN liegen ausschließlich im `localStorage` des jeweiligen Tablets; übertragen wird per JSON-Export/-Import. Es gibt keinen Server und keine Synchronisation.

Abgewogen wurden: Server mit gemeinsamer Artikelliste (braucht Netz am Stand), Auslieferung vom Laptop über USB/`adb reverse` (umständlich, Laptop als Abhängigkeit) und eine native Android-App (Aufwand, Updates per Neuinstallation). Am Stand gibt es nicht zuverlässig Internet, und es gibt nur wenige Artikel. Deshalb reicht eine Kassa pro Gerät mit Datei-Export.

## Konsequenzen

- `localStorage` ist an die Herkunft (Origin) gebunden. Ein Umzug auf eine andere Adresse, z. B. `kassa.rsci.elite.tirol`, bedeutet am Tablet eine neue App: Artikel vorher exportieren und danach wieder importieren.
- Updates werden nie mitten im Betrieb eingespielt. Die Kassa zeigt „Neue Version verfügbar“, und erst ein Tipp darauf lädt sie.
