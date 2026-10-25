# BrainHome 1.7 – Routinen auch als Aufgaben führen

## Vorher bitte sichern

Öffne BrainHome auf dem Handy und lade unter **Backup** eine aktuelle **JSON-Sicherung** herunter. Bewahre sie außerhalb der App auf. Die Cloud-Verbindung bleibt eingerichtet, aber der JSON-Export ist vor Updates eine wichtige zusätzliche Absicherung.

## Diese sechs Dateien hochladen

Lade die folgenden Dateien aus `BrainHome-v1.7.zip` ins Stammverzeichnis deines bestehenden GitHub-Repositories hoch (nicht in einen Unterordner):

| Datei | Aktion |
| --- | --- |
| `index.html` | ersetzen |
| `brainhome-v1.js` | ersetzen |
| `brainhome-v13.js` | ersetzen |
| `brainhome-v16.js` | ersetzen |
| `brainhome-v17.js` | **neu hinzufügen** |
| `sw.js` | ersetzen |

**Alle übrigen Dateien behalten**, insbesondere `firebase-config.js`, `cloud.js`, `brainhome-v11.js`, `brainhome-v12.js`, `brainhome-v14.js`, `brainhome-v15.js`, `manifest.webmanifest` sowie die beiden Icons. Firebase muss nicht erneut eingerichtet werden.

Danach die installierte App vollständig schließen und erneut öffnen. Falls noch die alte Ansicht erscheint, einmal aktualisieren. **Keine Websitedaten löschen!**

## So funktioniert es

1. Privat → Routinen öffnen.
2. Eine vorhandene Routine bearbeiten oder eine neue hinzufügen.
3. **„Auch als Aufgabe führen“** anhaken. Anschließend kann die Priorität **Keine**, **Sofort**, **Wichtig** oder **Später** ausgewählt werden.
4. Eine **fällige** Routine erscheint in „Alle Aufgaben“, einsortiert nach Priorität oder Lebensbereich (**Privat**). Ist ihre Priorität „Sofort“, erscheint sie zusätzlich auf der Startseite unter „Sofort“.
5. Beim Abhaken – egal ob in „Alle Aufgaben“, auf der Startseite oder direkt bei den Routinen – wird **dieselbe Routine** als durchgeführt markiert, in „Erledigt“ einmal protokolliert und bis zur nächsten Fälligkeit aus den offenen Aufgaben genommen. Die Wiederholung läuft automatisch weiter.
6. Routinen ohne die Option sind weiterhin normale Routinen und erscheinen nicht in „Alle Aufgaben“.

Der separate „○ Sofort“-Schalter in jeder Routine-Zeile ist entfernt. Bei bereits in v1.6 mit „Sofort“ markierten Routinen wird die bisherige Kennzeichnung als Aufgabe mit Priorität „Sofort“ interpretiert, sodass deine bisherigen Einstellungen nicht verloren gehen. Du kannst das im Routinen-Editor anpassen.

## Technische Hinweise

Die vorhandenen Routine-IDs, Gruppen, Wiederholungsintervalle, Erledigungsdaten, Rückgängig-Funktion, Cloud-Datenstruktur und lokale Speicherschlüssel bleiben erhalten. Die Option `asTask` ist ein zusätzliches Feld innerhalb eines bestehenden Routinen-Eintrags – es wird **keine zweite Aufgabe angelegt**.

Mit Testdaten in Chromium geprüft: Neue Routine mit und ohne Aufgabenoption, Bearbeiten, Prioritäten, Startseite, Gruppierung nach Lebensbereich, Abhaken, Statistik, Wiedererscheinen nach abgelaufenem Intervall und Navigation von Aufgaben zu Routinen. Auf einem echten Android-Gerät und mit deiner persönlichen Firebase-Verbindung konnte dieses Update nicht live getestet werden.
