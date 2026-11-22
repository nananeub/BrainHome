# BrainHome v3.9 · Kalender & Haushalt

## Installation

1. **Vorher in der aktuell funktionierenden BrainHome-Version ein JSON-Backup exportieren** und sicher aufbewahren. Idealerweise auch ein Firebase-Cloud-Backup überprüfen.
2. In GitHub im Branch der GitHub-Pages-Website **nur `index.html`, `app.js` und `sw.js` ersetzen**.
3. `cloud.js`, deine ausgefüllte `firebase-config.js`, `firestore.rules`, `study.js`, `manifest.webmanifest` und die Icons **behalten und nicht überschreiben**.
4. Website vollständig neu laden. Auf dem zweiten Gerät dasselbe Update installieren, bevor dort neue Daten bearbeitet werden.
5. Kontrolliere zuerst, ob alle bisherigen Lebensbereiche/Rezepte/Trainings/Routinen vorhanden sind und die Cloud wieder „Gesichert“ meldet.

Die ZIP enthält nur die drei geänderten Dateien und diese Anleitung. Lösche keine Browserdaten und keinen Firebase-Datenbestand.

## Kalender

- Google-Verbindung inklusive Client-ID, Neu-Verbinden, Trennen, Aktualisieren **und ICS-Export** befinden sich in **„⚙ Kalender-Verbindung“**, standardmäßig eingeklappt.
- Öffne den Kalender, dann bei Bedarf **„📋 Anstehende Termine“**. Die Liste umfasst die Termine und Aufgaben des jeweils dargestellten Monats **aus BrainHome und Google gemeinsam**, chronologisch sortiert, ohne getrennte Herkunftslisten.
- Bereits vergangene Einträge erscheinen nicht mehr in der Liste. Bei heutigen Terminen werden verstrichene konkrete Uhrzeiten ausgefiltert, während undatierte Aufgaben, die heute fällig sind, bis Tagesende sichtbar bleiben.
- Öffentliche Feiertagskalender von Google werden anhand ihrer Kalender-ID/Bezeichnung ausgefiltert. **Persönlich eingetragene Feiertagstermine in einem sonst normalen Kalender** bleiben sichtbar.
- Häkchen an einem Kalendereintrag heißt **„Vorbereitung erledigt“**. Der Eintrag wird grau. Dies ist **kein Abschluss der eigentlichen Aufgabe** – sie kann weiterhin im Aufgabenbaum abgehakt werden. Die Häkchen werden im normalen BrainHome-JSON und im Firebase-Datenstand gespeichert (`calendarPreparations`).
- Die Google-Verbindung ist wie zuvor **lesend** und wird nach Ende der Sitzung bei Bedarf erneut angemeldet. Es werden keine Google-Termine verändert.

## Haushalt

- Neuer weißer Plan mit den Spalten **Aufräumen** und **Putzen**. Die bestehenden sechs Räume bleiben erhalten; zusätzliche Räume mit dem kleinen **＋** hinzufügen.
- In jeder Zelle mit **＋** eine neue Aufräum- bzw. Putzaufgabe eintragen; vorhandene Einträge lassen sich durch Tippen auf ihren Namen bearbeiten, einschließlich Spaltenwahl und individuell einstellbarem Intervall.
- Auf den Raumnamen tippen, um ihn umzubenennen oder mit Eingabe `LÖSCHEN` (und anschließender Bestätigung) zu entfernen. Keine ständig sichtbaren Bearbeiten-/Löschen-Icons mehr.
- Häkchen zeigen die aktuelle Erledigung. Nach Ablauf des eingestellten Intervalls wird der Haken beim nächsten Anzeigen **automatisch wieder leer**; alte Erledigungen bleiben in der separaten Statistik **„Zuletzt erledigt“** erhalten. Bei Intervall 0 bleibt der Haken gesetzt, bis du ihn selbst zurücksetzt.
- Putzarbeiten zählen **standardmäßig nicht** zur offenen Aufgabenanzahl. Nur bei ausdrücklich gesetztem Häkchen **„Als offene Aufgabe zählen, wenn fällig“** im Bearbeitungsdialog erscheinen sie im Lebensbereichszähler, wenn sie fällig sind.
- Die bisherigen Putzdaten (`cleanRooms`, `cleanHistory`) werden beibehalten. Bei alten Putzaufgaben ohne gespeicherte Spalte ist die voreingestellte Spalte **Putzen**; sie lässt sich im Editor ändern.

## Offene-Aufgaben-Zähler repariert

Eine noch offene, ausdrücklich abhakbare Aufgabe zählt unabhängig von ihrer Priorität. Auch Einträge mit **„Keine Priorität“** werden wieder mitgezählt. Kategorien, unankreuzbare Listen und abgeschlossene Aufgaben zählen nicht. Für den Bereich Lebenshaltung werden opt-in-Rituale und ausdrücklich opt-in-Putzaufgaben sowie gegebenenfalls vorhandene normale abhakbare Aufgaben berücksichtigt.

## Tests und Grenzen

Die JavaScript-Syntax und in-memory-Chromium-Tests wurden durchgeführt: Kalenderanzeige, Präparationshäkchen und deren Exportdaten, Aufgabenanzahl bei fehlender Priorität, Putzen mit Einzelintervall, optionale Aufgabenanzahl bei Putzpunkten, kompakte Google-Einstellungen, gemeinsamer Terminplan und Feiertagskalenderfilter. Die Google-API-Antworten wurden **simuliert**, ein persönlicher Google-Login/Live-Firebase-Abgleich und Android-PWA-Test waren hier nicht möglich.
