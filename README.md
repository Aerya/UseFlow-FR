<h1 align="center">
  <img src="src/public/logo.png" alt="Stremio RSS Catalog" width="120"><br>
  Stremio RSS Catalog
</h1>

<p align="center">
  <strong>Transformez vos flux RSS en catalogues Stremio — Films, Documentaires et Séries</strong>
</p>

<p align="center">
  <a href="./README.en.md">🇬🇧 English</a> · <a href="./README.de.md">🇩🇪 Deutsch</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Stremio-addon-purple?style=flat-square" alt="Stremio">
  <img src="https://img.shields.io/badge/Docker-ready-blue?style=flat-square&logo=docker" alt="Docker">
  <img src="https://img.shields.io/badge/TMDB-matched-green?style=flat-square" alt="TMDB">
  <img src="https://img.shields.io/badge/i18n-FR%20%7C%20EN%20%7C%20DE-orange?style=flat-square" alt="i18n">
</p>

---

<p align="center">
  💡 Vous l'utilisez ? Vous l'aimez ? <a href="https://github.com/Aerya/UseFlow-FR/stargazers">⭐ Mettez une étoile !</a> — ça prend une seconde.
</p>

---

> Addon Stremio auto-hébergé qui parse vos flux RSS, identifie automatiquement Films, Documentaires et Séries, les matche sur TMDB et les expose comme catalogues dans Stremio.
>
> Pour l'instant, seul un indexeur Usenet privé est pleinement supporté. D'autres flux peuvent fonctionner, mais sans garantie.

---

## ✨ Nouveautés

- 🆕 **Renommé** : l'addon s'appelle désormais **Stremio RSS Catalog**
- 📺 **Support des Séries** : détection automatique depuis le nom de release (`S01E01`, `Saison N`…), matching via l'API TV de TMDB, regroupement par titre (une seule fiche par série, peu importe le nombre d'épisodes/saisons dans le flux)

---

## 🎬 Fonctionnalités

| | |
|---|---|
| 📁 **3 catalogues** | Films · Documentaires · Séries |
| 🔍 **Détection automatique** | Type identifié depuis le nom de release |
| 🎯 **Matching TMDB** | API movie pour films/docs, API tv pour séries |
| 🖼️ **RPDB** | Affiches avec notes intégrées (optionnel) |
| 🔔 **Discord** | Notifications avec galerie d'affiches à chaque sync |
| 🔄 **Sync auto** | Planification configurable |
| 🌐 **WebUI** | Interface d'administration complète, 🇫🇷 🇬🇧 🇩🇪 |
| 🔒 **Proxy** | HTTP / HTTPS / SOCKS4 / SOCKS5 |
| 💾 **SQLite** | Données persistantes, contenu incrémental |
| 🐳 **Docker** | Image multi-arch `linux/amd64` + `linux/arm64` |

> Limité aux contenus disponibles en VF (FRENCH / MULTi / TRUEFRENCH…)

---

## 🚀 Démarrage rapide

Copier ou créer [le docker-compose.yml](./docker-compose.yml) :

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
      - WEBUI_USERNAME=admin        # À changer
      - WEBUI_PASSWORD=admin        # À changer
      - DB_PATH=/data/addon.db
      - SESSION_SECRET=changeme     # openssl rand -hex 32
    labels:
      - com.centurylinklabs.watchtower.enable=true
```

Puis ouvrir la WebUI sur `http://localhost:7973`, configurer le flux RSS + la clé TMDB, lancer une première synchronisation, et installer l'addon dans Stremio avec l'URL fournie.

---

## ⚙️ Fonctionnement

### Parsing des releases

Chaque titre de release est analysé pour en extraire :
- Le **nom propre** (suppression des tags : résolution, codec, langue, équipe…)
- L'**année** de sortie
- Le **type** : film, documentaire ou série

La détection série repose sur les patterns `S01E01`, `S01`, `Saison N`, `Season N` — la partie saison/épisode est ensuite retirée du nom avant la recherche TMDB.

### Matching TMDB

```
Release RSS  →  Parsing  →  TMDB (movie ou tv)  →  ID IMDB  →  Catalogue Stremio
```

- Films et documentaires → API `/search/movie`
- Séries → API `/search/tv`
- Seuls les contenus avec un **ID IMDB valide** sont ajoutés (requis par Stremio)
- Pour les séries : plusieurs releases du même show → **une seule fiche** dans le catalogue

### Persistance

Tout est stocké dans une base SQLite (`data/addon.db`). Les contenus s'**accumulent** — une sync ne remplace jamais les données existantes.

---

## 🔐 Connexion WebUI

- **Identifiants** : définis dans le `docker-compose.yml`
- **Session secret** : générer avec `openssl rand -hex 32`

---

## 📝 Notes

- La 1ère synchronisation peut prendre plusieurs minutes selon la taille du flux RSS — à faire **avant** d'installer l'addon dans Stremio
- Limite actuelle : **10 000 items par catalogue**
- Seuls les contenus avec un ID IMDB sont indexés

---

## 💡 Idées en réflexion

- **Filtrage par genres** — pour affiner les catalogues
- **Statistiques avancées** — graphiques et visualisations

---

## 📖 Article de blog

[Stremio RSS Catalog : mon addon de conversion de RSS en catalogues Stremio](https://upandclear.org/2025/11/20/useflow-fr-mon-addon-de-conversion-de-rss-en-catalogues-stremio/)

---

## 📄 Licence

GNU GPL v3 — Merci de citer la source.

**Bon streaming 🍿**
