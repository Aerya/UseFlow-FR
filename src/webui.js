const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const path = require('path');
const { sendDiscordNotification } = require('./services/discordService');

class WebUI {
  constructor(db, rssParser, tmdbMatcher, stremioAddon) {
    this.db = db;
    this.rssParser = rssParser;
    this.tmdbMatcher = tmdbMatcher;
    this.stremioAddon = stremioAddon;
    this.app = express();
    this.syncInProgress = false;
    this.syncStatus = null;
    this.autoRefreshInterval = null;

    this.setupMiddleware();
    this.setupRoutes();
    this.startAutoRefresh();
  }

  setupMiddleware() {
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
      }
      next();
    });
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: true }));

    this.app.use(session({
      secret: process.env.SESSION_SECRET || 'useflowfr-addon-secret-change-me',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false,
        maxAge: 24 * 60 * 60 * 1000
      }
    }));
    this.app.use('/static', express.static(path.join(__dirname, 'public')));
  }

  authMiddleware(req, res, next) {
    if (req.session.authenticated) {
      next();
    } else {
      res.status(401).json({ error: 'Non authentifié' });
    }
  }

  setupRoutes() {
    this.app.get('/', (req, res) => {
      if (req.session.authenticated) {
        res.redirect('/dashboard');
      } else {
        res.send(this.getLoginPage());
      }
    });

    this.app.post('/api/login', async (req, res) => {
      const { username, password } = req.body;
      const validUsername = process.env.WEBUI_USERNAME || 'admin';
      const validPassword = process.env.WEBUI_PASSWORD || 'changeme';

      if (username === validUsername && password === validPassword) {
        req.session.authenticated = true;
        res.json({ success: true });
      } else {
        res.status(401).json({ error: 'Identifiants incorrects' });
      }
    });

    this.app.post('/api/logout', (req, res) => {
      req.session.destroy();
      res.json({ success: true });
    });

    this.app.get('/dashboard', (req, res) => {
      if (!req.session.authenticated) {
        return res.redirect('/');
      }
      res.send(this.getDashboardPage());
    });

    this.app.get('/api/config', this.authMiddleware.bind(this), (req, res) => {
      const config = this.db.getAllConfig();
      res.json(config);
    });

    this.app.post('/api/config', this.authMiddleware.bind(this), (req, res) => {
      try {
        const config = req.body;
        for (const [key, value] of Object.entries(config)) {
          // if ((key === 'rss_films_url' || key === 'tmdb_api_key' || key === 'rpdb_api_key') && value === '***') {
          //   continue;
          // }
          this.db.setConfig(key, value);
        }
        this.startAutoRefresh();
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/stats', this.authMiddleware.bind(this), (req, res) => {
      const stats = {
        films: this.db.getCatalogCount('films'),
        documentaires: this.db.getCatalogCount('documentaires'),
        total: 0
      };
      stats.total = stats.films + stats.documentaires;
      res.json(stats);
    });

    this.app.post('/api/sync', this.authMiddleware.bind(this), async (req, res) => {
      if (this.syncInProgress) {
        return res.status(409).json({ error: 'Synchronisation déjà en cours' });
      }
      const rssUrl = this.db.getConfig('rss_films_url');
      const tmdbKey = this.db.getConfig('tmdb_api_key');
      if (!rssUrl || !tmdbKey) {
        return res.status(400).json({ error: 'Configuration RSS et TMDB requise' });
      }

      // Store base URL for Discord notification
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
      const host = req.headers['x-forwarded-host'] || req.headers.host || req.hostname;
      this.baseUrl = `${protocol}://${host}`;

      this.syncInProgress = true;
      this.syncStatus = {
        running: true,
        stage: 'Démarrage...',
        progress: 0,
        total: 0,
        matched: 0,
        failed: 0
      };
      res.json({ success: true, message: 'Synchronisation démarrée' });
      this.runSync().catch(error => {
        console.error('Sync error:', error);
        this.syncStatus.error = error.message;
      }).finally(() => {
        this.syncInProgress = false;
      });
    });

    this.app.get('/api/sync/status', this.authMiddleware.bind(this), (req, res) => {
      res.json(this.syncStatus || { running: false });
    });

    // API: Get sync history
    this.app.get('/api/sync/history', this.authMiddleware.bind(this), (req, res) => {
      const limit = parseInt(req.query.limit) || 3;
      const history = this.db.getSyncHistory(limit);
      res.json(history);
    });

    // API: Get sync history dates
    this.app.get('/api/sync/history/dates', this.authMiddleware.bind(this), (req, res) => {
      const dates = this.db.getSyncHistoryDates();
      res.json(dates);
    });

    // API: Get sync history by date
    this.app.get('/api/sync/history/by-date', this.authMiddleware.bind(this), (req, res) => {
      const date = req.query.date;
      if (!date) {
        return res.status(400).json({ error: 'Date required' });
      }
      const history = this.db.getSyncHistoryByDate(date);
      res.json(history);
    });




    this.app.get('/manifest.json', (req, res) => {
      res.json(this.stremioAddon.manifest);
    });

    this.app.get('/catalog/:type/:id.json', async (req, res) => {
      try {
        const result = await this.stremioAddon.handleCatalog({
          type: req.params.type,
          id: req.params.id,
          extra: req.query
        });
        res.json(result);
      } catch (error) {
        console.error('Catalog error:', error);
        res.status(500).json({ metas: [] });
      }
    });
  }



  async runSync() {
    let syncId = null;
    const startTime = Date.now();
    const catalogsBefore = {
      films: this.db.getCatalogCount('films'),
      documentaires: this.db.getCatalogCount('documentaires')
    };

    try {
      this.syncStatus.stage = 'Récupération des flux RSS...';

      const rssData = await this.rssParser.parseAll();

      console.log('RSS fetched - Films: ' + rssData.films.length);

      const allItems = [...rssData.films];
      if (allItems.length === 0) {
        this.syncStatus.stage = 'Aucun item trouvé';
        this.syncStatus.running = false;
        this.syncStatus.error = 'Aucun item trouvé dans les flux RSS';
        console.log('No items found in RSS feeds');
        return;
      }
      syncId = this.db.createSyncHistory(allItems.length);

      this.syncStatus.total = allItems.length;
      this.syncStatus.stage = 'Matching TMDB...';
      console.log('Starting TMDB matching for ' + allItems.length + ' items...');
      const result = await this.tmdbMatcher.matchBatch(allItems, (progress) => {
        this.syncStatus.progress = progress.current;
        this.syncStatus.matched = progress.matched;
        this.syncStatus.failed = progress.failed;
        this.syncStatus.alreadyInDb = progress.alreadyInDb || 0;
      });

      const catalogsAfter = {
        films: this.db.getCatalogCount('films'),
        documentaires: this.db.getCatalogCount('documentaires')
      };

      const filmsAdded = catalogsAfter.films - catalogsBefore.films;
      const documentairesAdded = catalogsAfter.documentaires - catalogsBefore.documentaires;

      this.db.updateSyncHistory(syncId, {
        matched_items: result.matched,
        failed_items: result.failed,
        already_in_db: result.alreadyInDb || 0,
        films_added: filmsAdded,
        documentaires_added: documentairesAdded,
        status: 'completed',
        finished_at: Date.now()
      });

      const duration = Math.round((Date.now() - startTime) / 1000);

      this.syncStatus.stage = 'Terminée';
      this.syncStatus.running = false;
      this.syncStatus.completed = true;
      this.syncStatus.filmsAdded = filmsAdded;
      this.syncStatus.documentairesAdded = documentairesAdded;

      console.log('Sync completed:', result);

      // Send Discord notification if enabled
      const discordEnabled = this.db.getConfig('discord_notifications_enabled') === 'true';
      const webhookUrl = this.db.getConfig('discord_webhook_url');
      if (discordEnabled && webhookUrl) {
        const notificationData = {
          status: 'completed',
          filmsAdded,
          documentairesAdded,
          totalFilms: catalogsAfter.films,
          totalDocs: catalogsAfter.documentaires,
          matched: result.matched,
          failed: result.failed,
          duration,
          installUrl: this.baseUrl ? `${this.baseUrl}/manifest.json` : null,
          rpdbEnabled: this.db.getConfig('discord_rpdb_posters_enabled') === 'true',
          rpdbKey: this.db.getConfig('rpdb_api_key')
        };

        // Add recent additions if enhanced notifications are enabled
        const enhancedEnabled = this.db.getConfig('discord_enhanced_notifications_enabled') === 'true';
        if (enhancedEnabled && (filmsAdded > 0 || documentairesAdded > 0)) {
          notificationData.recentAdditions = {
            films: filmsAdded > 0 ? this.db.getRecentCatalogAdditions('films', 5) : [],
            documentaires: documentairesAdded > 0 ? this.db.getRecentCatalogAdditions('documentaires', 5) : []
          };
        }

        await sendDiscordNotification(webhookUrl, notificationData);
      }
    } catch (error) {
      console.error('Sync error:', error);
      console.error('Stack trace:', error.stack);
      this.syncStatus.stage = 'Erreur';
      this.syncStatus.error = error.message;
      this.syncStatus.running = false;

      if (syncId) {
        this.db.updateSyncHistory(syncId, {
          status: 'error',
          error_message: error.message,
          finished_at: Date.now()
        });
      }

      // Send Discord error notification if enabled
      const discordEnabled = this.db.getConfig('discord_notifications_enabled') === 'true';
      const webhookUrl = this.db.getConfig('discord_webhook_url');
      if (discordEnabled && webhookUrl) {
        const duration = Math.round((Date.now() - startTime) / 1000);
        await sendDiscordNotification(webhookUrl, {
          status: 'error',
          errorMessage: error.message,
          duration,
          installUrl: this.baseUrl ? `${this.baseUrl}/manifest.json` : null
        });
      }
    }
  }

  getLoginPage() {
    return '<!DOCTYPE html>' +
      '<html lang="fr">' +
      '<head>' +
      '    <meta charset="UTF-8">' +
      '    <meta name="viewport" content="width=device-width, initial-scale=1.0">' +
      '    <title>UseFlow-FR - Login</title>' +
      '    <style>' +
      '        * { margin: 0; padding: 0; box-sizing: border-box; }' +
      '        body {' +
      '            font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Oxygen, Ubuntu, sans-serif;' +
      '            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);' +
      '            min-height: 100vh;' +
      '            display: flex;' +
      '            align-items: center;' +
      '            justify-content: center;' +
      '            padding: 20px;' +
      '        }' +
      '        .login-container {' +
      '            background: white;' +
      '            border-radius: 16px;' +
      '            box-shadow: 0 20px 60px rgba(0,0,0,0.3);' +
      '            padding: 40px;' +
      '            width: 100%;' +
      '            max-width: 400px;' +
      '            text-align: center;' +
      '            position: relative;' +
      '        }' +
      '        .login-logo {' +
      '            width: 120px;' +
      '            height: 120px;' +
      '            margin-bottom: 20px;' +
      '            border-radius: 15px;' +
      '            box-shadow: 0 4px 15px rgba(0,0,0,0.1);' +
      '        }' +
      '        h1 {' +
      '            color: #333;' +
      '            margin-bottom: 10px;' +
      '            font-size: 28px;' +
      '        }' +
      '        .subtitle {' +
      '            color: #666;' +
      '            margin-bottom: 30px;' +
      '            font-size: 14px;' +
      '        }' +
      '        .form-group {' +
      '            margin-bottom: 20px;' +
      '        }' +
      '        label {' +
      '            display: block;' +
      '            margin-bottom: 8px;' +
      '            color: #333;' +
      '            font-weight: 500;' +
      '        }' +
      '        input {' +
      '            width: 100%;' +
      '            padding: 12px;' +
      '            border: 2px solid #e0e0e0;' +
      '            border-radius: 8px;' +
      '            font-size: 14px;' +
      '            transition: border-color 0.3s;' +
      '        }' +
      '        input:focus {' +
      '            outline: none;' +
      '            border-color: #667eea;' +
      '        }' +
      '        button {' +
      '            width: 100%;' +
      '            padding: 14px;' +
      '            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);' +
      '            color: white;' +
      '            border: none;' +
      '            border-radius: 8px;' +
      '            font-size: 16px;' +
      '            font-weight: 600;' +
      '            cursor: pointer;' +
      '            transition: transform 0.2s, box-shadow 0.2s;' +
      '        }' +
      '        button:hover {' +
      '            transform: translateY(-2px);' +
      '            box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);' +
      '        }' +
      '        button:active {' +
      '            transform: translateY(0);' +
      '        }' +
      '        .error {' +
      '            color: #e53e3e;' +
      '            margin-top: 10px;' +
      '            font-size: 14px;' +
      '        }' +
      '        .lang-select-login {' +
      '            position: absolute;' +
      '            top: 15px;' +
      '            right: 15px;' +
      '            padding: 6px 10px;' +
      '            border: 2px solid #e0e0e0;' +
      '            border-radius: 6px;' +
      '            background: #f7fafc;' +
      '            color: #333;' +
      '            font-size: 13px;' +
      '            cursor: pointer;' +
      '        }' +
      '        .lang-select-login:focus { outline: none; border-color: #667eea; }' +
      '    </style>' +
      '</head>' +
      '<body>' +
      '    <div class="login-container">' +
      '        <select id="langSelect" class="lang-select-login" onchange="setLanguage(this.value)">' +
      '            <option value="fr">🇫🇷 FR</option>' +
      '            <option value="en">🇬🇧 EN</option>' +
      '            <option value="de">🇩🇪 DE</option>' +
      '        </select>' +
      '        <img src="/static/logo.png" alt="UseFlow-FR Logo" class="login-logo">' +
      '        <h1>UseFlow-FR</h1>' +
      '        <p class="subtitle" data-i18n="login_subtitle">Connexion à l\'interface d\'administration</p>' +
      '' +
      '        <form id="loginForm">' +
      '            <div class="form-group">' +
      '                <label for="username" data-i18n="login_username">Nom d\'utilisateur</label>' +
      '                <input type="text" id="username" name="username" required autocomplete="username">' +
      '            </div>' +
      '' +
      '            <div class="form-group">' +
      '                <label for="password" data-i18n="login_password">Mot de passe</label>' +
      '                <input type="password" id="password" name="password" required autocomplete="current-password">' +
      '            </div>' +
      '' +
      '            <button type="submit" data-i18n="login_submit">Se connecter</button>' +
      '            <div id="error" class="error"></div>' +
      '        </form>' +
      '    </div>' +
      '    <script src="/static/i18n.js"></script>' +
      '    <script>' +
      '        document.addEventListener(\'DOMContentLoaded\', function() { initI18n(); });' +
      '        document.getElementById(\'loginForm\').addEventListener(\'submit\', async (e) => {' +
      '            e.preventDefault();' +
      '' +
      '            const username = document.getElementById(\'username\').value;' +
      '            const password = document.getElementById(\'password\').value;' +
      '            const errorDiv = document.getElementById(\'error\');' +
      '' +
      '            try {' +
      '                const response = await fetch(\'/api/login\', {' +
      '                    method: \'POST\',' +
      '                    headers: { \'Content-Type\': \'application/json\' },' +
      '                    body: JSON.stringify({ username, password })' +
      '                });' +
      '' +
      '                const data = await response.json();' +
      '' +
      '                if (response.ok) {' +
      '                    window.location.href = \'/dashboard\';' +
      '                } else {' +
      '                    errorDiv.textContent = t(\'login_error_credentials\');' +
      '                }' +
      '            } catch (error) {' +
      '                errorDiv.textContent = t(\'login_error_network\');' +
      '            }' +
      '        });' +
      '    </script>' +
      '</body>' +
      '</html>';
  }

  getDashboardPage() {
    return '<!DOCTYPE html>' +
      '<html lang="fr">' +
      '<head>' +
      '    <meta charset="UTF-8">' +
      '    <meta name="viewport" content="width=device-width, initial-scale=1.0">' +
      '    <title>UseFlow-FR - Dashboard</title>' +
      '    <style>' +
      '        * { margin: 0; padding: 0; box-sizing: border-box; }' +
      '        :root {' +
      '            --bg-primary: #f5f5f5;' +
      '            --bg-secondary: #ffffff;' +
      '            --bg-tertiary: #f7fafc;' +
      '            --text-primary: #333;' +
      '            --text-secondary: #666;' +
      '            --border-color: #e0e0e0;' +
      '            --shadow: rgba(0,0,0,0.1);' +
      '        }' +
      '        a { color: #667eea; text-decoration: none; }' +
      '        a:visited { color: #667eea; }' +
      '        a:hover { text-decoration: underline; }' +
      '        [data-theme="dark"] {' +
      '            --bg-primary: #1a202c;' +
      '            --bg-secondary: #2d3748;' +
      '            --bg-tertiary: #374151;' +
      '            --text-primary: #f7fafc;' +
      '            --text-secondary: #cbd5e0;' +
      '            --border-color: #4a5568;' +
      '            --shadow: rgba(0,0,0,0.3);' +
      '        }' +
      '        body {' +
      '            font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Oxygen, Ubuntu, sans-serif;' +
      '            background: var(--bg-primary);' +
      '            padding: 20px;' +
      '            transition: background 0.3s ease;' +
      '        }' +
      '        .container {' +
      '            max-width: 1200px;' +
      '            margin: 0 auto;' +
      '        }' +
      '        .header {' +
      '            background: var(--bg-secondary);' +
      '            padding: 20px;' +
      '            border-radius: 12px;' +
      '            margin-bottom: 20px;' +
      '            display: flex;' +
      '            justify-content: space-between;' +
      '            align-items: center;' +
      '            box-shadow: 0 2px 8px var(--shadow);' +
      '        }' +
      '        .header-left {' +
      '            display: flex;' +
      '            align-items: center;' +
      '            gap: 15px;' +
      '        }' +
      '        .header-logo {' +
      '            width: 40px;' +
      '            height: 40px;' +
      '            border-radius: 8px;' +
      '        }' +
      '        h1 { color: var(--text-primary); margin: 0; }' +
      '        .header-actions {' +
      '            display: flex;' +
      '            gap: 10px;' +
      '            align-items: center;' +
      '        }' +
      '        .theme-toggle {' +
      '            padding: 10px 15px;' +
      '            background: var(--bg-tertiary);' +
      '            color: var(--text-primary);' +
      '            border: 2px solid var(--border-color);' +
      '            border-radius: 6px;' +
      '            cursor: pointer;' +
      '            font-size: 14px;' +
      '            transition: all 0.3s;' +
      '        }' +
      '        .theme-toggle:hover {' +
      '            background: #667eea;' +
      '            color: white;' +
      '            border-color: #667eea;' +
      '        }' +
      '        .logout-btn {' +
      '            padding: 10px 20px;' +
      '            background: #e53e3e;' +
      '            color: white;' +
      '            border: none;' +
      '            border-radius: 6px;' +
      '            cursor: pointer;' +
      '            font-size: 14px;' +
      '        }' +
      '        .stats {' +
      '            display: grid;' +
      '            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));' +
      '            gap: 20px;' +
      '            margin-bottom: 20px;' +
      '        }' +
      '        .stat-card {' +
      '            background: var(--bg-secondary);' +
      '            padding: 20px;' +
      '            border-radius: 12px;' +
      '            box-shadow: 0 2px 8px var(--shadow);' +
      '            text-align: center;' +
      '        }' +
      '        .stat-card h3 {' +
      '            color: var(--text-secondary);' +
      '            font-size: 14px;' +
      '            margin-bottom: 10px;' +
      '            text-transform: uppercase;' +
      '        }' +
      '        .stat-card .value {' +
      '            font-size: 32px;' +
      '            font-weight: bold;' +
      '            color: #667eea;' +
      '        }' +
      '        .section {' +
      '            background: var(--bg-secondary);' +
      '            padding: 30px;' +
      '            border-radius: 12px;' +
      '            margin-bottom: 20px;' +
      '            box-shadow: 0 2px 8px var(--shadow);' +
      '        }' +
      '        .section h2 {' +
      '            margin-bottom: 20px;' +
      '            color: var(--text-primary);' +
      '            border-bottom: 2px solid #667eea;' +
      '            padding-bottom: 10px;' +
      '        }' +
      '        .form-group {' +
      '            margin-bottom: 20px;' +
      '        }' +
      '        label {' +
      '            display: block;' +
      '            margin-bottom: 8px;' +
      '            color: var(--text-primary);' +
      '            font-weight: 500;' +
      '        }' +
      '        input, select {' +
      '            width: 100%;' +
      '            padding: 12px;' +
      '            border: 2px solid var(--border-color);' +
      '            border-radius: 8px;' +
      '            font-size: 14px;' +
      '            background: var(--bg-tertiary);' +
      '            color: var(--text-primary);' +
      '        }' +
      '        input:focus, select:focus {' +
      '            outline: none;' +
      '            border-color: #667eea;' +
      '        }' +
      '        small {' +
      '            font-size: 12px;' +
      '            color: var(--text-secondary);' +
      '        }' +
      '        .btn {' +
      '            padding: 12px 24px;' +
      '            background: #667eea;' +
      '            color: white;' +
      '            border: none;' +
      '            border-radius: 8px;' +
      '            cursor: pointer;' +
      '            font-size: 14px;' +
      '            font-weight: 600;' +
      '            margin-right: 10px;' +
      '        }' +
      '        .btn:hover {' +
      '            background: #5568d3;' +
      '        }' +
      '        .btn-success {' +
      '            background: #48bb78;' +
      '        }' +
      '        .btn-success:hover {' +
      '            background: #38a169;' +
      '        }' +
      '        .success {' +
      '            color: #48bb78;' +
      '            margin-top: 10px;' +
      '        }' +
      '        .error {' +
      '            color: #e53e3e;' +
      '            margin-top: 10px;' +
      '        }' +
      '        .sync-status {' +
      '            background: var(--bg-tertiary);' +
      '            padding: 20px;' +
      '            border-radius: 8px;' +
      '            margin-top: 20px;' +
      '        }' +
      '        .progress-bar {' +
      '            width: 100%;' +
      '            height: 30px;' +
      '            background: var(--border-color);' +
      '            border-radius: 15px;' +
      '            overflow: hidden;' +
      '            margin: 10px 0;' +
      '        }' +
      '        .progress-fill {' +
      '            height: 100%;' +
      '            background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);' +
      '            transition: width 0.3s;' +
      '            display: flex;' +
      '            align-items: center;' +
      '            justify-content: center;' +
      '            color: white;' +
      '            font-weight: bold;' +
      '        }' +
      '        .install-link {' +
      '            background: var(--bg-tertiary);' +
      '            padding: 15px;' +
      '            border-radius: 8px;' +
      '            border: 2px dashed #667eea;' +
      '            margin-top: 20px;' +
      '        }' +
      '        .install-link code {' +
      '            background: #667eea;' +
      '            color: white;' +
      '            padding: 8px 12px;' +
      '            border-radius: 6px;' +
      '            display: inline-block;' +
      '            font-family: monospace;' +
      '        }' +
      '        .checkbox-group {' +
      '            display: flex;' +
      '            align-items: center;' +
      '            margin-bottom: 15px;' +
      '        }' +
      '        .checkbox-group input[type="checkbox"] {' +
      '            width: auto;' +
      '            margin-right: 10px;' +
      '        }' +
      '        .history-item {' +
      '            background: var(--bg-tertiary);' +
      '            padding: 15px;' +
      '            border-radius: 8px;' +
      '            margin-bottom: 10px;' +
      '            border-left: 4px solid #667eea;' +
      '        }' +
      '        .history-item.error {' +
      '            border-left-color: #e53e3e;' +
      '        }' +
      '        .history-item.running {' +
      '            border-left-color: #f59e0b;' +
      '        }' +
      '        .history-meta {' +
      '            font-size: 12px;' +
      '            color: #666;' +
      '            margin-bottom: 8px;' +
      '        }' +
      '        .history-stats {' +
      '            display: grid;' +
      '            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));' +
      '            gap: 10px;' +
      '            margin-top: 10px;' +
      '        }' +
      '        .history-stat {' +
      '            text-align: center;' +
      '            padding: 8px;' +
      '            background: var(--bg-secondary);' +
      '            border-radius: 6px;' +
      '        }' +
      '        .history-stat-label {' +
      '            font-size: 11px;' +
      '            color: #666;' +
      '            text-transform: uppercase;' +
      '        }' +
      '        .history-stat-value {' +
      '            font-size: 18px;' +
      '            font-weight: bold;' +
      '            color: var(--text-primary);' +
      '        }' +
      '        /* Toggle Switch CSS */' +
      '        .toggle-switch {' +
      '            position: relative;' +
      '            display: inline-block;' +
      '            width: 50px;' +
      '            height: 24px;' +
      '            margin-right: 10px;' +
      '            flex-shrink: 0;' +
      '        }' +
      '        .toggle-switch input {' +
      '            opacity: 0;' +
      '            width: 0;' +
      '            height: 0;' +
      '        }' +
      '        .slider {' +
      '            position: absolute;' +
      '            cursor: pointer;' +
      '            top: 0;' +
      '            left: 0;' +
      '            right: 0;' +
      '            bottom: 0;' +
      '            background-color: #ccc;' +
      '            transition: .4s;' +
      '            border-radius: 24px;' +
      '        }' +
      '        .slider:before {' +
      '            position: absolute;' +
      '            content: "";' +
      '            height: 16px;' +
      '            width: 16px;' +
      '            left: 4px;' +
      '            bottom: 4px;' +
      '            background-color: white;' +
      '            transition: .4s;' +
      '            border-radius: 50%;' +
      '        }' +
      '        input:checked + .slider {' +
      '            background-color: #667eea;' +
      '        }' +
      '        input:checked + .slider:before {' +
      '            transform: translateX(26px);' +
      '        }' +
      '        .toggle-container {' +
      '            display: flex;' +
      '            align-items: center;' +
      '            margin-bottom: 15px;' +
      '        }' +
      '        .description-text {' +
      '            color: var(--text-secondary);' +
      '            font-size: 14px;' +
      '            line-height: 1.5;' +
      '            margin-bottom: 15px;' +
      '        }' +
      '        .description-text a {' +
      '            color: #667eea;' +
      '            text-decoration: none;' +
      '        }' +
      '        .description-text a:hover {' +
      '            text-decoration: underline;' +
      '        }' +
      '        .lang-select {' +
      '            padding: 4px 6px;' +
      '            background: var(--bg-tertiary);' +
      '            color: var(--text-primary);' +
      '            border: 2px solid var(--border-color);' +
      '            border-radius: 6px;' +
      '            cursor: pointer;' +
      '            font-size: 12px;' +
      '            transition: all 0.3s;' +
      '            width: auto;' +
      '            min-width: 0;' +
      '        }' +
      '        .lang-select:hover {' +
      '            border-color: #667eea;' +
      '        }' +
      '        .lang-select:focus {' +
      '            outline: none;' +
      '            border-color: #667eea;' +
      '        }' +
      '    </style>' +
      '</head>' +
      '<body>' +
      '    <div class="container">' +
      '        <div class="header">' +
      '            <div class="header-left">' +
      '                <img src="/static/logo.png" alt="Logo" class="header-logo">' +
      '                <h1>UseFlow-FR</h1>' +
      '            </div>' +
      '            <div style="display: flex; align-items: center; gap: 15px; flex-wrap: wrap;">' +
      '                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 5px; margin-right: 15px;">' +
      '                    <div style="display: flex; align-items: center; gap: 8px;">' +
      '                        <p style="color: var(--text-secondary); font-size: 12px; margin: 0;"><span data-i18n="by">Par</span> <strong style="color: #667eea;">Aerya</strong></p>' +
      '                        <img src="https://upandclear.org/wp-content/uploads/2024/06/Logo.detoure1.png.webp" alt="Aerya" style="width: 20px; height: 20px; border-radius: 50%; object-fit: cover;">' +
      '                    </div>' +
      '                    <div style="display: flex; gap: 15px;">' +
      '                        <a href="https://github.com/Aerya" target="_blank" style="color: #667eea; text-decoration: none; font-size: 12px; font-weight: 500;">GitHub</a>' +
      '                        <a href="https://upandclear.org/" target="_blank" style="color: #667eea; text-decoration: none; font-size: 12px; font-weight: 500;">Blog</a>' +
      '                        <a href="https://ko-fi.com/upandclear" target="_blank" style="color: #667eea; text-decoration: none; font-size: 12px; font-weight: 500;" data-i18n="donate">M\'offrir des Dragibus :-)</a>' +
      '                    </div>' +
      '                </div>' +
      '                <div class="header-actions">' +
      '                    <select id="langSelect" class="lang-select" onchange="setLanguage(this.value)">' +
      '                        <option value="fr">🇫🇷 FR</option>' +
      '                        <option value="en">🇬🇧 EN</option>' +
      '                        <option value="de">🇩🇪 DE</option>' +
      '                    </select>' +
      '                    <div style="display: flex; align-items: center; gap: 5px;">' +
      '                        <button onclick="toggleTheme()" class="theme-toggle" id="themeToggleBtn">Ça va être tout noir !</button>' +
      '                        <a href="https://www.youtube.com/watch?v=wnSelKDe4sE" target="_blank" style="font-size: 10px; color: var(--text-secondary); text-decoration: none;" title="Référence RRrrrr">(?)</a>' +
      '                    </div>' +
      '                    <form action="/api/logout" method="POST" style="display: inline;">' +
      '                        <button type="submit" class="logout-btn" data-i18n="logout">Déconnexion</button>' +
      '                    </form>' +
      '                </div>' +
      '            </div>' +
      '        </div>' +
      '        <div class="section" style="margin-bottom: 20px;">' +
      '            <p class="description-text" data-i18n="description_text" data-i18n-html="true">' +
      '                UseFlow-FR est un addon de création de catalogues Stremio à partir de flux RSS. Il ne permet pas de lire du contenu, il faut pour cela utiliser des addons de stream tels que <a href="https://github.com/Telkaoss/stream-fusion" target="_blank">StreamFusion (BitTorrent)</a> ou <a href="https://github.com/Sanket9225/UsenetStreamer" target="_blank">Usenet-Streamer</a> avec <a href="https://github.com/nzbdav-dev/nzbdav" target="_blank">NZBdav (Usenet)</a>.<br>' +
      '                Tutoriels sur <a href="https://upandclear.org" target="_blank">mon blog</a>, <a href="https://github.com/Aerya/Stremio-Stack" target="_blank">exemple de stack</a> à auto-héberger, <a href="https://stremiofr.com/" target="_blank">instances</a> mises à disposition par la communauté StremioFR.' +
      '            </p>' +
      '        </div>' +
      '        <div class="stats" id="stats">' +
      '            <div class="stat-card">' +
      '                <h3 data-i18n="stat_films">Films</h3>' +
      '                <div class="value">-</div>' +
      '            </div>' +
      '            <div class="stat-card">' +
      '                <h3 data-i18n="stat_documentaires">Documentaires</h3>' +
      '                <div class="value">-</div>' +
      '            </div>' +
      '            <div class="stat-card">' +
      '                <h3 data-i18n="stat_indexed">Médias indexés</h3>' +
      '                <div class="value">-</div>' +
      '            </div>' +
      '        </div>' +
      '        <div class="section">' +
      '            <h2 data-i18n="sync_history_title">Historique des synchronisations</h2>' +
      '            <p class="description-text" data-i18n="sync_history_desc" data-i18n-html="true">' +
      '                Pour chaque release, UseFlow-FR va chercher le média correspondant sur TMDB et l\'attribue ensuite à un catalogue Films ou Documentaires.<br>' +
      '                L\'écart entre les releases sources dans un flux RSS et les médias ajoutés dans les catalogues vient des releases qui n\'ont pas matché sur TMDB (nom erroné/différent de la fiche, pas de fiche, timeout TMDB, plusieurs médias du même nom etc) et de celles qui se réfèrent à un même média (rlz SD, HD, HDR, SDR, DV, UHD etc d\'un même film par exemple) et ne comptent donc pas.' +
      '                Si une nouvelle release concerne des média déjà rattaché à un catalogue, ce media n\'est alors pas remis en avant dans les derniers ajouts du catalogue.' +
      '            </p>' +
      '            <!-- Contrôles -->' +
      '            <div style="margin-bottom: 15px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">' +
      '            <label for="dateFilter" style="margin: 0;" data-i18n="sync_browse">Parcourir :</label>' +
      '            <select id="dateFilter" style="width: auto; min-width: 200px; padding: 8px;" onchange="loadSyncHistoryByDate()">' +
      '                <option value="" data-i18n="sync_last_3">Les 3 dernières</option>' +
      '            </select>' +
      '            </div>' +
      '            <div id="syncHistoryContainer">' +
      '                <p style="color: #666;" data-i18n="sync_loading">Chargement...</p>' +
      '            </div>' +
      '        </div>' +
      '        <div class="section">' +
      '            <h2 data-i18n="config_title">Configuration</h2>' +
      '            <p class="description-text" style="margin-bottom: 20px; font-style: italic;" data-i18n="config_note">' +
      '                Cet outil ne traite que les releases taggées FRENCH/MULTi/TRUEFRENCH/VOF/VFF/VFI/VFQ.' +
      '            </p>' +
      '            <form id="configForm">' +
      '                <div class="form-group">' +
      '                    <label for="rss_films_url" data-i18n="config_rss_films">Flux RSS de Films ou Documentaires</label>' +
      '                    <input type="url" id="rss_films_url" name="rss_films_url" required placeholder="https://domain.tld/rssnew?cats=...&key=...">' +
      '                    <small style="color: #666; display: block; margin-top: 5px;" data-i18n="config_rss_films_hint">' +
      '                        Incluant votre clé API ou passkey' +
      '                    </small>' +
      '                </div>' +
      '                <div style="margin-top: 20px; margin-bottom: 10px;">' +
      '                    <h3 data-i18n="config_rss_additional_title" style="margin: 0 0 5px 0;">Flux RSS additionnels</h3>' +
      '                    <small style="color: #666; display: block; margin-bottom: 10px;" data-i18n="config_rss_additional_hint">Même fonctionnement que le flux principal : Films et Documentaires uniquement, basés sur TMDB (pas de séries).</small>' +
      '                </div>' +
      '                <div id="additionalRssContainer"></div>' +
      '                <button type="button" class="btn" onclick="addRssField()" style="margin-bottom: 20px; background: linear-gradient(135deg, #48bb78, #38a169); font-size: 14px; padding: 8px 16px;" data-i18n="config_rss_add_btn">➕ Ajouter un flux RSS</button>' +
      '                <div class="form-group">' +
      '                    <label for="tmdb_api_key" data-i18n="config_tmdb_key">Clé API TMDB</label>' +
      '                    <input type="text" id="tmdb_api_key" name="tmdb_api_key" required>' +
      '                </div>' +
      '                ' +
      '                <h3 style="margin: 30px 0 15px 0;" data-i18n="config_rpdb_title">Rating Poster DataBase aka RPDB</h3>' +
      '                <div class="toggle-container">' +
      '                    <label class="toggle-switch">' +
      '                        <input type="checkbox" id="rpdb_enabled" name="rpdb_enabled">' +
      '                        <span class="slider"></span>' +
      '                    </label>' +
      '                    <label for="rpdb_enabled" style="margin: 0;"><span data-i18n="config_rpdb_enable">Activer</span> (<a href="https://ratingposterdb.com/examples/" target="_blank" data-i18n="config_rpdb_examples">exemples</a>)</label>' +
      '                </div>' +
      '                <div class="form-group">' +
      '                    <label for="rpdb_api_key"><a href="https://ratingposterdb.com/api-key/" target="_blank" data-i18n="config_rpdb_get_key">Obtenir une clé gratuite en créant un compte</a></label>' +
      '                    <input type="text" id="rpdb_api_key" name="rpdb_api_key" data-i18n="config_rpdb_placeholder" data-i18n-placeholder="true" placeholder="Votre clé API RPDB">' +
      '                </div>' +
      '' +
      '                <h3 style="margin: 30px 0 15px 0;" data-i18n="config_proxy_title">Proxy</h3>' +
      '' +
      '                <div class="toggle-container">' +
      '                    <label class="toggle-switch">' +
      '                        <input type="checkbox" id="proxy_enabled" name="proxy_enabled">' +
      '                        <span class="slider"></span>' +
      '                    </label>' +
      '                    <label for="proxy_enabled" style="margin: 0;" data-i18n="config_proxy_enable">Activer</label>' +
      '                </div>' +
      '                <div class="form-group">' +
      '                    <label for="proxy_protocol" data-i18n="config_proxy_protocol">Protocole</label>' +
      '                    <select id="proxy_protocol" name="proxy_protocol">' +
      '                        <option value="http">HTTP</option>' +
      '                        <option value="https">HTTPS</option>' +
      '                        <option value="socks4">SOCKS4</option>' +
      '                        <option value="socks5">SOCKS5</option>' +
      '                    </select>' +
      '                </div>' +
      '                <div class="form-group">' +
      '                    <label for="proxy_host" data-i18n="config_proxy_host">Hôte</label>' +
      '                    <input type="text" id="proxy_host" name="proxy_host" placeholder="127.0.0.1">' +
      '                </div>' +
      '                <div class="form-group">' +
      '                    <label for="proxy_port" data-i18n="config_proxy_port">Port</label>' +
      '                    <input type="number" id="proxy_port" name="proxy_port" placeholder="1080">' +
      '                </div>' +
      '                <div class="form-group">' +
      '                    <label for="proxy_username" data-i18n="config_proxy_username">Utilisateur (optionnel)</label>' +
      '                    <input type="text" id="proxy_username" name="proxy_username">' +
      '                </div>' +
      '                <div class="form-group">' +
      '                    <label for="proxy_password" data-i18n="config_proxy_password">Mot de passe (optionnel)</label>' +
      '                    <input type="password" id="proxy_password" name="proxy_password">' +
      '                </div>' +
      '                <h3 style="margin: 30px 0 15px 0;" data-i18n="config_auto_sync_title">Synchronisation automatique</h3>' +
      '' +
      '                <div class="toggle-container">' +
      '                    <label class="toggle-switch">' +
      '                        <input type="checkbox" id="auto_refresh_enabled" name="auto_refresh_enabled">' +
      '                        <span class="slider"></span>' +
      '                    </label>' +
      '                    <label for="auto_refresh_enabled" style="margin: 0;" data-i18n="config_auto_sync_enable">Activer</label>' +
      '                </div>' +
      '                <div class="form-group">' +
      '                    <label for="refresh_interval" data-i18n="config_refresh_interval">Intervalle de rafraîchissement (minutes)</label>' +
      '                    <input type="number" id="refresh_interval" name="refresh_interval" min="15" max="1440" value="180" placeholder="180">' +
      '                    <small style="color: #666; display: block; margin-top: 5px;" data-i18n="config_refresh_hint">' +
      '                        Minimum : 15 minutes | Maximum : 1440 minutes (24h) | Par défaut : 180 minutes (3h)' +
      '                    </small>' +
      '                </div>' +
      '                <h3 style="margin: 30px 0 15px 0;" data-i18n="config_discord_title">Notifications Discord à la suite d\'une synchronisation</h3>' +
      '' +
      '                <div class="toggle-container">' +
      '                    <label class="toggle-switch">' +
      '                        <input type="checkbox" id="discord_notifications_enabled" name="discord_notifications_enabled">' +
      '                        <span class="slider"></span>' +
      '                    </label>' +
      '                    <label for="discord_notifications_enabled" style="margin: 0;" data-i18n="config_discord_enable">Activer</label>' +
      '                </div>' +
      '                <div class="form-group">' +
      '                    <label for="discord_webhook_url" data-i18n="config_discord_webhook">Webhook</label>' +
      '                    <input type="url" id="discord_webhook_url" name="discord_webhook_url" placeholder="https://discord.com/api/webhooks/...">' +
      '                    <small style="color: #666; display: block; margin-top: 5px;" data-i18n="config_discord_webhook_hint">' +
      '                        Créer un webhook dans Paramètres du serveur > Intégrations > Webhooks' +
      '                    </small>' +
      '                </div>' +
      '                <div class="toggle-container">' +
      '                    <label class="toggle-switch">' +
      '                        <input type="checkbox" id="discord_enhanced_notifications_enabled" name="discord_enhanced_notifications_enabled">' +
      '                        <span class="slider"></span>' +
      '                    </label>' +
      '                    <label for="discord_enhanced_notifications_enabled" style="margin: 0;" data-i18n="config_discord_enhanced">Afficher les 5 derniers ajouts de chaque catalogue</label>' +
      '                </div>' +
      '                <small style="color: #666; display: block; margin-top: 5px; margin-bottom: 15px;" data-i18n="config_discord_enhanced_hint">' +
      '                    Affiche les 5 dernières affiches' +
      '                </small>' +
      '                <div class="toggle-container">' +
      '                    <label class="toggle-switch">' +
      '                        <input type="checkbox" id="discord_rpdb_posters_enabled" name="discord_rpdb_posters_enabled">' +
      '                        <span class="slider"></span>' +
      '                    </label>' +
      '                    <label for="discord_rpdb_posters_enabled" style="margin: 0;" data-i18n="config_discord_rpdb">Utiliser les affiches RPDB pour Discord</label>' +
      '                </div>' +
      '                <small style="color: #666; display: block; margin-top: 5px; margin-bottom: 15px;" data-i18n="config_discord_rpdb_hint">' +
      '                    Nécessite une clé API RPDB configurée' +
      '                </small>' +
      '                <button type="submit" class="btn" data-i18n="config_save">Enregistrer</button>' +
      '                <div id="configMessage"></div>' +
      '            </form>' +
      '        </div>' +
      '        <div class="section">' +
      '            <h2 data-i18n="sync_title">Synchronisation</h2>' +
      '            <div id="autoRefreshStatus" style="background: #f7fafc; padding: 15px; border-radius: 8px; margin-bottom: 15px;">' +
      '                <strong data-i18n="sync_auto_label">Synchronisation automatique :</strong> <span id="autoRefreshState" data-i18n="sync_loading">Chargement...</span>' +
      '            </div>' +
      '' +
      '            <div style="text-align: center;">' +
      '                <button class="btn btn-success" onclick="startSync()" data-i18n="sync_start_btn">▶️ Lancer manuellement la récupération des flux RSS et le matching avec TMDB</button>' +
      '            </div>' +
      '' +
      '            <div id="syncStatus" class="sync-status" style="display: none;">' +
      '                <h3 id="syncStage" data-i18n="sync_in_progress">En cours...</h3>' +
      '                <div class="progress-bar">' +
      '                    <div class="progress-fill" id="progressFill" style="width: 0%;">' +
      '                        <span id="progressText">0%</span>' +
      '                    </div>' +
      '                </div>' +
      '                <p id="syncDetails">Matched: 0 | Failed: 0</p>' +
      '            </div>' +
      '        </div>' +
      '        <div class="section">' +
      '            <h2 data-i18n="install_title">Installation dans Stremio</h2>' +
      '            <p data-i18n="install_desc">Une fois la 1ère synchronisation terminée OU à chaque modification apportée sur la WebUI, (ré)installer l\'addon dans Stremio avec cette URL :</p>' +
      '            <div class="install-link">' +
      '                <code id="installUrl" data-i18n="install_loading">Chargement...</code>' +
      '                <button class="btn" onclick="copyInstallUrl()" style="margin-left: 10px;" data-i18n="install_copy">Copier</button>' +
      '            </div>' +
      '        </div>' +
      '    </div>' +
      '    <script src="/static/i18n.js"></script>' +
      '    <script src="/static/dashboard.js"></script>' +
      '</body>' +
      '</html>';
  }

  startAutoRefresh() {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
      this.autoRefreshInterval = null;
    }
    const enabled = this.db.getConfig('auto_refresh_enabled') === 'true';
    if (!enabled) {
      console.log('[Auto-Refresh] Désactivé');
      return;
    }
    const interval = parseInt(this.db.getConfig('refresh_interval')) || 60;
    const intervalMs = interval * 60 * 1000;
    console.log('[Auto-Refresh] Activé - Intervalle: ' + interval + ' minutes');
    this.autoRefreshInterval = setInterval(async () => {
      if (!this.syncInProgress) {
        console.log('[Auto-Refresh] Lancement de la synchronisation automatique...');
        try {
          await this.runSync();
        } catch (error) {
          console.error('[Auto-Refresh] Erreur:', error);
        }
      } else {
        console.log('[Auto-Refresh] Synchronisation déjà en cours, passage au prochain cycle');
      }
    }, intervalMs);
  }

  stopAutoRefresh() {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
      this.autoRefreshInterval = null;
      console.log('[Auto-Refresh] Arrêté');
    }
  }

  listen(port) {
    this.app.listen(port, () => {
      console.log('\nUseFlow-FR démarré sur le port ' + port);
      console.log('\nWebUI: http://localhost:' + port);
      console.log('Manifest: http://localhost:' + port + '/manifest.json\n');
    });
  }
}

module.exports = WebUI;
