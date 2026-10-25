# BrainHome 1.8 – Routinen zurücksetzen, Geschenk-Prioritäten, Warten

## Vor dem Update

1. Öffne BrainHome auf deinem Handy und lade über **Backup** ein aktuelles **JSON-Backup** herunter.
2. Bewahre das Backup außerhalb der BrainHome-App auf, zum Beispiel in deinem Download-Ordner oder einem privaten Speicher.
3. Lade die Dateien aus dem ZIP **ins Stammverzeichnis deines bestehenden GitHub-Repositories** hoch; Dateien gleichen Namens ersetzen.

## Dateien im ZIP

Dieses Update enthält bewusst alle benötigten App-Skripte, sodass keine Zwischenversion fehlt:

- `index.html` (ersetzen)
- `brainhome-v1.js` (ersetzen)
- `brainhome-v11.js` (ersetzen bzw. ergänzen)
- `brainhome-v12.js` (ersetzen bzw. ergänzen)
- `brainhome-v13.js` (ersetzen)
- `brainhome-v14.js` (ersetzen bzw. ergänzen)
- `brainhome-v15.js` (ersetzen bzw. ergänzen)
- `brainhome-v16.js` (ersetzen)
- `brainhome-v17.js` (ersetzen)
- `brainhome-v18.js` (**neu hinzufügen**)
- `sw.js` (ersetzen)

**Behalten und keinesfalls löschen oder überschreiben:** `firebase-config.js`, `cloud.js`, `manifest.webmanifest`, `icon-192.png` und `icon-512.png`. Deine Cloud-Konfiguration und die Firebase-Regeln müssen nicht verändert werden.

Danach die installierte App vollständig schließen und erneut öffnen. Falls sie noch die alte Version zeigt, einmal aktualisieren. **Nicht die Websitedaten löschen!**

## Neuerungen

### 1. Routinen manuell wieder öffnen

- Unter Privat → Routinen steht bei einer bereits durchgeführten, derzeit noch nicht fälligen Routine **„↺ Wieder öffnen“**.
- Tippe darauf, um die Routine sofort wieder als offen/fällig zu markieren. Auch als Aufgabe geführte Routinen erscheinen dann entsprechend wieder in „Alle Aufgaben“, es sei denn, ihre Priorität steht auf „Warten“.
- Der vorherige Abschluss bleibt in **Erledigt** und im Diagramm erhalten. Wenn du die Routine erneut abhakt, wird **ein neuer Abschluss** gespeichert.
- Ein versehentliches Wiederöffnen kannst du mit **↶ Rückgängig** zurücknehmen.

### 2. Sofort bei Routinen nur einmal

Wenn du eine Routine mit Priorität **Sofort** erledigst, wird ihre Priorität automatisch zu **Keine Priorität**. Die Markierung **„Auch als Aufgabe führen“** bleibt aktiviert. Beim nächsten Fälligkeitstermin erscheint sie wieder als normale Aufgabe ohne Sofort-Priorität. Die Prioritäten Wichtig, Später und Warten werden beim Abhaken nicht automatisch geändert.

### 3. Geschenk-/Geburtstags-Sofort-Knopf entfernt

Im Bereich Privat → Geschenke gibt es keinen separaten `○ Sofort`-Knopf mehr. Öffne die Person über **✎ Bearbeiten** und wähle bei **Priorität** wie bei normalen Aufgaben **Sofort**. Ein offenes Geschenk mit Priorität Sofort erscheint dann auf der Startseite im Sofort-Bereich. Du kannst die Priorität ebenso wieder entfernen. Die separate Markierung für die Anzeige eines offenen Geschenks im Geschenke-Bereich bleibt bestehen.

### 4. Priorität „Warten“

In den Prioritätsfeldern stehen **Keine, Sofort, Wichtig, Später, Warten** zur Wahl. Offene normale Aufgaben, als Aufgabe geführte Routinen und Zubereitungsaufgaben mit Priorität Warten erscheinen **nicht in „Alle Aufgaben“** und werden nicht als anstehende Aufgabe auf der Startseite gemeldet. Sie bleiben unter ihrem jeweiligen Projekt oder ihrer Routine-Liste erhalten und können jederzeit umgestellt werden.

## Technische Hinweise

Alle bisherigen IDs, Routinen, Gruppen, Geschenk-Einträge, Erledigungsprotokolle, Backup-Felder und Cloud-Schlüssel bleiben bestehen. Es wird kein Daten-Reset durchgeführt und es wird keine neue Firebase-Einrichtung benötigt.

Die lokale Funktion wurde in Chromium mit Beispieldaten geprüft (Warten-Filter, Sofort-Anzeige für Geschenke, manuelles Öffnen, zweifaches Erledigen mit zwei Logeinträgen, Zurücksetzen der Sofort-Priorität). Nicht live getestet wurden die echte Cloud-Anmeldung und die Bedienung auf deinem persönlichen Android-Gerät.
