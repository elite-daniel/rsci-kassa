# Standard nur im Repo, Profile nur am Gerät

Es gibt genau einen Standard (Artikel und Kategorien). Er liegt als Datei im Repo, wird in den Build eingebaut und kommt mit jedem Deploy auf alle Kassen. Am Gerät kann man ihn nur lesen. Wer etwas anderes braucht, legt ein Profil an: eine Kopie des Standards im `localStorage`, die danach unabhängig ist. Geändert wird der Standard nur zentral, also Datei ändern, auf `main` pushen und deployen.

## Considered Options

- **Standard am Tablet bearbeiten und von dort hochladen**: Dafür bräuchte jedes Gerät ein GitHub-Token oder einen Server. Das passt nicht zu ADR 0001 (kein Server, offline am Stand).
- **Standard zur Laufzeit nachladen statt einbauen**: Er könnte sich dann mitten im Betrieb ändern und wäre offline nicht sicher verfügbar. Eingebaut ändert er sich nur, wenn jemand „Neue Version verfügbar“ antippt.
- **Mehrere Vorlagen, denen Profile automatisch folgen**: Das wurde verworfen, weil es zu viele Zustände sind (folgt / folgt nicht / Vorlage gelöscht). Ein Standard und unabhängige Kopien reichen. Mit „Aus Standard laden“ bringt man ein Profil bei Bedarf wieder auf den aktuellen Stand.

## Consequences

- Ohne Profil ist der Standard aktiv. Eine neue Kassa braucht also keine Einrichtung.
- Eine Änderung am Standard erreicht Profile nicht. Sie bleiben bewusst unverändert, bis jemand „Aus Standard laden“ wählt.
- Die PIN gehört nicht in den Standard, weil GitHub Pages öffentlich ist.
