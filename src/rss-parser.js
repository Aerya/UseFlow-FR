const axios = require('axios');
const xml2js = require('xml2js');
const { SocksProxyAgent } = require('socks-proxy-agent');

class RSSParser {
  constructor(config, db) {
    this.config = config;
    this.db = db;
    this.axiosConfig = this.getAxiosConfig();
  }

  getAxiosConfig() {
    const config = { timeout: 30000 };

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
        console.warn('[RSS] Proxy enabled but host/port not configured, ignoring proxy settings');
      }
    }

    return config;
  }

  async fetchRSS(url) {
    try {
      console.log(`Fetching RSS: ${url}`);
      const response = await axios.get(url, this.axiosConfig);
      const parser = new xml2js.Parser({ explicitArray: false });
      const result = await parser.parseStringPromise(response.data);

      if (result.rss && result.rss.channel && result.rss.channel.item) {
        const items = Array.isArray(result.rss.channel.item)
          ? result.rss.channel.item
          : [result.rss.channel.item];
        return items;
      }
      return [];
    } catch (error) {
      console.error(`Error fetching RSS ${url}:`, error.message);
      return [];
    }
  }

  parseReleaseName(title) {
    // Extraire les informations du nom de release
    const info = {
      name: title,
      year: null,
      isDoc: false
    };

    // Détecter documentaire
    if (/\b(doc|docu|documentary|documentaire)\b/i.test(title)) {
      info.isDoc = true;
    }

    // Extraire l'année
    const yearMatch = title.match(/[.\s](19\d{2}|20\d{2})[.\s]/);
    if (yearMatch) {
      info.year = yearMatch[1];
    }

    // Nettoyer le nom pour la recherche (suppression des tags techniques)
    let cleanName = title
      .replace(/\b(MULTi|FRENCH|TRUEFRENCH|VFF|VF2|VOSTFR)\b/gi, '')
      .replace(/\b(1080p|720p|2160p|4K|UHD|HDR|DV|BluRay|WEB|WEBRip|HDTV)\b/gi, '')
      .replace(/\b(x264|x265|H264|H265|HEVC)\b/gi, '')
      .replace(/\b(AC3|DTS|EAC3|ATMOS|AAC|DD|DDP)\b/gi, '')
      .replace(/\b\d{1,2}\.\d\b/gi, '') // Remove audio channels like 5.1
      .replace(/-[A-Z0-9]+$/gi, '') // Remove team name at end
      .replace(/[.\s]+/g, ' ')
      .trim();

    // Extraire le nom propre
    if (info.year) {
      const parts = cleanName.split(info.year);
      cleanName = parts[0].trim();
    }

    info.cleanName = cleanName;
    return info;
  }

  async parseFilmsRSS() {
    const rssUrl = this.db.getConfig('rss_films_url');
    if (!rssUrl) {
      console.log('No RSS Films URL configured');
      return [];
    }

    const items = await this.fetchRSS(rssUrl);

    const parsed = [];
    for (const item of items) {
      const info = this.parseReleaseName(item.title);

      // Extraire l'ID correctement (peut être un objet ou une string)
      const releaseId = typeof item.guid === 'object' && item.guid._ ? item.guid._ : (item.guid || item.link);

      parsed.push({
        release_name: item.title,
        indexer_rlz_id: releaseId,
        cleanName: info.cleanName,
        year: info.year,
        catalog_type: info.isDoc ? 'documentaires' : 'films',
        type: 'movie',
        pubDate: item.pubDate
      });
    }

    return parsed;
  }

  async parseAdditionalRSS() {
    let additionalUrls = [];
    try {
      const raw = this.db.getConfig('rss_additional_urls');
      if (raw) additionalUrls = JSON.parse(raw);
    } catch (e) {
      console.log('Error parsing rss_additional_urls:', e.message);
      return [];
    }

    if (!Array.isArray(additionalUrls) || additionalUrls.length === 0) {
      console.log('No additional RSS URLs configured');
      return [];
    }

    const allParsed = [];
    for (const rssUrl of additionalUrls) {
      if (!rssUrl || !rssUrl.trim()) continue;
      console.log('[RSS] Parsing additional feed:', rssUrl.substring(0, 50) + '...');

      try {
        const items = await this.fetchRSS(rssUrl.trim());

        for (const item of items) {
          const info = this.parseReleaseName(item.title);
          const releaseId = typeof item.guid === 'object' && item.guid._ ? item.guid._ : (item.guid || item.link);

          allParsed.push({
            release_name: item.title,
            indexer_rlz_id: releaseId,
            cleanName: info.cleanName,
            year: info.year,
            catalog_type: info.isDoc ? 'documentaires' : 'films',
            type: 'movie',
            pubDate: item.pubDate
          });
        }
      } catch (err) {
        console.error('[RSS] Error parsing additional feed:', rssUrl.substring(0, 50), err.message);
      }
    }

    return allParsed;
  }

  async parseAll() {
    const filmsItems = await this.parseFilmsRSS();
    const additionalItems = await this.parseAdditionalRSS();

    const results = {
      films: [...filmsItems, ...additionalItems]
    };

    return results;
  }
}

module.exports = RSSParser;
