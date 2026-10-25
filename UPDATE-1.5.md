# BrainHome 1.5 – Update-Anleitung

## 1. Vorher unbedingt sichern

Öffne deine bisherige BrainHome-App auf dem Handy und exportiere im Bereich **Backup** ein JSON-Backup. Bewahre diese Datei auch außerhalb von BrainHome auf. Stelle sicher, dass du bei GitHub eingeloggt bist.

## 2. Genau diese fünf Dateien hochladen

Öffne dein bestehendes GitHub-Repository `nananeub/BrainHome`. Lade **nur diese fünf Dateien** in das Stammverzeichnis hoch und bestätige den Commit:

| Datei | Aktion |
| --- | --- |
| `index.html` | vorhandene Datei ersetzen |
| `brainhome-v13.js` | vorhandene Datei ersetzen – korrigierte Aufgabenübersicht und alter Routinen-Handler |
| `brainhome-v14.js` | vorhandene Datei ersetzen – korrigiertes Ziehen und keine „Ohne Gruppe“-Zielbox |
| `brainhome-v15.js` | **neu** hinzufügen – Zwei-Finger-Zoom, Aufgabennavigation, Kategorie-Ziehen |
| `sw.js` | vorhandene Datei ersetzen – neuer App-Cache |

**Alles andere bitte behalten und nicht überschreiben:** `firebase-config.js`, `cloud.js`, `brainhome-v1.js`, `brainhome-v11.js`, `brainhome-v12.js`, `manifest.webmanifest` und die beiden Icons. Firebase brauchst du **nicht** neu einzurichten. Falls weitere Dateien bereits in deinem Repository sind, lass sie unverändert.

Nach dem Commit die installierte BrainHome-App ganz schließen und erneut öffnen. Falls noch die alte Oberfläche geladen wird, einmal neu laden. **Nicht die Websitedaten löschen** – sonst könnten lokale Daten verloren gehen.

## 3. Änderungen

- In **Alle Aufgaben → Lebensbereich** sind die Aufgaben **innerhalb jedes Bereichs** nach **Sofort → Wichtig → Später → ohne Priorität** geordnet.
- Die Registerkarte **Erledigt** trägt kein Stern-Emoji mehr.
- In den **verzweigten Bäumen** (kleine Vorschau und große Vollbildansicht) kannst du mit **zwei Fingern auseinander- und zusammenziehen**, um zu zoomen. Mit einem Finger scrollst du weiter wie zuvor.
- In **Routinen** erscheinen nicht zugeordnete Routinen schlicht unter den Gruppen. Es gibt keine Rubrik oder sichtbare Zielbox **„Ohne Gruppe“** mehr.
- Die einklappbaren Privat-Kategorien und die Einträge in selbst angelegten Kategorien sind kompakter.
- Die **Auf-/Ab-Pfeile** zwischen Essen, Routinen, Geschenken usw. werden gar nicht mehr erzeugt. Um die Reihenfolge zu verändern, **halte eine Kategorienüberschrift gedrückt und ziehe sie auf eine andere Überschrift**.
- **Langdruck auf Routinen** öffnet nur noch ein Bearbeiten/Löschen-Menü; Ziehen der Routine in eine Untergruppe funktioniert weiterhin.
- In **Alle Aufgaben** steht kein langer Speicherpfad mehr. Tippe auf den Aufgabennamen, um zum Eintrag zu springen: Normale Projektaufgaben öffnen den großen Baum; bei Einträgen in eigenen Privat-Kategorien öffnet sich direkt die betreffende einklappbare Kategorie.

## 4. Daten und Tests

Die App nutzt die bisherige lokale Speicherkennung `brainhome-v02`, dieselben IDs und dasselbe Cloud-Datenformat. Der Code für Authentifizierung und Firebase-Synchronisierung wurde nicht verändert. **Mit Testdaten im mobilen Browser** geprüft: Sortierung innerhalb von Lebensbereichen; Eintrag-Navigation; Auf-/Zu-Zoom der beiden Baumansichten; keine Pfeile und kein „Ohne Gruppe“; Umordnen von Privat-Kategorien; nur noch ein Routinen-Menü. Ein Praxistest auf deinem Android-Gerät mit deiner eigenen Firebase-Verbindung war hier nicht möglich.
