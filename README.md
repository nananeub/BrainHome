# BrainHome v2.4 – Alltagsverbesserungen

- Routinen auf der Startseite vollständig einklappbar, standardmäßig geschlossen; kein erster Eintrag außerhalb der Klappe.
- Sofort und Geschenke weiterhin einklappbar.
- Wissensbaum-Navigation erneut gebunden, zuletzt geöffnete Seite beim Aktualisieren merken.
- Notizen im Lebensbereich über den Button „📝 Notizen“ (bestehendes Notizfeld des Wurzelknotens).
- 30-Tage-Statistik Eingang/Ausgang ab diesem Update. Neue Aufgaben und Abschlüsse werden als Ereignisse in `activityLog` gespeichert und in JSON/Cloud gesichert. Ältere Ereignisse sind nicht rekonstruierbar.
- Einmalige, vorsichtige Verschiebung vorhandener echter Kategorien Geschenke, Aktivitäten, Lagerfeuerlieder, Bastelideen unter Beziehung/Beziehungen, soweit sie als verschiebbare Knoten vorliegen. Erziehung wird als Kategorie ergänzt. Eigenständige private Panels bleiben unverändert, um Datenverluste zu vermeiden.
- Cloud-Modul unverändert. `firebase-config.js` und `firestore.rules` aus dem funktionierenden Repository beibehalten.

## Installation
Vorher JSON-Backup exportieren. Die enthaltenen Dateien in GitHub aktualisieren, bestehende Firebase-Konfiguration und Regeln **nicht** überschreiben oder löschen. Cache-Version ist v24.

## Test
JavaScript-Syntax mit Node geprüft, ZIP geprüft. Keine vollständigen Live-Browser-/Firebase-Tests durchgeführt. Erst auf einem Gerät testen und Cloud-Sicherungsstatus kontrollieren.
