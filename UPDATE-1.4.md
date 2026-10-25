# BrainHome 1.4 – kleines Bedienungs-Update

## Bitte vor dem Update sichern

Öffne BrainHome auf deinem Handy und lade über **Backup** eine JSON-Sicherung herunter. Verwahre sie außerhalb der App, etwa in deinen Dateien.

## Diese drei Dateien auf GitHub hochladen

Öffne dein bestehendes Repository `nananeub/BrainHome` und lade die **drei Dateien im Stammverzeichnis** hoch:

1. `index.html` — die bisherige Datei ersetzen
2. `sw.js` — die bisherige Datei ersetzen
3. `brainhome-v14.js` — **neu hinzufügen**

Committe die Änderungen. **Keine anderen Dateien löschen.** Besonders wichtig: `firebase-config.js`, `cloud.js`, `brainhome-v1.js`, `brainhome-v11.js`, `brainhome-v12.js`, `brainhome-v13.js`, `manifest.webmanifest` und beide Icons behalten. Die persönliche Firebase-Konfiguration wird nicht verändert, Firebase muss nicht erneut eingerichtet werden.

Anschließend BrainHome schließen und wieder öffnen bzw. bei Bedarf einmal aktualisieren. Wenn die alte Oberfläche zu sehen ist, App neu starten; **nicht die Websitedaten löschen**, da sonst lokale Daten verlorengehen können.

## Was sich ändert

- In **Privat → Routinen** gibt es keinen Verschiebepfeil mehr. Drücke auf den Namen oder die freie Fläche einer Routine ungefähr eine halbe Sekunde und ziehe sie auf eine **Gruppenüberschrift** (oder innerhalb der Gruppe) und lasse dort los. Auch Untergruppen gehen. Für einen Eintrag außerhalb der Gruppen dient die kleine Zielzone **„Ohne Gruppe“**.
- Wenn du gedrückt hältst und **nicht ziehst**, öffnet sich ein Menü zum Bearbeiten und Löschen. Die Schaltfläche „Gemacht“ funktioniert wie zuvor.
- In der **Projektansicht** steht statt zweier Baum-Buttons nur noch einer, der zwischen **Verzweigter Baum** und **Ordnerbaum** umschaltet. Er steht neben **Erledigte anzeigen**.
- Der Rückweg zu den Projekten ist ein kleiner **←**-Pfeil; der Projektname ist unterstrichen und weiterhin per langem Drücken bearbeitbar.
- In der **Projekteübersicht** verschwindet die Erklärung zur Inbox.
- In **Erledigt** verschwinden die Pfadangaben. Tippe auf eine erledigte Aufgabe, um zu ihrem Projekt zu springen: Der große Baum öffnet sich mit dem entsprechenden Knoten hervorgehoben. Mit ↺ kannst du die Aufgabe wie bisher wieder öffnen.

## Datensicherheit & Tests

Die vorhandene lokale Speicherkennung (`brainhome-v02`), die Datenstruktur, die Cloud-Verbindung und die Rückgängig-Funktion sind unverändert. Getestet mit Beispieldaten im mobilen Browser: Wechsel zwischen beiden Baumarten, verschachtelte Routinen-Gruppen, Ziehen per Maus und simuliertem Android-Touch, Projektverlinkung erledigter Aufgaben und gezielte Hervorhebung. Die echte Firebase-Verbindung und die Bedienung auf deinem konkreten Handy konnten hier nicht direkt geprüft werden.
