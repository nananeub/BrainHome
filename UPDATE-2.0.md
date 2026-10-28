# BrainHome 2.0 – Navigations- und Cloud-Schutzupdate

- Wissensbaum bleibt nach Neuladen auf der geöffneten Seite (Route in v13 ergänzt).
- Vollbild-Wissensbaum: Zoom +/− und Zurücksetzen.
- Uni-Wiederholung rotiert täglich unter fälligen Themen.
- Bestehende Wissensdaten, Aufgaben und Cloud-Dokumentstruktur unverändert.
- **firebase-config.js ist absichtlich NICHT im ZIP.** Die bereits auf GitHub vorhandene, ausgefüllte Datei muss erhalten bleiben.
- Service Worker cached die Firebase-Konfigurationsdatei nicht mehr.

## Installation

1. JSON-Backup erstellen.
2. Alle Dateien dieses ZIP ins Repository hochladen; die vorhandene `firebase-config.js` NICHT löschen.
3. In GitHub kontrollieren, dass `firebase-config.js` noch ausgefüllte Werte besitzt.
4. GitHub Pages neu laden, ggf. PWA schließen und erneut öffnen.
5. Cloudstatus prüfen. Falls weiterhin 'Cloud einrichten': `firebase-config.js` über die GitHub-Ansicht prüfen; ohne echte Werte kann die Cloud nicht starten.

Hinweis: Statische Syntax geprüft, kein authentifizierter Firebase-Livetest.
