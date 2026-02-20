const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class DatabaseManager {
  constructor(dbPath) {
    // Créer le répertoire si nécessaire
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.initTables();
  }

  initTables() {
    // Table de configuration
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    // Table des catalogues
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS catalog_items (
        id TEXT PRIMARY KEY,
        catalog_type TEXT NOT NULL,
        imdb_id TEXT,
        tmdb_id TEXT,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        year TEXT,
        poster TEXT,
        background TEXT,
        description TEXT,
        genres TEXT,
        release_name TEXT NOT NULL,
        indexer_rlz_id TEXT NOT NULL,
        added_at INTEGER NOT NULL,
        UNIQUE(indexer_rlz_id)
      )
    `);

    // Table de l'historique des synchronisations
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sync_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        started_at INTEGER NOT NULL,
        finished_at INTEGER,
        total_items INTEGER NOT NULL,
        matched_items INTEGER NOT NULL,
        failed_items INTEGER NOT NULL,
        already_in_db INTEGER DEFAULT 0,
        films_added INTEGER DEFAULT 0,
        documentaires_added INTEGER DEFAULT 0,
        status TEXT NOT NULL,
        error_message TEXT
      )
    `);

    // Table des logs de synchronisation


    // Index pour recherche rapide
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_catalog_type ON catalog_items(catalog_type);
      CREATE INDEX IF NOT EXISTS idx_imdb_id ON catalog_items(imdb_id);
      CREATE INDEX IF NOT EXISTS idx_type ON catalog_items(type);
      CREATE INDEX IF NOT EXISTS idx_added_at ON catalog_items(added_at);
    `);

    // Add vote_average column if it doesn't exist (migration)
    try {
      this.db.exec(`ALTER TABLE catalog_items ADD COLUMN vote_average REAL`);
    } catch (e) {
      // Column already exists, ignore
    }

    // Initialiser la config par défaut
    this.initDefaultConfig();
  }

  initDefaultConfig() {
    const defaults = {
      rss_films_url: '',
      rss_additional_urls: '[]',
      tmdb_api_key: '',
      proxy_enabled: 'false',
      proxy_host: '',
      proxy_port: '',
      proxy_username: '',
      proxy_password: '',
      proxy_protocol: 'http',
      refresh_interval: '180',
      auto_refresh_enabled: 'false',
      last_sync_films: '0',
      discord_webhook_url: '',
      discord_notifications_enabled: 'false',
      discord_enhanced_notifications_enabled: 'false',
      discord_rpdb_posters_enabled: 'false',
      rpdb_enabled: 'false',
      rpdb_api_key: ''
    };

    const stmt = this.db.prepare('INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)');
    for (const [key, value] of Object.entries(defaults)) {
      stmt.run(key, value);
    }
  }

  getConfig(key) {
    const row = this.db.prepare('SELECT value FROM config WHERE key = ?').get(key);
    return row ? row.value : null;
  }

  setConfig(key, value) {
    const stmt = this.db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)');
    stmt.run(key, value);
  }

  getAllConfig() {
    const rows = this.db.prepare('SELECT key, value FROM config').all();
    return rows.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
  }

  addCatalogItem(item) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO catalog_items
      (id, catalog_type, imdb_id, tmdb_id, type, name, year, poster, background, description,
        genres, release_name, indexer_rlz_id, added_at, vote_average)
    VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

    try {
      // Validation des champs requis
      if (!item.id || !item.catalog_type || !item.type || !item.name || !item.release_name || !item.indexer_rlz_id) {
        console.error('Missing required fields in catalog item:', {
          id: item.id,
          catalog_type: item.catalog_type,
          type: item.type,
          name: item.name,
          release_name: item.release_name,
          indexer_rlz_id: item.indexer_rlz_id
        });
        return false;
      }

      stmt.run(
        item.id,
        item.catalog_type,
        item.imdb_id || null,
        item.tmdb_id || null,
        item.type,
        item.name,
        item.year || null,
        item.poster || null,
        item.background || null,
        item.description || null,
        item.genres ? JSON.stringify(item.genres) : null,
        item.release_name,
        item.indexer_rlz_id,
        item.added_at || Date.now(),
        item.vote_average || null
      );
      return true;
    } catch (error) {
      console.error('Error adding catalog item:', error.message);
      console.error('Item data:', JSON.stringify(item, null, 2));
      return false;
    }
  }

  getCatalogItems(catalogType, skip = 0, limit = 100) {
    const stmt = this.db.prepare(`
    SELECT * FROM catalog_items 
      WHERE catalog_type = ? AND imdb_id IS NOT NULL
      ORDER BY added_at DESC
    LIMIT ? OFFSET ?
      `);

    const rows = stmt.all(catalogType, Number(limit), Number(skip));
    return rows.map(row => ({
      ...row,
      genres: row.genres ? JSON.parse(row.genres) : []
    }));
  }

  getItemByImdbId(imdbId) {
    const stmt = this.db.prepare('SELECT * FROM catalog_items WHERE imdb_id = ?');
    const row = stmt.get(imdbId);
    if (row && row.genres) {
      row.genres = JSON.parse(row.genres);
    }
    return row;
  }

  searchCatalog(catalogType, query, skip = 0, limit = 20) {
    const stmt = this.db.prepare(`
      SELECT * FROM catalog_items 
      WHERE catalog_type = ? AND imdb_id IS NOT NULL
    AND(name LIKE ? OR release_name LIKE ?)
      ORDER BY added_at DESC
    LIMIT ? OFFSET ?
      `);

    const searchTerm = `% ${query}% `;
    const rows = stmt.all(catalogType, searchTerm, searchTerm, Number(limit), Number(skip));
    return rows.map(row => ({
      ...row,
      genres: row.genres ? JSON.parse(row.genres) : []
    }));
  }

  getCatalogCount(catalogType) {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM catalog_items WHERE catalog_type = ? AND imdb_id IS NOT NULL');
    const row = stmt.get(catalogType);
    return row ? row.count : 0;
  }

  deleteOldItems(daysOld = 30) {
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    const stmt = this.db.prepare('DELETE FROM catalog_items WHERE added_at < ?');
    const result = stmt.run(cutoffTime);
    return result.changes;
  }

  // Méthodes pour l'historique des syncs
  createSyncHistory(totalItems) {
    const stmt = this.db.prepare(`
      INSERT INTO sync_history(started_at, total_items, matched_items, failed_items, already_in_db, status)
    VALUES(?, ?, 0, 0, 0, 'running')
    `);
    const result = stmt.run(Date.now(), totalItems);
    return result.lastInsertRowid;
  }

  updateSyncHistory(syncId, data) {
    const fields = [];
    const values = [];

    if (data.matched_items !== undefined) {
      fields.push('matched_items = ?');
      values.push(data.matched_items);
    }
    if (data.failed_items !== undefined) {
      fields.push('failed_items = ?');
      values.push(data.failed_items);
    }
    if (data.already_in_db !== undefined) {
      fields.push('already_in_db = ?');
      values.push(data.already_in_db);
    }
    if (data.films_added !== undefined) {
      fields.push('films_added = ?');
      values.push(data.films_added);
    }
    if (data.documentaires_added !== undefined) {
      fields.push('documentaires_added = ?');
      values.push(data.documentaires_added);
    }
    if (data.status) {
      fields.push('status = ?');
      values.push(data.status);
    }
    if (data.error_message) {
      fields.push('error_message = ?');
      values.push(data.error_message);
    }
    if (data.finished_at !== undefined) {
      fields.push('finished_at = ?');
      values.push(data.finished_at);
    }

    if (fields.length === 0) return;

    values.push(syncId);
    const stmt = this.db.prepare(`UPDATE sync_history SET ${fields.join(', ')} WHERE id = ? `);
    stmt.run(...values);
  }

  getSyncHistory(limit = 10) {
    const stmt = this.db.prepare(`
      SELECT * FROM sync_history 
      ORDER BY started_at DESC
    LIMIT ?
      `);
    return stmt.all(limit);
  }

  getLatestSync() {
    const stmt = this.db.prepare('SELECT * FROM sync_history ORDER BY started_at DESC LIMIT 1');
    return stmt.get();
  }

  getSyncHistoryDates() {
    const stmt = this.db.prepare(`
      SELECT
    DATE(started_at / 1000, 'unixepoch') as date,
      COUNT(*) as count
      FROM sync_history 
      GROUP BY date 
      ORDER BY date DESC
      `);
    return stmt.all();
  }

  getSyncHistoryByDate(date) {
    const stmt = this.db.prepare(`
    SELECT * FROM sync_history 
      WHERE DATE(started_at / 1000, 'unixepoch') = ?
      ORDER BY started_at DESC
        `);
    return stmt.all(date);
  }

  getRecentCatalogAdditions(catalogType, limit = 5) {
    const stmt = this.db.prepare(`
      SELECT * FROM catalog_items 
      WHERE catalog_type = ? AND imdb_id IS NOT NULL
      ORDER BY added_at DESC
      LIMIT ?
    `);

    const rows = stmt.all(catalogType, limit);
    return rows.map(row => ({
      ...row,
      genres: row.genres ? JSON.parse(row.genres) : []
    }));
  }



  close() {
    this.db.close();
  }
}

module.exports = DatabaseManager;
