<h1 align="center">
  <img src="src/public/logo.png" alt="Stremio RSS Catalog" width="120"><br>
  Stremio RSS Catalog
</h1>

<p align="center">
  <strong>Verwandeln Sie Ihre RSS-Feeds in Stremio-Kataloge — Filme, Dokumentarfilme und Serien</strong>
</p>

<p align="center">
  <a href="./README.md">🇫🇷 Français</a> · <a href="./README.en.md">🇬🇧 English</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Stremio-addon-purple?style=flat-square" alt="Stremio">
  <img src="https://img.shields.io/badge/Docker-ready-blue?style=flat-square&logo=docker" alt="Docker">
  <img src="https://img.shields.io/badge/TMDB-matched-green?style=flat-square" alt="TMDB">
  <img src="https://img.shields.io/badge/i18n-FR%20%7C%20EN%20%7C%20DE-orange?style=flat-square" alt="i18n">
</p>

---

> Ein selbst gehostetes Stremio-Addon, das Ihre RSS-Feeds parst, Filme, Dokumentarfilme und Serien automatisch erkennt, sie auf TMDB abgleicht und als Kataloge in Stremio bereitstellt.
>
> Derzeit wird nur ein privater Usenet-Indexer vollständig unterstützt. Andere Feeds können funktionieren, jedoch ohne Garantie.

---

## ✨ Neuigkeiten

- 🆕 **Umbenannt**: Das Addon heißt jetzt **Stremio RSS Catalog**
- 📺 **Serienunterstützung**: Automatische Erkennung anhand des Release-Namens (`S01E01`, `Staffel N`…), Abgleich über die TV-API von TMDB, Gruppierung nach Titel (ein Eintrag pro Serie, unabhängig von der Anzahl der Episoden/Staffeln im Feed)

---

## 🎬 Funktionen

| | |
|---|---|
| 📁 **3 Kataloge** | Filme · Dokumentarfilme · Serien |
| 🔍 **Auto-Erkennung** | Typ wird aus dem Release-Namen erkannt |
| 🎯 **TMDB-Abgleich** | movie-API für Filme/Dokus, tv-API für Serien |
| 🖼️ **RPDB** | Bewertungs-Poster (optional) |
| 🔔 **Discord** | Benachrichtigungen mit Poster-Galerie bei jeder Sync |
| 🔄 **Auto-Sync** | Konfigurierbare Planung |
| 🌐 **WebUI** | Vollständige Admin-Oberfläche, 🇫🇷 🇬🇧 🇩🇪 |
| 🔒 **Proxy** | HTTP / HTTPS / SOCKS4 / SOCKS5 |
| 💾 **SQLite** | Persistente Daten, inkrementelle Inhalte |
| 🐳 **Docker** | Multi-Arch-Image `linux/amd64` + `linux/arm64` |

> Beschränkt auf französischsprachige Inhalte (FRENCH / MULTi / TRUEFRENCH…)

---

## 🚀 Schnellstart

[docker-compose.yml](./docker-compose.yml) kopieren oder erstellen:

```yaml
services:
  useflow-fr:
    image: ghcr.io/aerya/useflow-fr:latest
    container_name: useflow-fr
    restart: always
    ports:
      - "7973:7000"
    volumes:
      - /home/aerya/docker/useflow-fr/:/data
    environment:
      - PORT=7000
      - NODE_ENV=production
      - WEBUI_USERNAME=admin        # Ändern
      - WEBUI_PASSWORD=admin        # Ändern
      - DB_PATH=/data/addon.db
      - SESSION_SECRET=changeme     # openssl rand -hex 32
    labels:
      - com.centurylinklabs.watchtower.enable=true
```

Dann die WebUI unter `http://localhost:7973` öffnen, RSS-Feed + TMDB-API-Schlüssel konfigurieren, eine erste Synchronisierung starten und das Addon in Stremio mit der angegebenen URL installieren.

---

## ⚙️ Funktionsweise

### Release-Parsing

Jeder Release-Titel wird analysiert, um Folgendes zu extrahieren:
- Den **bereinigten Namen** (technische Tags entfernt: Auflösung, Codec, Sprache, Team…)
- Das **Erscheinungsjahr**
- Den **Typ**: Film, Dokumentarfilm oder Serie

Die Serienerkennung basiert auf Mustern wie `S01E01`, `S01`, `Staffel N`, `Season N` — der Staffel-/Episodenteil wird dann vor der TMDB-Suche aus dem Namen entfernt.

### TMDB-Abgleich

```
RSS-Release  →  Parsing  →  TMDB (movie oder tv)  →  IMDB-ID  →  Stremio-Katalog
```

- Filme und Dokumentarfilme → `/search/movie`-API
- Serien → `/search/tv`-API
- Nur Inhalte mit einer **gültigen IMDB-ID** werden hinzugefügt (Stremio-Anforderung)
- Bei Serien: mehrere Releases derselben Serie → **ein einziger Eintrag** im Katalog

### Persistenz

Alles wird in einer SQLite-Datenbank (`data/addon.db`) gespeichert. Inhalte **akkumulieren sich** — eine Synchronisierung ersetzt niemals vorhandene Daten.

---

## 🔐 WebUI-Anmeldung

- **Zugangsdaten**: in `docker-compose.yml` festgelegt
- **Session-Secret**: mit `openssl rand -hex 32` generieren

---

## 📝 Hinweise

- Die erste Synchronisierung kann je nach Feed-Größe mehrere Minuten dauern — **vor** der Installation des Addons in Stremio durchführen
- Aktuelles Limit: **10.000 Elemente pro Katalog**
- Nur Inhalte mit einer gültigen IMDB-ID werden indexiert

---

## 💡 Ideen in Überlegung

- **Genre-Filterung** — zur Verfeinerung der Kataloge
- **Erweiterte Statistiken** — Diagramme und Visualisierungen

---

## 📖 Blog-Beitrag

[Stremio RSS Catalog: mein RSS-zu-Stremio-Katalog-Addon](https://upandclear.org/2025/11/20/useflow-fr-mon-addon-de-conversion-de-rss-en-catalogues-stremio/) (Französisch)

---

## 📄 Lizenz

GNU GPL v3 — Bitte die Quelle angeben.

**Viel Spaß beim Streamen 🍿**
