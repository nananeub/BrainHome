# BrainHome v2.6 – Statistik & Studienstiftung

## Installation

1. **Zuerst JSON-Backup exportieren** und überprüfen, dass die Cloud den letzten Stand gesichert hat.
2. In GitHub nur **index.html**, **app.js** und **sw.js** aus dieser ZIP ersetzen.
3. Unverändert behalten: **cloud.js**, **firebase-config.js**, **firestore.rules**, **manifest.webmanifest**, **icon-192.png** und **icon-512.png**.
4. Nach dem Commit BrainHome neu öffnen. Die Offline-Version wird durch den neuen Cache-Namen aktualisiert. Keine Browserdaten löschen.

## Statistik (Erledigt)
- Der grüne Verlauf der erledigten Aufgaben ist sofort zu sehen.
- **Hinzugefügte anzeigen** blendet bei Bedarf eine zweite Serie ein. Ihre Farbe lässt sich wählen und bleibt lokal gespeichert.
- Zeitraum **Tag / Woche / Monat**, mit deutlich eingefärbter aktiver Auswahl; vor-/zurückblättern.
- Wochenkopf als **KW mit Kalenderwoche und Jahr**, ohne Start- und Enddatum.
- Überschrift „Eingang & Ausgang“ und Hilfstext entfernt.
- Die bereits erfassten Ereignisse in `taskEvents` bleiben unverändert. Alte und neue Routinen/Geschenk-/Zubereitungsabschlüsse werden über `completionLog` mitberücksichtigt.

## Studienstiftung
- Unter dem Lebensbereich **Studienstiftung** werden einmalig die Unterkategorien **Projekte** und **Termine** hinzugefügt, falls sie noch nicht existieren.
- **＋ Projekt** öffnet den normalen Editor mit Typ „Kategorie“, unter dem Projektordner; darin lassen sich wiederum Unteraufgaben anlegen.
- **＋ Termin** öffnet ein Formular mit Titel, Datum, optionaler Uhrzeit, Zuordnung und Notizen. Termine stehen im Studienstiftung-Bereich und können dort über die Terminübersicht bearbeitet werden.
- Die Termine sind *keine abhakbaren Aufgaben* und verzerren darum nicht die Erledigt-Statistik. Eine vollständige Kalenderansicht folgt erst in einer späteren Ausbaustufe.
- Alle neuen Daten liegen in den vorhandenen `nodes`-Datensätzen und sind in den bestehenden JSON- und Cloud-Backups enthalten.

## Testumfang
- JavaScript-Syntaxprüfung und lokale Browser-Tests der neuen Bedienung sowie Reload und Erhaltung vorhandener Daten.
- Keine echte Firebase-Verbindung mit deinem Konto; Cloud-Dateien wurden nicht geändert.
