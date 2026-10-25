# BrainHome 1.3 – Update

## Zuerst: Backup!

1. Öffne **deine bisherige BrainHome-App auf deinem Handy**.
2. Tippe auf **Backup** und exportiere eine **JSON-Datei**.
3. Bewahre die Datei an einem sicheren Ort auf, bevor du GitHub aktualisierst.
4. Prüfe, ob deine Cloud-Sicherung in BrainHome zuletzt erfolgreich war. Das JSON-Backup ist trotzdem sinnvoll.

## Update auf GitHub Pages

Öffne dein bestehendes Repository **nananeub/BrainHome**. Die ZIP-Datei enthält diese **sechs** App-Dateien. Lade alle sechs in das **Stammverzeichnis** des Repositories (dort, wo `index.html` liegt):

- `index.html` – ersetzen
- `sw.js` – ersetzen
- `brainhome-v1.js` – ersetzen bzw. ergänzen, falls sie fehlt
- `brainhome-v11.js` – ersetzen bzw. ergänzen, falls sie fehlt
- `brainhome-v12.js` – ersetzen bzw. ergänzen, falls sie fehlt
- `brainhome-v13.js` – **neu hinzufügen**

Die Dateien haben in der ZIP keine zusätzlichen Unterordner. In GitHub alle Änderungen **committen**.

**Bitte unbedingt behalten und nicht überschreiben:**

- `firebase-config.js` (deine eigene Firebase-Konfiguration)
- `cloud.js` (deine bereits eingerichtete Cloud-Sicherung)
- `manifest.webmanifest`, `icon-192.png`, `icon-512.png`
- sonstige vorhandene Dateien, soweit GitHub sie enthält

Du musst **Firebase nicht neu einrichten**. Dieses Update ändert die Cloud-Konfiguration nicht.

## Danach

- Warte, bis GitHub Pages die neue Version bereitstellt; öffne die installierte App und lade die Seite einmal neu (notfalls App schließen/neu öffnen).
- Unter „Projekte“ sollte der **verzweigte Baum** wieder erscheinen. Die Ordneransicht ist optional weiterhin wählbar.
- Prüfe deine Inbox und deine Privat-Routinen.
- Unter „Erledigt“ kannst du das einzelne Diagramm auf **Woche, Monat oder Jahr** stellen.
- Beim Herunterziehen zum Neuladen sollte BrainHome wieder die zuvor gewählte Seite und das geöffnete Projekt zeigen.

## Was geändert wurde

- Inbox: kompakter Titel, kleines Plus, leere Inbox direkt anklickbar, kein Anleitungsslogan.
- Aufgaben: kleines Plus, Sortierung nach Priorität oder Lebensbereich, Lebensbereichsfilter.
- Baum: echte verzweigte grafische Darstellung (anstelle der Ordner-Vorschau), alle direkten Äste sichtbar, in der Vorschau höchstens zehn Listeneinträge/Aufgaben je Hauptast. Große Ansicht über „Gesamten Baum ansehen“.
- Privat: kompaktere Kategorien und weniger Abstand, kleines Plus zur Kategorieerstellung.
- Routinen: Löschen über langes Drücken (oder Rechtsklick) → „Löschen“; kleine Löschkreuze ausgeblendet.
- Erledigt: kleinere Zeilen und ein Aktivitätsdiagramm mit drei Zeiträumen.
- Navigation: zuletzt geöffnete Seite und Projekt bleiben beim Neuladen erhalten.

## Datensicherheit

Die bisherige lokale Speicherkennung `brainhome-v02`, die Datenfelder und die Firebase-Konfiguration bleiben unverändert. Die Rückgängig-Pfeile und die bestehende Cloud-Sicherung bleiben bestehen. Die Browser-Tests liefen mit Beispieldaten; ein vollständiger Test auf deinem eigenen Android-Gerät und deiner echten Firebase-Verbindung war hier nicht möglich.
