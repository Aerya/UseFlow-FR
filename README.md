# UseFlow-FR

Addon Stremio de création de catalogues **Films** et **Documentaires** depuis des flux RSS, avec matching TMDB automatique et interface web de gestion.

![Logo UseFlow-FR](src/public/logo.png)


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

- **Utilisateur par défaut**  : `admin`
- **Mot de passe par défaut** : `admin`  
Mais il est préférable de les adapter dans le docker-compose.yml  
- **Secret Token par défaut** (sécurisation de cookie): `278f898a4fdbecc8cfd904646336d08a32c04afdad664bacdfc5b8334dfb6653`    
Là encore, mieux de créer le vôtre avec `openssl rand -hex 32`


## Notes

- La synchronisation peut prendre plusieurs minutes selon le nombre d'éléments dans les flux RSS,
- Pour l'instant la limite de contenus est fixée à 10.000 items par catalogues,
- Seuls les contenus avec un ID IMDB valide sont ajoutés aux catalogues (fonctionnement de Stremio).


## Fonctionnement technique

### Parsing des releases
L'addon extrait automatiquement :
- Le nom propre du contenu,
- L'année de sortie,
- Le type (film, documentaire).

### Matching TMDB
Pour chaque élément :
1. Recherche sur TMDB avec le nom nettoyé et l'année,
2. Récupération de l'ID IMDB via les external_ids de TMDB,
3. Si un ID IMDB est trouvé → ajout au catalogue,
4. Si aucun ID IMDB → l'élément est ignoré.
Cela garantit que **seuls les contenus compatibles avec les addons de streaming** sont ajoutés.

### Affiches RPDB
Si RPDB est activé :
- Les affiches TMDB sont remplacées par les affiches RPDB,
- Fonctionne dans Stremio ET dans les notifications Discord,
- Fallback automatique sur TMDB si l'affiche RPDB n'existe pas.

### Base de données
Tous les catalogues sont sauvegardés dans une base SQLite (`data/addon.db`). Les données persistent même si :
- Le serveur redémarre,
- Les flux RSS sont modifiés ou coupés,
- Les sources sont temporairement inaccessibles.


## Idées en réflexion, selon motivation et compétences de bibi

- **Support des séries** : Prise en charge des flux RSS de séries TV
- **Support multi-sources** : Compatibilité avec d'autres flux RSS films/documentaires
- **Filtrage par genres** : Pour étoffer un peu la recherche
- **Statistiques avancées** : Graphiques catalogues/sources


## Licence

License GNU GPL v3 - Merci notmment de citer la source.


**Bon streaming :) 🍿**
