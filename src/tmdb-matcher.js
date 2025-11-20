const axios = require('axios');
const { SocksProxyAgent } = require('socks-proxy-agent');

class TMDBMatcher {
  constructor(db) {
    this.db = db;
    this.baseUrl = 'https://api.themoviedb.org/3';
  }

  getApiKey() {
    return this.db.getConfig('tmdb_api_key');
  }

  getAxiosConfig() {
    const config = { timeout: 10000 };

    const proxyEnabled = this.db.getConfig('proxy_enabled') === 'true';

    if (proxyEnabled) {
      const protocol = this.db.getConfig('proxy_protocol') || 'http';
      const host = this.db.getConfig('proxy_host');
      const port = this.db.getConfig('proxy_port');
      const username = this.db.getConfig('proxy_username');
      const password = this.db.getConfig('proxy_password');

      // Only apply proxy if host and port are valid
      if (host && host.trim() !== '' && port && port.trim() !== '') {
        if (protocol.startsWith('socks')) {
          const proxyUrl = username && password
            ? `${protocol}://${username}:${password}@${host}:${port}`
            : `${protocol}://${host}:${port}`;
          config.httpsAgent = new SocksProxyAgent(proxyUrl);
          config.httpAgent = new SocksProxyAgent(proxyUrl);
        } else {
          config.proxy = {
            protocol,
            host,
            port: parseInt(port),
            ...(username && password && { auth: { username, password } })
          };
        }
      } else {
        console.warn('[TMDB] Proxy enabled but host/port not configured, ignoring proxy settings');
      }
    }

    return config;
  }

  async _fetchWithRetry(url, params, config, maxRetries = 3) {
    let retries = 0;
    while (retries < maxRetries) {
      try {
        const response = await axios.get(url, { params, ...config });
        return response;
      } catch (error) {
        if (error.response && error.response.status === 429) {
          const waitTime = 5000; // Attendre 5 secondes
          console.log(`Rate limit exceeded (429). Waiting ${waitTime / 1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          retries++;
        } else {
          throw error;
        }
      }
    }
    throw new Error(`Max retries (${maxRetries}) exceeded for ${url}`);
  }

  async searchMovie(title, year = null) {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      console.log('No TMDB API key configured');
      return null;
    }
    try {
      const params = {
        api_key: apiKey,
        query: title,
        language: 'fr-FR',
        include_adult: true
      };
      if (year) {
        params.year = year;
      }
      const response = await this._fetchWithRetry(
        `${this.baseUrl}/search/movie`,
        params,
        this.getAxiosConfig()
      );
      if (response.data.results && response.data.results.length > 0) {
        const movie = response.data.results[0];
        const externalIds = await this.getExternalIds('movie', movie.id);
        return {
          tmdb_id: movie.id,
          imdb_id: externalIds?.imdb_id || null,
          name: movie.title,
          year: movie.release_date ? movie.release_date.substring(0, 4) : null,
          poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
          background: movie.backdrop_path ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : null,
          description: movie.overview || null,
          genres: movie.genre_ids || [],
          vote_average: movie.vote_average || null
        };
      }
      return null;
    } catch (error) {
      console.error(`Error searching movie ${title}:`, error.message);
      return null;
    }
  }

  async searchTVShow(title, year = null) {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      console.log('No TMDB API key configured');
      return null;
    }
    try {
      const params = {
        api_key: apiKey,
        query: title,
        language: 'fr-FR',
        include_adult: true
      };
      if (year) {
        params.first_air_date_year = year;
      }
      const response = await this._fetchWithRetry(
        `${this.baseUrl}/search/tv`,
        params,
        this.getAxiosConfig()
      );
      if (response.data.results && response.data.results.length > 0) {
        const show = response.data.results[0];
        const externalIds = await this.getExternalIds('tv', show.id);
        return {
          tmdb_id: show.id,
          imdb_id: externalIds?.imdb_id || null,
          name: show.name,
          year: show.first_air_date ? show.first_air_date.substring(0, 4) : null,
          poster: show.poster_path ? `https://image.tmdb.org/t/p/w500${show.poster_path}` : null,
          background: show.backdrop_path ? `https://image.tmdb.org/t/p/original${show.backdrop_path}` : null,
          description: show.overview || null,
          genres: show.genre_ids || [],
          vote_average: show.vote_average || null
        };
      }
      return null;
    } catch (error) {
      console.error(`Error searching TV show ${title}:`, error.message);
      return null;
    }
  }

  async getExternalIds(mediaType, tmdbId) {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;
    try {
      const response = await this._fetchWithRetry(
        `${this.baseUrl}/${mediaType}/${tmdbId}/external_ids`,
        { api_key: apiKey },
        this.getAxiosConfig()
      );
      return response.data;
    } catch (error) {
      console.error(`Error getting external IDs for ${mediaType}/${tmdbId}:`, error.message);
      return null;
    }
  }

  async matchItem(item) {
    try {
      let match = null;
      if (item.type === 'movie') {
        match = await this.searchMovie(item.cleanName, item.year);
      }
      if (match && match.imdb_id) {
        const catalogItem = {
          id: match.imdb_id,
          catalog_type: item.catalog_type,
          imdb_id: match.imdb_id,
          tmdb_id: match.tmdb_id.toString(),
          type: item.type,
          name: match.name,
          year: match.year,
          poster: match.poster,
          background: match.background,
          description: match.description,
          genres: match.genres,
          release_name: item.release_name,
          indexer_rlz_id: item.indexer_rlz_id,
          added_at: Date.now()
        };
        return catalogItem;
      }
      return null;
    } catch (error) {
      console.error(`Error matching item ${item.cleanName}:`, error.message);
      return null;
    }
  }

  async matchBatch(items, onProgress = null) {
    const results = [];
    let matched = 0;
    let failed = 0;
    let alreadyInDb = 0;
    console.log(`Starting batch match for ${items.length} items`);

    if (items.length > 0) {
      console.log('First item sample:', JSON.stringify(items[0], null, 2));
    }

    const checkStmt = this.db.db.prepare('SELECT id FROM catalog_items WHERE indexer_rlz_id = ?');
    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (!item.indexer_rlz_id || !item.cleanName) {
        console.log(`✗ Invalid item: missing indexer_rlz_id or cleanName`, {
          indexer_rlz_id: item.indexer_rlz_id,
          cleanName: item.cleanName,
          release_name: item.release_name
        });
        failed++;
        continue;
      }

      try {
        const existing = checkStmt.get(item.indexer_rlz_id);
        if (existing) {
          matched++;
          alreadyInDb++;
          continue;
        }
      } catch (dbError) {
        console.error(`Database error checking item ${item.cleanName}:`, dbError.message);
        console.error(`indexer_rlz_id value:`, item.indexer_rlz_id);
        failed++;
        continue;
      }

      const match = await this.matchItem(item);

      if (match) {
        const success = this.db.addCatalogItem(match);
        if (success) {
          matched++;
          results.push(match);
          console.log(`✓ Matched: ${item.cleanName} -> ${match.name} (${match.imdb_id})`);
        } else {
          failed++;
          console.log(`✗ Failed to save: ${item.cleanName}`);
        }
      } else {
        failed++;
        console.log(`✗ No match: ${item.cleanName}`);
      }

      if (onProgress) {
        onProgress({
          current: i + 1,
          total: items.length,
          matched,
          failed,
          alreadyInDb
        });
      }

      // Rate limiting: 30 requêtes/seconde
      if (i < items.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 33));
      }
    }
    return { matched, failed, alreadyInDb, results };
  }
}

module.exports = TMDBMatcher;
