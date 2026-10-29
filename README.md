# BrainHome v2.5 — reparierte Navigation & Aufgabenstatistik

## Installation (nur drei App-Dateien ersetzen)

1. In BrainHome ein **JSON-Backup exportieren**. Vorher zusätzlich prüfen, dass die Cloud "Gesichert ✓" zeigt.
2. In deinem GitHub-Repository **index.html**, **app.js** und **sw.js** aus dieser ZIP aktualisieren (Commit changes).
3. **Unverändert behalten:** cloud.js, firebase-config.js, firestore.rules, manifest.webmanifest und deine beiden Icons. Diese Dateien sind deshalb absichtlich **nicht** im Update-Paket.
4. BrainHome neu öffnen. Auf einem bereits installierten Handy ggf. die Seite einmal schließen/neu öffnen, damit der aktualisierte Service Worker aktiv wird. Weder Browserdaten noch Firebase löschen.

## Änderungen

- **Navigation:** Startseiten-Reset und Fehler durch nicht erreichbare Navigationsfunktionen korrigiert. Der zuletzt geöffnete Tab und das geöffnete Hauptprojekt werden lokal gespeichert, auch nach Reload und Cloud-Wiederherstellung.
- **Wissensbaum:** Funktionierender Navigations- und Render-Aufruf; klicken, bearbeiten, aufklappen und vergrößern.
- **Notizen:** In jedem Hauptprojekt sichtbarer `📝 Notizen`-Button mit Editor. Gespeichert im bestehenden Feld `nodes[].notes` und daher in JSON-Backup und Cloud enthalten.
- **Listen umziehen:** Aktivitäten, Bastelideen, Erziehung sowie die bestehenden Geschenk- und Lagerfeuer-Kategorien gehören zu Beziehungen. Die *tatsächlichen* Geschenk- und Lagerfeuerlisten werden dort statt unter Privat dargestellt und können dort bearbeitet werden. Die bisherigen Geschenk-Knoten behalten ihre IDs; die Lieder bleiben in `songs[]`, damit alle alten Editierfunktionen erhalten bleiben. Es werden keine Liedeinträge in andere Datentypen konvertiert.
- **Inbox:** Abgehakte Inbox-Einträge mit Art `Aufgabe` sind echte Abschlüsse und kommen in die Statistik. Reine Inbox-Notizen werden entfernt, ohne in der Statistik aufzutauchen. Einträge mit Unterpunkten werden nicht stillschweigend gelöscht.
- **Statistik:** Beim Tab `Erledigt` über `📊 Statistik anzeigen` erreichbar, sonst verborgen. Neu angelegte Aufgaben und Abschlüsse werden als datierte Ereignisse erfasst (`taskEvents[]`), wo nötig mit bisherigen Abschlussdaten kombiniert. Wochen-, Monats- und Jahresansicht, Vor/Zurück, wählbare Farbe und Saldo.

## Datenhinweis

- Datenformat von `nodes`, `songs`, `routines`, `knowledgeNodes` und `completionLog` bleibt erhalten. Neues optionales Feld `taskEvents` wird in den JSON-Export und in den bestehenden Cloud-Payload übernommen.
- Das ursprüngliche **Erstellungsdatum alter Aufgaben lässt sich nicht rückwirkend ermitteln**. Darum ist ein historischer Eingang vor diesem Update nicht exakt rekonstruierbar. Die vorhandenen datierten Abschlüsse werden weiter verwendet.
- Die bisherige **850-KB-Grenze** des einen Firestore-Backups besteht weiterhin. Bei vielen tausend neuen Ereignissen/Notizen brauchen wir eine gesonderte Cloud-Speicherung; es wird keine Historie automatisch gelöscht.

## Tests

- Mit Playwright im Chromium-Browser (DOM-basierter Testaufbau): Wissensbaum öffnen, Neuladen des Wissensbaums, Projekt öffnen und nach Neuladen wiederfinden; Notizen öffnen/speichern; Inbox-Aufgabe erstellen und erledigen; Statistik ein-/ausklappen; Testdaten für Listenmigration und Verwerfen einer Inbox-Notiz.
- JavaScript-Syntax mit `node --check` validiert.
- **Kein Live-Test mit deinem Firebase-Konto**. Der Cloud-Code wird unverändert gelassen.
