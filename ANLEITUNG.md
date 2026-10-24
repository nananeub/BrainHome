# BrainHome 1.0 – Installation & kostenlose Cloud-Sicherung

Die App ist weiterhin deine BrainHome-PWA auf GitHub Pages. **Du musst keinen kostenpflichtigen Tarif und keine Kreditkarte hinterlegen.** Die lokale App funktioniert auch dann, wenn die Cloud noch nicht eingerichtet ist.

## A. Erst die vorhandenen Daten sichern – ganz wichtig!

1. Öffne **deine bisherige BrainHome-Version auf dem Handy**, auf dem deine echten Einträge liegen.
2. Tippe oben auf **Backup** → **Backup herunterladen**. Bewahre die `.json`-Datei sicher auf (idealerweise auch außerhalb des Handys).
3. **Nicht** die Browserdaten löschen, die App deinstallieren oder `localStorage` leeren.
4. Entpacke `BrainHome-v1.0.zip`. Lade die Dateien für die Website in **dein bestehendes GitHub-Repository BrainHome** hoch und ersetze dort die bisherigen Dateien. Die Dateien gehören direkt ins Hauptverzeichnis (neben `index.html`), nicht in einen Unterordner.
5. Starte BrainHome anschließend neu. Falls du noch die alte Ansicht siehst, schließe und öffne die PWA erneut oder lade die Seite neu. Lösche dafür **nicht** den Speicher der Website.
6. Prüfe, ob deine vorhandenen Aufgaben, privaten Kategorien, Essen, Geschenke, Routinen und Finanzen noch da sind. Falls etwas fehlt: **Backup → JSON wiederherstellen**.

**Wichtig:** GitHub selbst speichert weiterhin nur App-Dateien – nicht deine privaten Aufgaben. Die Cloud-Funktion muss einmal separat eingerichtet werden.

## B. Firebase einmalig kostenlos einrichten (Spark-Tarif)

1. Öffne <https://console.firebase.google.com/> und melde dich mit deinem Google-Konto an.
2. Klicke **Projekt erstellen**, nenne es zum Beispiel `brainhome-privat` und überspringe Google Analytics (nicht notwendig). Achte auf den **Spark-Tarif (kostenlos)**. **Keine Kreditkarte oder Abrechnung hinterlegen.**
3. Im Projekt auf **Authentication** → **Sign-in method / Anmeldemethode** → **E-Mail/Passwort** aktivieren. Telefon-Anmeldung brauchst du nicht.
4. In **Authentication → Settings / Einstellungen → Authorized domains / Autorisierte Domains** deine GitHub-Pages-Domain `nananeub.github.io` hinzufügen, sofern sie noch nicht eingetragen ist. Nur die Domain, kein `https://` und kein `/BrainHome/`.
5. Öffne **Firestore Database / Firestore-Datenbank** → **Datenbank erstellen**. Wähle einen Standort in der EU, wenn verfügbar, zum Beispiel `eur3` oder `europe-west3` (nach Erstellung nicht leicht änderbar). Wähle einen Modus, der sicher durch Regeln abgesichert werden kann, und **ersetze die Regeln unbedingt sofort** wie unten beschrieben.
6. In **Firestore → Regeln / Rules** den gesamten Inhalt aus `firestore.rules` hineinkopieren und **Veröffentlichen / Publish** drücken. Die Regeln erlauben jedem angemeldeten Nutzer ausschließlich dessen eigenen Bereich. **Nicht im offenen Testmodus belassen.**
7. Unter **Projekteinstellungen** (Zahnrad) → **Deine Apps** eine Web-App mit dem Symbol `</>` hinzufügen. Als App-Spitzname z. B. `BrainHome` wählen. Firebase Hosting **nicht** aktivieren – GitHub Pages reicht.
8. Kopiere aus der Firebase Web-Konfiguration vier Werte: `apiKey`, `authDomain`, `projectId` und `appId` in die gleichnamigen Felder von `firebase-config.js`. Die übrigen Angaben wie `messagingSenderId` werden hierfür nicht benötigt.

Beispiel für `firebase-config.js` (die Beispielwerte **nicht** übernehmen):

```js
window.BRAINHOME_FIREBASE_CONFIG = {
  apiKey: "DEIN_API_KEY",
  authDomain: "DEIN_PROJEKT.firebaseapp.com",
  projectId: "DEIN_PROJEKT",
  appId: "DEINE_APP_ID"
};
```

9. Lade diese **aktualisierte** `firebase-config.js` erneut in dein GitHub-Repository hoch, direkt neben `index.html`. Die Web-Konfiguration ist für Browser-Apps öffentlich; **dein E-Mail-Passwort darf nie in diese Datei**. Der Schutz deiner Daten erfolgt durch Anmeldung und Firestore-Regeln.
10. Warte, bis GitHub Pages die neue Datei bereitstellt, lade BrainHome neu und tippe oben auf **☁ Cloud** → **Konto erstellen**. Verwende deine E-Mail-Adresse und ein eigenes, starkes Passwort.
11. Beim ersten Login mit bisherigen Daten erstellt BrainHome automatisch den ersten Cloud-Datenstand, wenn online noch nichts existiert. Falls auf beiden Seiten schon unterschiedliche Daten vorhanden sind, fragt die App, welcher Datenstand gelten soll – **nicht unüberlegt überschreiben**.

