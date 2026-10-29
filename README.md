# BrainHome v2.3 – Kleine Verbesserungen

- Startseite: **Sofort** und **Geschenke** sind standardmäßig eingeklappt. Tippen auf die Überschrift öffnet sie. Die Wahl wird auf dem jeweiligen Gerät gespeichert.
- In Aufgabenbäumen werden offene Aufgaben unter demselben Elternknoten nach Priorität sortiert (Sofort, Wichtig, Später, Warten). Kategorien behalten ihre relative Reihenfolge.
- Der oberste Lebensbereich „Promotion“ wird einmalig in „Labor“ umbenannt, falls es nicht bereits einen Bereich „Labor“ gibt. IDs und Unterpunkte bleiben erhalten.
- Die funktionierende `cloud.js` bleibt unverändert; `firebase-config.js` wird bewusst nicht mitgeliefert. Die vorhandene funktionierende Datei auf GitHub unbedingt behalten.
- Service-Worker-Cache auf v23 erhöht.

## Installation
Vorher JSON-Backup exportieren. Dateien ins Repo kopieren, aber die bestehende `firebase-config.js` und `firestore.rules` nicht löschen. App nach GitHub Pages-Deployment neu laden.

## Noch offen
Beziehungskategorien sicher umziehen, Follow-up-Aufgaben mit Abschlusschronik, Statistik, Kalender, Essen-Automatik, Calisthenics und separate große Wissensspeicherung.

## Tests
JavaScript-Syntax geprüft. Browser-/Firebase-End-to-End-Test ist nicht erfolgt.
