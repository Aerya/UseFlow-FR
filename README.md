<p align="center">
  <strong>UseFlow-FR  </strong>
</p>

Addon Stremio de création de catalogues **Films** et **Documentaires** depuis des flux RSS, avec matching TMDB automatique et interface web de gestion.
Pour l’instant, seul un indexeur Usenet privé est pleinement supporté. D’autres sources seront ajoutées prochainement.Les autres indexeurs peuvent fonctionner, mais je ne peux pas en garantir la fiabilité pour l’instant.


<p align="center">
  <img src="src/public/logo.png" alt="Logo UseFlow-FR" width="150">
</p>


## Fonctionnalités

- ✅ **2 catalogues séparés** : Films et Documentaires
- ✅ **Matching TMDB automatique** : Recherche et récupération des métadonnées (posters, synopsis, genres, etc.)
- ✅ **Support RPDB** : Affiches personnalisées avec Rating Poster Database (optionnel)
- ✅ **Support des IDs IMDB** : Compatible avec tous les addons de streaming Stremio
- ✅ **WebUI complète** : Interface d'administration moderne avec authentification
- ✅ **Notifications Discord** : Alertes de synchronisation avec galerie d'affiches (optionnel)
- ✅ **Gestion du proxy** : Support HTTP/HTTPS/SOCKS4/SOCKS5 avec ou sans authentification (optionnel)
- ✅ **Sauvegarde persistante** : Base de données SQLite avec tous les catalogues
- ✅ **Synchronisation automatique** : Planification horaire configurable (optionnel)
- ✅ **Dockerisé** : Déploiement facile avec Docker et docker-compose
- ✅ **Recherche intégrée** : Recherche dans les catalogues depuis Stremio
- ✅ **Historique de synchronisation** : Suivi détaillé de toutes les synchros


## Connexion à la WebUI

- **Utilisateur et mot de passe** à adapter dans le docker-compose
- **Secret Token** (sécurisation de cookie) à adapter dans le docker-compose avec `openssl rand -hex 32`


## Notes

- La synchronisation peut prendre plusieurs minutes selon le nombre d'éléments dans les flux RSS, notamment la 1ère fois AVANT d'ajouter l'addon à Stremio
- Pour l'instant la limite de contenus est fixée à 10.000 items par catalogues
- Seuls les contenus avec un ID IMDB valide sont ajoutés aux catalogues (fonctionnement de Stremio)


## Fonctionnement technique

### Parsing des releases
L'addon extrait automatiquement :
- Le nom propre du contenu
- L'année de sortie
- Le type (film, documentaire)

### Matching TMDB
Pour chaque élément :
1. Recherche sur TMDB avec le nom nettoyé et l'année
2. Récupération de l'ID IMDB via les external_ids de TMDB
3. Si un ID IMDB est trouvé → ajout au catalogue
4. Si aucun ID IMDB → l'élément est ignoré
Cela garantit que **seuls les contenus compatibles avec les addons de streaming** sont ajoutés.

### Affiches RPDB
Si RPDB est activé :
- Les affiches TMDB sont remplacées par les affiches RPDB
- Fonctionne dans Stremio ET dans les notifications Discord
- Fallback automatique sur TMDB si l'affiche RPDB n'existe pas

### Base de données
Tous les catalogues sont sauvegardés dans une base SQLite (`data/addon.db`). Les données persistent même si :
- Le serveur redémarre
- Les flux RSS sont modifiés ou coupés
- Les sources sont temporairement inaccessibles


### Pour le lancer

Copier ou créer le docker-compose.yml
```
services:
  useflow-fr:
    image: ghcr.io/aerya/useflow-fr:latest
    container_name: useflow-fr
    restart: always
    ports:
      - "7973:7000"
    volumes:
    # A adapter à votre configuration : /home/<votre_nom>/useflow-fr/:/data
      - /home/aerya/docker/useflow-fr/:/data
    environment:
      - PORT=7000
      - NODE_ENV=production
      # C'est mieux de les modifier
      - WEBUI_USERNAME=admin
      - WEBUI_PASSWORD=admin
      # Normalement à ne pas modifier
      - DB_PATH=/data/addon.db
      # A générer avec openssl rand -hex 32
      - SESSION_SECRET=278f898a4fdbecc8cfd904646336d08a32c04afdad664bacdfc5b8334dfb6653
    labels:
      - com.centurylinklabs.watchtower.enable=true

```

### Idées en réflexion
selon motivation et compétences de bibi

- **Support des séries** : Prise en charge des flux RSS de séries TV
- **Support multi-sources** : Compatibilité avec d'autres flux RSS films/documentaires
- **Filtrage par genres** : Pour étoffer un peu la recherche
- **Statistiques avancées** : Graphiques catalogues/sources


## Licence

License GNU GPL v3 - Merci notmment de citer la source.


**Bon streaming :) 🍿**
