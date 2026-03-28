<h1 align="center">Stremio RSS Catalog</h1>

<p align="center">
  <a href="./README.md">🇫🇷 Français</a> · <a href="./README.en.md">🇬🇧 English</a>
</p>

Ein Stremio-Addon zur Erstellung von **Film**-, **Dokumentarfilm**- und **Serien**-Katalogen aus RSS-Feeds, mit automatischem TMDB-Abgleich und einer Web-Verwaltungsoberfläche.

Derzeit wird nur ein privater Usenet-Indexer vollständig unterstützt. Ich plane, in Zukunft weitere RSS-Feeds zu integrieren — einige funktionieren möglicherweise bereits, aber ich kann keine Zuverlässigkeit garantieren.


<p align="center">
  <img src="src/public/logo.png" alt="Stremio RSS Catalog Logo" width="250">
</p>

## Blog-Beitrag mit Screenshots
[Stremio RSS Catalog: mein RSS-zu-Stremio-Katalog-Addon](https://upandclear.org/2025/11/20/useflow-fr-mon-addon-de-conversion-de-rss-en-catalogues-stremio/) (Französisch)


## Funktionen

- ✅ **3 getrennte Kataloge**: Filme, Dokumentarfilme und Serien
- ✅ **Automatische Typerkennung**: Filme, Dokumentarfilme und Serien werden anhand des Release-Namens erkannt (`S01E01`, `Staffel`, `Season` usw.)
- ✅ **Automatischer TMDB-Abgleich**: Abruf von Metadaten (Poster, Zusammenfassung, Genres, usw.) — Serien über die TV-API von TMDB
- ✅ **RPDB-Unterstützung**: Benutzerdefinierte Poster mit Rating Poster Database (optional)
- ✅ **IMDB-ID-Unterstützung**: Kompatibel mit allen Stremio-Streaming-Addons
- ✅ **Vollständige WebUI**: Moderne Administrationsoberfläche mit Authentifizierung
- ✅ **Internationalisierung**: Oberfläche verfügbar in 🇫🇷 Französisch, 🇬🇧 Englisch und 🇩🇪 Deutsch
- ✅ **Mehrere RSS-Feeds**: Fügen Sie so viele RSS-Feeds hinzu wie nötig
- ✅ **Discord-Benachrichtigungen**: Synchronisierungsalarme mit Poster-Galerie (optional)
- ✅ **Proxy-Verwaltung**: HTTP/HTTPS/SOCKS4/SOCKS5-Unterstützung mit oder ohne Authentifizierung (optional)
- ✅ **Persistente Speicherung**: SQLite-Datenbank mit allen Katalogen und inkrementellen Inhalten (Inhalte werden hinzugefügt, nie ersetzt)
- ✅ **Automatische Synchronisierung**: Konfigurierbare Zeitplanung (optional)
- ✅ **Dockerisiert**: Einfache Bereitstellung mit Docker und docker-compose
- ✅ **Integrierte Suche**: Katalogsuche direkt über Stremio
- ✅ **Synchronisierungsverlauf**: Detaillierte Verfolgung aller Synchronisierungen

Beschränkt auf Inhalte, die auf Französisch (VF) verfügbar sind.

## WebUI-Anmeldung

- **Benutzername und Passwort**: In docker-compose festlegen
- **Secret Token** (Cookie-Sicherheit): Mit `openssl rand -hex 32` generieren und in docker-compose eintragen


## Hinweise

- Die Synchronisierung kann je nach Anzahl der Elemente in den RSS-Feeds mehrere Minuten dauern, besonders beim ersten Mal VOR dem Hinzufügen des Addons zu Stremio
- Das Inhaltslimit liegt derzeit bei 10.000 Elementen pro Katalog
- Nur Inhalte mit einer gültigen IMDB-ID werden den Katalogen hinzugefügt (Stremio-Anforderung)


## Technische Übersicht

### Release-Parsing
Das Addon extrahiert automatisch:
- Den bereinigten Inhaltsnamen (technische Tags werden entfernt: Auflösung, Codec, Sprache, Team…)
- Das Erscheinungsjahr
- Den Typ: **Film**, **Dokumentarfilm** oder **Serie** (erkannt über Muster wie `S01E01`, `S01`, `Staffel N`, `Season N`)
- Bei Serien wird der Staffel-/Episodenteil vor der TMDB-Suche aus dem Namen entfernt

### TMDB-Abgleich
Für jedes Element:
1. Suche auf TMDB mit dem bereinigten Namen und Jahr — über die **movie**-API für Filme/Dokus, die **tv**-API für Serien
2. Abruf der IMDB-ID über TMDBs external_ids
3. Wenn eine IMDB-ID gefunden wird → Hinzufügung zum Katalog
4. Wenn keine IMDB-ID → Element wird übersprungen

Bei Serien erzeugen mehrere Releases derselben Serie (verschiedene Episoden oder Staffeln) nur **einen einzigen Eintrag** im Katalog — gruppiert nach Titel.

Dies stellt sicher, dass **nur mit Streaming-Addons kompatible Inhalte** hinzugefügt werden.

### RPDB-Poster
Wenn RPDB aktiviert ist:
- TMDB-Poster werden durch RPDB-Poster ersetzt
- Funktioniert in Stremio UND in Discord-Benachrichtigungen
- Automatischer Fallback auf TMDB, wenn das RPDB-Poster nicht existiert

### Datenbank
Alle Kataloge werden in einer SQLite-Datenbank (`data/addon.db`) gespeichert. Die Daten bleiben erhalten, auch wenn:
- Der Server neu startet
- RSS-Feeds geändert oder nicht verfügbar sind
- Quellen vorübergehend nicht erreichbar sind


### Erste Schritte

Kopieren oder erstellen Sie [die docker-compose.yml](./docker-compose.yml)
```yaml
services:
  useflow-fr:
    image: ghcr.io/aerya/useflow-fr:latest
    container_name: useflow-fr
    restart: always
    ports:
      - "7973:7000"
    volumes:
    # An Ihre Konfiguration anpassen: /home/<ihr_name>/useflow-fr/:/data
      - /home/aerya/docker/useflow-fr/:/data
    environment:
      - PORT=7000
      - NODE_ENV=production
      # Diese sollten Sie ändern
      - WEBUI_USERNAME=admin
      - WEBUI_PASSWORD=admin
      # Normalerweise nicht zu ändern
      - DB_PATH=/data/addon.db
      # Generieren mit openssl rand -hex 32
      - SESSION_SECRET=278f898a4fdbecc8cfd904646336d08a32c04afdad664bacdfc5b8334dfb6653
    labels:
      - com.centurylinklabs.watchtower.enable=true

```

### Ideen in Überlegung
Je nach Motivation und Fähigkeiten

- **Genre-Filterung**: Zur Verbesserung der Suchfunktionen
- **Erweiterte Statistiken**: Katalog-/Quellgrafiken


## Lizenz

GNU GPL v3 Lizenz - Bitte die Quelle angeben.


**Viel Spaß beim Streamen :) 🍿**
