# BrainHome v2.9 – Schlanke Aufgabenbäume und Schritte

## Sicher installieren

1. In der bisher funktionierenden BrainHome-Version **JSON-Backup exportieren** und die bisherige v2.8-ZIP aufbewahren. Die automatische Umordnung bestehender verschachtelter Aufgaben ist eine Datenmigration.
2. Nur diese drei Dateien im Stammverzeichnis des bestehenden GitHub-Repositories ersetzen: `index.html`, `app.js`, `sw.js`.
3. **Unverändert lassen:** `study.js` (die Studienbibliothek aus v2.8), `cloud.js`, `firebase-config.js`, `firestore.rules`, `manifest.webmanifest`, `icon-192.png`, `icon-512.png`.
4. GitHub-Pages-Veröffentlichung abwarten, die installierte PWA vollständig schließen und neu öffnen. Keine Browserdaten löschen.

## Bedienung

- **Kategorien** bilden die einzigen Äste. **Aufgaben** stehen als kompakte Reihen unter der zugehörigen Kategorie. Das gilt für den kleinen und großen Baum.
- **Kategorie antippen** oder `＋` an der Kategorie wählen: Direktes Eingabefeld für eine Aufgabe. Mit Enter oder **Hinzufügen** speichern. Über `▣` entsteht eine neue Unterkategorie.
- **Aufgabenname antippen**: Schritteliste öffnen, einzelne Schritte hinzufügen, bearbeiten, abhaken, wieder öffnen oder löschen. Die Hauptaufgabe bleibt nach dem Abhaken eines Schrittes bestehen. Sie hat ein eigenes Häkchen.
- **Lang drücken und ziehen**: Aufgabe in eine andere Kategorie verschieben oder innerhalb einer Kategorie umordnen. Kategorien können ebenfalls durch langes Halten umsortiert oder unter eine andere Kategorie verschoben werden. Für Aufgaben gilt weiterhin Prioritätssortierung, solange keine manuelle Reihenfolge für alle Geschwister angelegt wurde.
- **Erledigt**: Jeder Schrittabschluss erzeugt ein eigenes Ereignis in der bestehenden Eingang-/Ausgang-Statistik und erscheint im Abschnitt „Abgeschlossene Schritte“. Auch das Hinzufügen von Schritten zählt als Eingang.

## Bestandsdaten und Sicherheit

- Beim Start werden bisher unter anderen Aufgaben oder einfachen Listen eingerichtete Einträge **zur nächsthöheren Kategorie verschoben**. Dabei bleiben deren IDs, Namen, Fälligkeiten, Prioritäten, Notizen, Abschlusszustände und historische Abschlussereignisse erhalten. Separate Privat-/Studienstiftungs-Speziallisten bleiben unangetastet.
- In Zukunft lässt das Aufgabenformular nur noch **Kategorien oder Inbox** als Ziel zu. Auch beim Hinzufügen innerhalb der Übersicht ist keine Aufgabe als übergeordnetes Element mehr nötig.
- Schritte liegen als `steps`-Array direkt an der jeweiligen Aufgabe in `nodes`. Einzelne Eingangs- und Abschlussereignisse liegen unter dem bereits vorhandenen Feld `taskEvents`. Beide Felder gehören zum bisherigen JSON-Backup und Cloud-Payload. Keine Änderungen an Firebase-Regeln oder Cloud-Code erforderlich.
- Bei einem **gelöschten Schritt** bleiben die zuvor protokollierten Ereignisse in der Statistik erhalten. Ein erneut geöffneter Schritt kann später ein neues Abschlussereignis erzeugen.
- Die bestehende **Cloud-Grenze von ca. 850 KB** für den gesamten Payload bleibt bestehen. Umfangreiche Studiendokumente benötigen weiterhin die geplante separate Cloud-Dateiablage.

## Technische Prüfung

- JavaScript-Syntax von `app.js`, `study.js` und `sw.js` geprüft.
- Chromium mit lokal eingebetteter App: Hauptprojekt öffnen, Kategorie direkt mit Aufgabe befüllen, Schritt hinzufügen und einzeln abhaken, Ein-/Ausgangsereignisse im Datenspeicher, abgeschlossener Schritt in „Erledigt“, vollständigen Baum öffnen, bestehende verschachtelte Aufgaben datenerhaltend in Kategorien umordnen, Zielauswahl ausschließlich Kategorien, Aufgabe per langem Mausdruck verschieben und aus „Alle Aufgaben“ in die passende Baumzeile springen.
- Kein Live-Test der GitHub-Pages-Auslieferung, der Android-PWA oder des persönlichen Firebase-Kontos. Vor Installation bitte JSON-Backup exportieren.
