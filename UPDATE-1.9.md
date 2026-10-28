# BrainHome 1.9 – erster Entwicklungsschritt

## Neu
- Wissensbaum als eigener Tab, mit verschachtelten Themen und Notizen.
- Themen anlegen, bearbeiten, löschen, ein- und ausklappen.
- Vollbildansicht (scrollbar; Zoom/Pan wie im bisherigen Projektbaum folgt).
- Optionale tägliche Uni-Themen-Wiederholung für markierte Zusammenfassungen.
- Wissensknoten in JSON-Export, Import, Undo und bestehende Cloud-Synchronisierung aufgenommen.

## Noch nicht umgesetzt
- Separate Firestore-Dokumente für große Wissensmengen, echtes Spaced Repetition, Mindmap-Zoom, Kalender, Essensplan, Sport-Skilltree, weitere Aufgabenänderungen.
- Die bestehende Cloud-Grenze von 850 KB gilt weiterhin. Bitte längere Zusammenfassungen erst nach Cloud-Umbau massenhaft importieren.

## Installation
- Vorher JSON-Backup exportieren.
- ZIP-Dateien in GitHub-Repository entpacken, alle vorhandenen Dateien behalten.
- Die hochgeladene Firebase-Konfiguration ist leer; eigene funktionierende firebase-config.js aus der bisherigen Installation weiterverwenden.
- Bei Cloud-Konflikt nicht blind überschreiben.
- Offline-Cache wurde auf v19 erhöht.
