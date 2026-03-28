<h1 align="center">
  <img src="src/public/logo.png" alt="Stremio RSS Catalog" width="120"><br>
  Stremio RSS Catalog
</h1>

<p align="center">
  <strong>Turn your RSS feeds into Stremio catalogs — Movies, Documentaries and Series</strong>
</p>

<p align="center">
  <a href="./README.md">🇫🇷 Français</a> · <a href="./README.de.md">🇩🇪 Deutsch</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Stremio-addon-purple?style=flat-square" alt="Stremio">
  <img src="https://img.shields.io/badge/Docker-ready-blue?style=flat-square&logo=docker" alt="Docker">
  <img src="https://img.shields.io/badge/TMDB-matched-green?style=flat-square" alt="TMDB">
  <img src="https://img.shields.io/badge/i18n-FR%20%7C%20EN%20%7C%20DE-orange?style=flat-square" alt="i18n">
</p>

---

<p align="center">
  💡 Use it? Like it? <a href="https://github.com/Aerya/UseFlow-FR/stargazers">⭐ Star it!</a> — it only takes a second.
</p>

---

> A self-hosted Stremio addon that parses your RSS feeds, automatically identifies Movies, Documentaries and Series, matches them on TMDB, and exposes them as catalogs in Stremio.
>
> Currently, only a private Usenet indexer is fully supported. Other feeds may work, but without guarantee.

---

## ✨ What's New

- 🆕 **Renamed**: the addon is now called **Stremio RSS Catalog**
- 📺 **Series support**: automatic detection from release names (`S01E01`, `Season N`…), matched via TMDB's TV API, grouped by title (one entry per show regardless of how many episodes/seasons appear in the feed)

---

## 🎬 Features

| | |
|---|---|
| 📁 **3 catalogs** | Movies · Documentaries · Series |
| 🔍 **Auto detection** | Type identified from release name, or forced per feed |
| 🎯 **TMDB matching** | movie API for films/docs, tv API for series |
| 🖼️ **RPDB** | Rating posters (optional) |
| 🔔 **Discord** | Notifications with poster gallery on each sync |
| 🔄 **Auto sync** | Configurable scheduling |
| 🌐 **WebUI** | Full admin interface, 🇫🇷 🇬🇧 🇩🇪 |
| 🔒 **Proxy** | HTTP / HTTPS / SOCKS4 / SOCKS5 |
| 💾 **SQLite** | Persistent data, incremental content |
| 🐳 **Docker** | Multi-arch image `linux/amd64` + `linux/arm64` |

> Limited to French-language content (FRENCH / MULTi / TRUEFRENCH…)

---

## 🚀 Quick Start

Copy or create [docker-compose.yml](./docker-compose.yml):

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
      - WEBUI_USERNAME=admin        # Change this
      - WEBUI_PASSWORD=admin        # Change this
      - DB_PATH=/data/addon.db
      - SESSION_SECRET=changeme     # openssl rand -hex 32
    labels:
      - com.centurylinklabs.watchtower.enable=true
```

Then open the WebUI at `http://localhost:7973`, configure your RSS feed + TMDB API key, run a first sync, and install the addon in Stremio using the provided URL.

---

## ⚙️ How It Works

### Release Parsing

Each release title is analyzed to extract:
- The **clean name** (technical tags stripped: resolution, codec, language, team…)
- The **year** of release
- The **type**: movie, documentary or series

Series detection relies on patterns `S01E01`, `S01`, `Season N` — the season/episode part is then stripped from the name before the TMDB search.

You can also **force the type per RSS feed** (Movies / Series / Documentaries / Auto) from the WebUI — useful when a feed contains only one type of content.

### TMDB Matching

```
RSS Release  →  Parsing  →  TMDB (movie or tv)  →  IMDB ID  →  Stremio Catalog
```

- Movies and documentaries → `/search/movie` API
- Series → `/search/tv` API
- Only content with a **valid IMDB ID** is added (required by Stremio)
- For series: multiple releases of the same show → **one single entry** in the catalog

### Persistence

Everything is stored in a SQLite database (`data/addon.db`). Content **accumulates** — a sync never replaces existing data.

---

## 🔐 WebUI Login

- **Credentials**: defined in `docker-compose.yml`
- **Session secret**: generate with `openssl rand -hex 32`

---

## 📝 Notes

- The first sync may take several minutes depending on feed size — do it **before** installing the addon in Stremio
- Current limit: **10,000 items per catalog**
- Only content with a valid IMDB ID is indexed

---

## 💡 Ideas Under Consideration

- **Genre filtering** — to refine catalogs
- **Advanced statistics** — charts and visualizations

---

## 📖 Blog Post

[Stremio RSS Catalog: my RSS-to-Stremio-catalogs addon](https://upandclear.org/2025/11/20/useflow-fr-mon-addon-de-conversion-de-rss-en-catalogues-stremio/) (French)

---

## 📄 License

GNU GPL v3 — Please credit the source.

**Happy streaming 🍿**
