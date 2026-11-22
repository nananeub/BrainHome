# BrainHome v3.8 – Lebenshaltung & Google Kalender

## Was sich geändert hat

- **Lebenshaltung → Sport:** Die bestehende Trainingsstatistik bleibt. Darunter gibt es Sportziele mit frei benennbaren Leveln, die einzeln abgehakt, bearbeitet und gelöscht werden können.
- **Lebenshaltung → Essen:** Weiterhin Rezeptwürfel und Wochenplan. Zusätzlich werden die *bestehenden* Inhalte von **🍙 Rezeptbuch**, Lebensmittel-/Vorratsliste und allgemeiner Einkaufsliste aus Privat angezeigt und dort bearbeitet. **Das sind dieselben Daten, keine getrennten Kopien.** Dein Privat-Rezeptbuch bleibt vorhanden.
- **Lebenshaltung → Haushalt:** Sechs Startzimmer (Schlafzimmer, Wohnzimmer, Küche, Arbeitszimmer, Flur, Bad), eigene Räume, Unteraufgaben, getrennte Reinigungstage, individuell einstellbare Reinigungsintervalle, „Als Nächstes“ und die bisherigen Rituale/Routinen.
- **Aufgabenzähler:** Fällige Rituale, die als Aufgabe markiert wurden, erscheinen als offene Aufgaben bei Lebenshaltung. Normale Rituale werden nicht gezählt.
- **Studienstiftung:** Terminbereich ist einklappbar; der Zustand wird auf diesem Gerät gemerkt.
- **Kalender:** Read-only-Anbindung an Google Kalender (Google Identity Services / Calendar API). Nach Freigabe werden sichtbare Google-Kalender für den gewählten Monat geladen und als zusätzliche Termine angezeigt; auch ganztägige und wiederkehrende Termine. Deine BrainHome-Aufgaben bleiben getrennt und werden nicht an Google geschrieben.

## Installation – ohne Überschreiben der Cloud

1. **Zuerst aus BrainHome ein vollständiges JSON-Backup herunterladen und an einem sicheren Ort ablegen.** Falls mehrere Geräte BrainHome verwenden: überall auf denselben Softwarestand aktualisieren, ehe du neue Sportziele oder Putzpläne anlegst. Ältere BrainHome-Versionen kennen die neuen Felder nicht und könnten sie beim Synchronisieren wieder entfernen.
2. Auf GitHub nur die Dateien `index.html`, `app.js`, `sw.js` im Wurzelverzeichnis ersetzen.
3. Die vorhandenen Dateien `cloud.js`, `firebase-config.js`, `firestore.rules`, `study.js`, Manifest und Icons **nicht verändern**. Insbesondere keine Firebase-Config aus einer alten ZIP wiederherstellen.
4. BrainHome neu laden. In **Lebenshaltung** sind jetzt drei Reiter. Die Startzimmer werden zunächst nur angezeigt und erst beim ersten Bearbeiten oder Abhaken gespeichert. Diese Vorsicht verhindert, dass ein neu eingerichtetes Gerät eine vorhandene Cloud-Sicherung voreilig überschreibt.

## Google Kalender – einmalige Einrichtung

Dies ist eine echte, **lesende API-Verbindung**, kein `.ics`-Import. Sie benötigt eine Client-ID aus einem eigenen Google-Cloud-Projekt.

1. Öffne <https://console.cloud.google.com/> und erstelle/wähle ein Projekt.
2. Unter **APIs & Services / Library** aktiviere **Google Calendar API**.
3. Unter **Google Auth Platform / Branding / Audience / Data Access** richte den OAuth-Zustimmungsbildschirm ein. Für einen privaten Test wähle einen passenden Testmodus und füge deine Google-Mailadresse als Testnutzerin hinzu. Als Berechtigung wird `https://www.googleapis.com/auth/calendar.readonly` benötigt.
4. Unter **Clients / Credentials → Create OAuth Client ID** erzeuge einen Client vom Typ **Web application**.
5. Trage unter **Authorized JavaScript origins** die **Origin** deiner BrainHome-Website ein. Für `https://nananeub.github.io/BrainHome/` ist das **`https://nananeub.github.io`**, **OHNE** `/BrainHome/`. Bei einer eigenen Domain deren Origin verwenden. Für lokales Entwickeln ggf. auch `http://localhost` mit Port separat freigeben.
6. Kopiere die **Client-ID** (endet auf `.apps.googleusercontent.com`), **nicht** ein Client-Secret.
7. Öffne in BrainHome **Kalender → Google Kalender**, füge die Client-ID ein, tippe auf **Einrichten** und dann auf **Mit Google verbinden**. Erlaube den nur lesenden Kalenderzugriff. Die Google-Termine erscheinen für den aktuellen Kalendermonat; für andere Monate beim Monatswechsel neu laden. Mit **Aktualisieren** kannst du erneut abfragen.

**Wichtige Grenzen:**
- Ein OAuth-Client ist pro Website-Origin konfiguriert. Ohne Client-ID und deine Google-Freigabe wird keine Google-Verbindung hergestellt.
- Die Google-Termine bleiben in Google und werden **nicht** in Firebase, im BrainHome-JSON oder dauerhaft im Browser gespeichert. Der Google-Zugriffstoken bleibt nur im Arbeitsspeicher. Nach Neustart oder Tokenablauf musst du erneut verbinden. Eine dauerhaft automatische Aktualisierung bei geschlossener App wäre eine spätere Backend-Erweiterung.
- Kalenderverbindung ist ausschließlich lesend. Änderungen in BrainHome gehen nicht nach Google; Einträge in Google erscheinen nach dem nächsten Laden/Aktualisieren.
- Google OAuth-Berechtigungen und der Zustimmungsbildschirm können für eine öffentliche Anwendung zusätzliche Freigaben/Verifikation benötigen. Die sichere private Testkonfiguration ist zunächst die einfachste Variante.
- **Nicht** deine Google-Zugangsdaten, OAuth-Client-Secrets oder Firebase-Schlüssel an Dritte weitergeben.

Dokumentation: <https://developers.google.com/workspace/calendar/api/quickstart/js>, <https://developers.google.com/identity/oauth2/web/guides/use-token-model>, <https://developers.google.com/identity/oauth2/web/guides/get-google-api-clientid>.

## Datensicherheit / Tests

Alle neuen Listen (`sportGoals`, `cleanRooms`, `cleanHistory`, `householdSettings`) sind in der bestehenden Backup-/Cloud-Nutzlast enthalten. Vorhandene Knoten-IDs, Rezeptdaten und Routinen werden nicht migriert oder überschrieben. Beachte weiterhin die bisherige **ca. 850-KB-Grenze** für das eine Firebase-Dokument.

Lokal mit Chromium getestet: Sportziel erstellen, Level abhaken, vorhandene Rezept-/Einkaufslisten, Putzplan mit individuellem Intervall, Abhaken, Backupfelder und Lebenshaltungs-Aufgabenzähler. Google-Kalenderanzeige wurde mit einer **simulierten OAuth-/Calendar-API-Antwort** getestet. Ein tatsächlicher Login in dein Google-Konto, der Firebase-Liveabgleich und Android-PWA-Verhalten konnten hier nicht getestet werden.
