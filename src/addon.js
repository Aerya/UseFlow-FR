const { addonBuilder } = require('stremio-addon-sdk');

class StremioAddon {
  constructor(db) {
    this.db = db;
    this.manifest = {
      id: 'community.useflowfr.catalog',
      version: '1.0.0',
      name: 'UseFlow-FR',
      description: 'Catalogues de Films et Documentaires',
      logo: 'https://raw.githubusercontent.com/Aerya/UseFlow-FR/main/src/public/logo.png',
      resources: ['catalog'],
      types: ['movie'],
      idPrefixes: ['tt'], // Support des IDs IMDB
      catalogs: [
        {
          type: 'movie',
          id: 'useflowfr_films',
          name: 'UseFlow-FR Films',
          extra: [
            { name: 'skip', isRequired: false },
            { name: 'search', isRequired: false }
          ]
        },
        {
          type: 'movie',
          id: 'useflowfr_documentaires',
          name: 'UseFlow-FR Documentaires',
          extra: [
            { name: 'skip', isRequired: false },
            { name: 'search', isRequired: false }
          ]
        }
      ]
    };

    this.builder = new addonBuilder(this.manifest);
    this.setupHandlers();
  }

  setupHandlers() {
    this.builder.defineCatalogHandler(async ({ type, id, extra }) => {
      console.log(`Incoming catalog request: type=${type}, id=${id}, extra=${JSON.stringify(extra)}`);

      const catalogMap = {
        'useflowfr_films': 'films',
        'useflowfr_documentaires': 'documentaires'
      };

      const catalogType = catalogMap[id];
      if (!catalogType) {
        return { metas: [] };
      }

      const skip = parseInt(extra?.skip) || 0;
      const limit = 10000;
      let items;

      // Fetch one extra item to detect if there are more pages
      const fetchLimit = limit + 1;

      // Recherche ou listing normal
      if (extra?.search) {
        items = this.db.searchCatalog(catalogType, extra.search, skip, fetchLimit);
      } else {
        // getCatalogItems attend (catalogType, skip, limit)
        items = this.db.getCatalogItems(catalogType, skip, fetchLimit);
      }

      // Check if there are more pages
      const hasMore = items.length > limit;

      // Return only the requested limit
      const itemsToReturn = hasMore ? items.slice(0, limit) : items;

      // Convertir en format meta preview pour Stremio
      const metas = itemsToReturn.map(item => this.itemToMetaPreview(item));

      console.log(`Returning ${metas.length} items for catalog ${id} (skip=${skip}, hasMore=${hasMore})`);

      return { metas };
    });
  }

  async handleCatalog({ type, id, extra }) {
    try {
      console.log(`Catalog request: type=${type}, id=${id}, extra=`, extra);

      // Mapper les IDs de catalogue aux types de catalogue dans la DB
      const catalogMap = {
        'useflowfr_films': 'films',
        'useflowfr_documentaires': 'documentaires'
      };

      const catalogType = catalogMap[id];
      if (!catalogType) {
        return { metas: [] };
      }

      const skip = parseInt(extra?.skip) || 0;
      const limit = 10000;
      let items;

      // Fetch one extra item to detect if there are more pages
      const fetchLimit = limit + 1;

      // Recherche ou listing normal
      if (extra?.search) {
        items = this.db.searchCatalog(catalogType, extra.search, skip, fetchLimit);
      } else {
        // getCatalogItems attend (catalogType, skip, limit)
        items = this.db.getCatalogItems(catalogType, skip, fetchLimit);
      }

      // Check if there are more pages
      const hasMore = items.length > limit;

      // Return only the requested limit
      const itemsToReturn = hasMore ? items.slice(0, limit) : items;

      // Convertir en format meta preview pour Stremio
      const metas = itemsToReturn.map(item => this.itemToMetaPreview(item));

      console.log(`Returning ${metas.length} items for catalog ${id} (skip=${skip}, hasMore=${hasMore})`);

      return { metas };
    } catch (error) {
      console.error('Error in catalog handler:', error);
      return { metas: [] };
    }
  }

  itemToMetaPreview(item) {
    let poster = item.poster || 'https://via.placeholder.com/300x450?text=No+Poster';

    // RPDB Integration
    const rpdbEnabled = this.db.getConfig('rpdb_enabled') === 'true';
    let rpdbKey = this.db.getConfig('rpdb_api_key');

    // Debug RPDB
    if (rpdbEnabled) {
      // console.log(`RPDB Enabled. Key present: ${!!rpdbKey}. Item ID: ${item.imdb_id}`);
    }

    if (rpdbEnabled && rpdbKey && item.imdb_id) {
      rpdbKey = rpdbKey.trim();
      // Use 'imdb' type as we have the IMDB ID
      poster = `https://api.ratingposterdb.com/${rpdbKey}/imdb/poster-default/${item.imdb_id}.jpg?fallback=true`;
      console.log(`[RPDB] Generated poster URL: ${poster}`);
    }

    const meta = {
      id: item.imdb_id,
      type: item.type,
      name: item.name,
      poster: poster
    };

    if (item.year) {
      meta.releaseInfo = item.year;
    }

    if (item.genres && item.genres.length > 0) {
      // Mapper les genre IDs TMDB vers des noms (simplifiés)
      const genreMap = {
        28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
        80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
        14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
        9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie',
        53: 'Thriller', 10752: 'War', 37: 'Western',
        // TV genres
        10759: 'Action & Adventure', 10762: 'Kids', 10763: 'News',
        10764: 'Reality', 10765: 'Sci-Fi & Fantasy', 10766: 'Soap',
        10767: 'Talk', 10768: 'War & Politics'
      };

      meta.genres = item.genres.map(id => genreMap[id] || 'Unknown').filter(g => g !== 'Unknown');
    }

    // Ajouter le nom de release en description si pas de description TMDB
    if (!item.description && item.release_name) {
      meta.description = `Release: ${item.release_name}`;
    } else if (item.description) {
      meta.description = item.description;
    }

    if (item.background) {
      meta.background = item.background;
    }

    return meta;
  }

  getInterface() {
    return this.builder.getInterface();
  }
}

module.exports = StremioAddon;
