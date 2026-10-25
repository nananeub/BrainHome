# BrainHome 1.2 – Inbox & automatische Cloud-Sicherung

## Diese vier Dateien auf GitHub aktualisieren

Die ZIP-Datei enthält:

- `index.html` – zeigt die neue Inbox an und entfernt die alten Konflikt-Auswahlfelder.
- `brainhome-v12.js` – **neue** Datei für das Abhaken und Verwerfen aus der Inbox.
- `cloud.js` – **ersetzen**: automatische lokale-zu-Cloud-Sicherung statt ständiger Auswahlfragen.
- `sw.js` – **ersetzen**: neue App-Version wird offline zwischengespeichert.

**Unbedingt behalten und nicht überschreiben:** `firebase-config.js` mit deinen bereits eingetragenen Firebase-Werten, `brainhome-v1.js`, `brainhome-v11.js`, `manifest.webmanifest`, die Icons und andere bestehende Dateien. Du musst Firebase **nicht neu einrichten** und die Firestore-Regeln **nicht ändern**.

## Vor dem Update

1. Auf deinem bisherigen Handy BrainHome öffnen, unter **Backup** ein JSON-Backup exportieren und die Datei außerhalb der App aufbewahren.
2. Prüfen, dass du in der Cloud angemeldet bist. Optional einmal **Jetzt sichern** drücken und auf „Gesichert ✓“ achten.
3. Die vier Dateien aus dem Update ins Stammverzeichnis deines GitHub-Repositories laden und Änderungen bestätigen (**Commit changes**).
4. Die App neu öffnen bzw. aktualisieren. **Weder App-Daten noch Websitedaten löschen!**

## Inbox

- Jeder Inbox-Eintrag hat jetzt ein Häkchen, auch wenn er nur eine Notiz ohne Aufgabentyp ist.
- Du kannst den Gedanken zuvor mit dem Stift in den Aufgabenbaum übernehmen oder als eigenen Eintrag dort anlegen.
- Ein Häkchen in der Inbox bedeutet **„aus Inbox entfernen“**, nicht „Aufgabe erledigt“.
- Der Eintrag verschwindet, ohne im Verlauf „Erledigt“ zu erscheinen.
- Falls du dich verklickst, kannst du **↶ Rückgängig** drücken. Diese Rückgängig-Historie ist lokal und begrenzt.
- Inbox-Einträge mit Unterpunkten werden vorsichtshalber nicht ohne Umordnen entfernt.

## Cloud

- **Eingerichtetes Gerät:** Lokale Änderungen werden automatisch nach kurzer Pause (~2 Sekunden) hochgeladen. Du musst nicht „lokal oder Cloud“ wählen.
- **Neues/leeres Gerät:** Mit derselben E-Mail anmelden; der Cloud-Stand wird zuerst geladen, bevor eigene Änderungen hochgeladen werden.
- **Unterschiedliche Datenstände:** Das bereits eingerichtete Gerät behandelt seinen lokalen Stand als maßgeblich und sichert den abweichenden Cloud-Stand vorher als ältere Sicherung. Das funktioniert auch, wenn mehrere Geräte auf dasselbe Konto zugreifen; Änderungen anderer Geräte können auf dem ursprünglichen Handy also überstimmt werden. Bei Bedarf lassen sie sich aus den älteren Cloud-Sicherungen wiederherstellen.
- **Ohne Internet:** Alle Einträge bleiben lokal gespeichert und werden nach einer erneuten Verbindung hochgeladen.
- **App vollständig geschlossen:** Ein automatischer Upload kann nicht garantiert stattfinden. Die App versucht die Sicherung bei der nächsten Nutzung/Internetverbindung erneut. Es gibt keine Push-Nachrichten und keinen dauerhaften Hintergrunddienst.
- **Alte Versionen:** Kürzlich vorgenommene Änderungen machst du über ↶ und ↷ rückgängig; ältere **Cloud-Sicherungen** findest du weiterhin im Cloud-Fenster unter „Ältere Sicherungen“. Die Rückgängig-Historie wird nicht zwischen Geräten synchronisiert.
- **Kosten:** Die bisherige Firebase-Spark-Konfiguration bleibt unverändert. Die kostenlosen Nutzungsgrenzen gelten weiterhin; es wird kein kostenpflichtiger Tarif benötigt oder aktiviert.

**Hinweis:** Dieses Update verändert keine vorhandenen Eintrags-IDs und braucht keine Datenmigration. Es wurde lokal im Browser und mit simulierten Firebase-Szenarien geprüft; ein Test mit deinem echten Firebase-Konto ist ohne Zugang nicht möglich.