**Beim Gerätewechsel:** Öffne `https://nananeub.github.io/BrainHome/` auf dem neuen Gerät, tippe auf ☁, melde dich mit derselben E-Mail an und wähle beim ersten Vergleich den Cloud-Datenstand. Bewahre das JSON-Backup als zusätzliche Sicherheit auf.

## C. So arbeiten Synchronisierung und Backups

- Jede Bearbeitung wird unmittelbar im **gleichen lokalen Speicher-Schlüssel wie bisher** abgelegt (`brainhome-v02`).
- Bei Internetverbindung und angemeldetem Konto werden Änderungen nach kurzer Pause (ca. 4,5 Sekunden) hochgeladen. Ohne Netz bleibt alles lokal. Beim erneuten Öffnen wird ein Abgleich versucht.
- Die App versucht pro Tag einen eigenen früheren Cloud-Datenstand zu sichern; sie hält maximal 30 tägliche Sicherungen plus gesonderte Konfliktkopien. Das ist selbst programmierter Dokument-Versionsverlauf in **Firestore**, **nicht** der kostenpflichtige Firebase-Backupdienst.
- Für viele kleine, häufige Änderungen ist Firestore im Spark-Tarif vorgesehen. Die kostenlosen Nutzungsgrenzen und Konditionen können sich ändern. Bei Überschreitung kann die Cloud-Funktion eingeschränkt werden; die App wechselt nicht automatisch in einen kostenpflichtigen Tarif.
- Änderungen auf zwei Geräten zur gleichen Zeit werden **nicht blind zusammengeführt**. Bei unterschiedlichen Datenständen fragt BrainHome nach, welche Version maßgeblich sein soll. Sichere den anderen Stand vorher per JSON.
- **Rückgängig** speichert die letzten Änderungen im lokalen Browser. Der **Papierkorb** sammelt ab Version 1.0 gelöschte Einträge 30 Tage lang. Für ältere Geräte-/Versionsstände nutze die täglichen Cloud-Kopien beziehungsweise deinen JSON-Export.
- Es gibt **keine Push-Benachrichtigungen**. Termine, Geburtstage, Routinen und Sofort-Aufgaben erscheinen beim Öffnen der Startseite.

## D. Verwendung

- **Startseite:** Schnellnotiz in die Inbox, Sofort-Aufgaben, Fristen (nächste 7 Tage), Geburtstage (nächste 28 Tage), fällige Routinen.
- **Projektname ändern:** Im geöffneten Lebensbereich den Projektnamen ca. eine halbe Sekunde gedrückt halten; am Laptop Rechtsklick oder Enter auf dem fokussierten Titel.
- **Neues Hauptprojekt:** Kleines `+` direkt neben „Lebensbereiche“.
- **Aufgabe einsortieren:** Im Editor „Speichern unter“ wählen und im Baum-Pfad Ebene für Ebene vorgehen; „Hier ablegen“ wählt die aktuelle Ebene.
- **Eintrag verschieben:** Lange auf den Baum-Eintrag drücken und verschieben beziehungsweise die Zielauswahl öffnen (aus v0.9 übernommen).
- **Suche:** Lupe oben rechts; sucht auch in Untergruppen, Routinen, Finanzen und anderen Listen.
- **Papierkorb:** ♲ in der Kopfzeile; versehentlich gelöschte Einträge wiederherstellen.
- **Rückgängig:** ↶ beziehungsweise Wiederholen ↷, funktioniert auch über andere Tabs hinweg.

## E. Datensicherheit

- **Vor jedem Update** manuell ein JSON-Backup erstellen.
- Firebase-Logins nicht weitergeben; **Firestore-Regeln veröffentlichen**, bevor du persönliche Daten hochlädst.
- Dein Konto kann auf die eigenen Firestore-Dokumente zugreifen. Bei GitHub Pages sind JavaScript-Code und Firebase-Projektkonfiguration öffentlich; deine privaten BrainHome-Dokumente dürfen es **nicht** sein.
- Dies ist **keine Ende-zu-Ende-Verschlüsselung**: Die Daten werden auf Google-Infrastruktur gespeichert. Bitte keine Passwörter, amtlichen Kennnummern oder ähnliche Geheimnisse in BrainHome notieren.
- Bleibe auf dem **Spark-Tarif** und verknüpfe kein Abrechnungskonto. Die kostenlose Firebase-Nutzung hängt von den aktuellen Bedingungen ab.

Hilfe: Firebase-Dokumentation <https://firebase.google.com/docs/web/setup>, <https://firebase.google.com/docs/auth/web/password-auth>, <https://firebase.google.com/docs/firestore/security/get-started>, <https://firebase.google.com/pricing>.
