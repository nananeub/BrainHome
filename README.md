# BrainHome v3.3 – Datenrettung, Privat-Fix, Uni-Notizen & PDF-Großansicht

## Bitte VOR dem Update
1. Öffne deine aktuell funktionierende BrainHome-Version und exportiere ein JSON-Backup, auch wenn momentan Einträge fehlen. Unsichtbare Einträge sind im Export möglicherweise noch enthalten.
2. Bewahre dieses Backup und ältere Backups auf. Weder Browserdaten noch App-Speicher löschen, keine Cloud-Sicherung manuell zurücksetzen.
3. Im GitHub-Repository nur `index.html`, `app.js`, `study.js` und `sw.js` ersetzen. `cloud.js`, die funktionierende `firebase-config.js`, `firestore.rules`, Manifest und Icons **nicht** überschreiben oder löschen.
4. GitHub Pages aktualisieren, dann BrainHome neu öffnen. Falls die alte Ansicht noch sichtbar ist, die Seite aktualisieren; Cache-Version ist `brainhome-static-v33`.

## Wichtiger Fehler und Datenrettung
Bei den privaten benutzerdefinierten Unterbereichen war die Kategorie aus dem Eltern-Auswahlfeld entfernt worden. Neue Einträge hatten dadurch teilweise `parent: ""` erhalten. Sie waren weiterhin in `data.nodes`, aber in keinem Baum sichtbar.

**Behoben:** Der gewählte Privatbereich ist wieder ein gültiges Speicherziel. Vor dem Speichern wird geprüft, dass ein gültiges Ziel vorhanden ist. Der Test „Privat → neue Kategorie → Eintrag“ wurde im Chromium-Browser ausgeführt.

**Rettungsansicht:** Sollte es solche Einträge bereits geben, erscheint auf Startseite/Übersicht ein Hinweis „Einträge ohne Zuordnung gefunden“. Öffne „Privat“ und scrolle zum Bereich mit Rettungsring. Dort kannst du erst **vollständiges Rettungs-JSON herunterladen** und dann jeden Eintrag manuell einer passenden Kategorie zuordnen. Es wird beim Start nichts automatisch neu einsortiert oder gelöscht. Vor jeder manuellen Einordnung versucht die App zusätzlich, lokal eine Schutzkopie abzulegen.

Wichtig: Das funktioniert nur für Einträge, die noch in der lokalen Datenbank bzw. im geladenen Cloud-Datenstand vorhanden sind. Bereits überschriebene, nie gespeicherte oder tatsächlich gelöschte Einträge lassen sich nicht allein durch diesen Fix wiederherstellen; dafür sind ältere JSON- oder Firebase-Sicherungen nötig.

## Weitere Datensicherheit
- Bisher fehlender `taxAllowance`-Wert (Steuerfreibetrag) wird künftig im Cloud- und JSON-Export mitgeführt.
- Bei fehlgeschlagenem Schreiben in `localStorage` erscheint jetzt ein dauerhafter Warnhinweis mit einem Download des aktuellen In-Memory-Backups. Das verhindert nicht einen bereits eingetretenen Speicherfehler, macht ihn aber sichtbar.
- Die bisherige Firebase-Synchronisierung bleibt unverändert. Die Cloud selbst wurde **nicht** mit dem persönlichen Konto getestet.

## Uni: Direktnotizen in jedem Fach
Unter Wissensbaum → Uni sowie bei Innere Medizin, Pharmakologie usw. gibt es jetzt dasselbe große Notizfeld wie in den anderen Wissensbereichen. Die sichtbare Beschriftung „Mein Sammeldokument“ und der unnötige Hinweis „Wird automatisch gespeichert“ sind entfernt. Die Inhalte werden weiterhin automatisch gespeichert. Die Notizen werden nicht zusätzlich als doppelte Dokumentkarte angezeigt.

## PDFs: Großansicht
Der bisherige Link „PDF öffnen“ öffnete auf manchen Android-PWAs keinen neuen Tab. Stattdessen gibt es jetzt **„⤢ Groß öffnen“** in der Dokumentansicht: Ein großes PDF-Fenster erscheint direkt innerhalb von BrainHome, mit Schließen und „PDF speichern“ als Ausweichmöglichkeit.

**Grenzen:** Das originale PDF liegt nach wie vor nur lokal in IndexedDB dieses Geräts; es ist nicht im JSON- oder Firebase-Backup enthalten. Auf einem anderen Gerät muss es erneut zugeordnet werden. Manche Android-Browser rendern eingebettete PDFs nicht; in diesem Fall die PDF speichern und extern im PDF-Reader öffnen. PDF-Textauslese/OCR wurde nicht verändert.

## Technische Tests
- Chromium ohne Netzwerk: Privatbereich + benutzerdefinierte Kategorie + neuer Eintrag, korrekte Eltern-ID, sofort sichtbar.
- Simulierte ungültige Eltern-IDs und `parent: ""`: Warnung sichtbar, manuelles Einsortieren, keine Löschung.
- Neuanlage einer Aufgabe in einem anderen Lebensbereich: korrekte Zuordnung.
- Uni und „Innere Medizin“: Textfeld vorhanden, eingegebene Notizen in `knowledgeNodes` gespeichert.
- PDF-Test mit simulierter Original-Datei: Große Ansicht öffnet und schließt ohne neuen Browser-Tab.
- JavaScript-Syntax geprüft. Ein echter Android-PWA-Test und Live-Firebase-Test konnten hier nicht erfolgen.
