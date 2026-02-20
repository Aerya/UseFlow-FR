<h1 align="center">UseFlow-FR</h1>

<p align="center">
  <a href="./README.md">🇫🇷 Français</a> · <a href="./README.de.md">🇩🇪 Deutsch</a>
</p>

A Stremio addon for creating **Movies** and **Documentaries** catalogs from RSS feeds, with automatic TMDB matching and a web management interface.

Currently, only a private Usenet indexer is fully supported. I plan to integrate other RSS feeds in the future — some may already work, but I cannot guarantee reliability.


<p align="center">
  <img src="src/public/logo.png" alt="UseFlow-FR Logo" width="250">
</p>

## Blog post with screenshots
[UseFlow-FR: my RSS-to-Stremio-catalogs addon](https://upandclear.org/2025/11/20/useflow-fr-mon-addon-de-conversion-de-rss-en-catalogues-stremio/) (French)


## Features

- ✅ **2 separate catalogs**: Movies and Documentaries
- ✅ **Automatic TMDB matching**: Fetches metadata (posters, synopsis, genres, etc.)
- ✅ **RPDB support**: Custom posters with Rating Poster Database (optional)
- ✅ **IMDB ID support**: Compatible with all Stremio streaming addons
- ✅ **Full WebUI**: Modern administration interface with authentication
- ✅ **Internationalization**: Interface available in 🇫🇷 French, 🇬🇧 English and 🇩🇪 German
- ✅ **Multiple RSS feeds**: Add as many RSS feeds as needed
- ✅ **Discord notifications**: Sync alerts with poster gallery (optional)
- ✅ **Proxy management**: HTTP/HTTPS/SOCKS4/SOCKS5 support with or without authentication (optional)
- ✅ **Persistent storage**: SQLite database with all catalogs and incremental content (items are added, never replaced)
- ✅ **Automatic synchronization**: Configurable scheduling (optional)
- ✅ **Dockerized**: Easy deployment with Docker and docker-compose
- ✅ **Built-in search**: Search catalogs directly from Stremio
- ✅ **Sync history**: Detailed tracking of all synchronizations

Limited to content available in French (VF).

## WebUI Login

- **Username and password**: Set in docker-compose
- **Secret Token** (cookie security): Generate with `openssl rand -hex 32` and set in docker-compose


## Notes

- Synchronization may take several minutes depending on the number of items in RSS feeds, especially the first time BEFORE adding the addon to Stremio
- Content limit is currently set to 10,000 items per catalog
- Only content with a valid IMDB ID is added to catalogs (Stremio requirement)


## Technical Overview

### Release Parsing
The addon automatically extracts:
- The clean content name
- The release year
- The type (movie, documentary)

### TMDB Matching
For each item:
1. Search TMDB with the cleaned name and year
2. Retrieve the IMDB ID via TMDB's external_ids
3. If an IMDB ID is found → added to catalog
4. If no IMDB ID → item is skipped
This ensures that **only content compatible with streaming addons** is added.

### RPDB Posters
If RPDB is enabled:
- TMDB posters are replaced with RPDB posters
- Works in Stremio AND in Discord notifications
- Automatic fallback to TMDB if the RPDB poster doesn't exist

### Database
All catalogs are saved in an SQLite database (`data/addon.db`). Data persists even if:
- The server restarts
- RSS feeds are modified or unavailable
- Sources are temporarily unreachable


### Getting Started

Copy or create [the docker-compose.yml](./docker-compose.yml)
```yaml
services:
  useflow-fr:
    image: ghcr.io/aerya/useflow-fr:latest
    container_name: useflow-fr
    restart: always
    ports:
      - "7973:7000"
    volumes:
    # Adapt to your configuration: /home/<your_name>/useflow-fr/:/data
      - /home/aerya/docker/useflow-fr/:/data
    environment:
      - PORT=7000
      - NODE_ENV=production
      # You should change these
      - WEBUI_USERNAME=admin
      - WEBUI_PASSWORD=admin
      # Usually no need to change
      - DB_PATH=/data/addon.db
      # Generate with openssl rand -hex 32
      - SESSION_SECRET=278f898a4fdbecc8cfd904646336d08a32c04afdad664bacdfc5b8334dfb6653
    labels:
      - com.centurylinklabs.watchtower.enable=true

```

### Ideas Under Consideration
Depending on motivation and skills

- **Series support**: TV series RSS feed processing
- **Genre filtering**: To enhance search capabilities
- **Advanced statistics**: Catalog/source graphs


## License

GNU GPL v3 License - Please credit the source.


**Happy streaming :) 🍿**
