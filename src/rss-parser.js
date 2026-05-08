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
      isDoc: false,
      isSeries: false
    };

    // Détecter documentaire
    if (/\b(doc|docu|documentary|documentaire)\b/i.test(title)) {
      info.isDoc = true;
    }

    // Détecter série (S01E01, S01, Saison N, Season N)
    if (/\bS\d{2}(E\d{2,3})?\b/i.test(title) || /\b(Saison|Season)\s*\d+\b/i.test(title)) {
      info.isSeries = true;
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

    // Pour les séries : supprimer la partie saison/épisode du nom
    if (info.isSeries) {
      cleanName = cleanName
        .replace(/\s+S\d{2}(E\d{2,3}(-E?\d{2,3})?)?.*/i, '')
        .replace(/\s+(Saison|Season)\s*\d+.*/i, '')
        .trim();
    }

    // Extraire le nom propre (couper à l'année)
    if (info.year) {
      const parts = cleanName.split(info.year);
      cleanName = parts[0].trim();
    }

    info.cleanName = cleanName;
    return info;
  }

  filterByRequiredTags(title) {
    const raw = this.db.getConfig('required_tags') || '';
    const tags = raw.split(',').map(t => t.trim()).filter(t => t.length > 0);
    if (tags.length === 0) return true; // no filter configured
    return tags.some(tag => new RegExp('\\b' + tag + '\\b', 'i').test(title));
  }

  applyForce(catalogType, type, force) {
    if (!force || force === 'auto') return { catalogType, type };
    if (force === 'films') return { catalogType: 'films', type: 'movie' };
    if (force === 'series') return { catalogType: 'series', type: 'series' };
    if (force === 'documentaires') return { catalogType: 'documentaires', type: 'movie' };
    return { catalogType, type };
  }

  async parseFilmsRSS() {
    const rssUrl = this.db.getConfig('rss_films_url');
    if (!rssUrl) {
      console.log('No RSS Films URL configured');
      return [];
    }

    const force = this.db.getConfig('rss_films_force') || 'auto';
    const items = await this.fetchRSS(rssUrl);

    const parsed = [];
    for (const item of items) {
      if (!this.filterByRequiredTags(item.title)) continue;
      const info = this.parseReleaseName(item.title);
      const releaseId = typeof item.guid === 'object' && item.guid._ ? item.guid._ : (item.guid || item.link);
      const detected = this.applyForce(
        info.isSeries ? 'series' : (info.isDoc ? 'documentaires' : 'films'),
        info.isSeries ? 'series' : 'movie',
        force
      );

      parsed.push({
        release_name: item.title,
        indexer_rlz_id: releaseId,
        cleanName: info.cleanName,
        year: info.year,
        catalog_type: detected.catalogType,
        type: detected.type,
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
    for (const entry of additionalUrls) {
      // Compat ancien format (string) et nouveau format ({url, force})
      const rssUrl = typeof entry === 'string' ? entry : entry.url;
      const force = typeof entry === 'string' ? 'auto' : (entry.force || 'auto');

      if (!rssUrl || !rssUrl.trim()) continue;
      console.log('[RSS] Parsing additional feed:', rssUrl.substring(0, 50) + '... (force: ' + force + ')');

      try {
        const items = await this.fetchRSS(rssUrl.trim());

        for (const item of items) {
          if (!this.filterByRequiredTags(item.title)) continue;
          const info = this.parseReleaseName(item.title);
          const releaseId = typeof item.guid === 'object' && item.guid._ ? item.guid._ : (item.guid || item.link);
          const detected = this.applyForce(
            info.isSeries ? 'series' : (info.isDoc ? 'documentaires' : 'films'),
            info.isSeries ? 'series' : 'movie',
            force
          );

          allParsed.push({
            release_name: item.title,
            indexer_rlz_id: releaseId,
            cleanName: info.cleanName,
            year: info.year,
            catalog_type: detected.catalogType,
            type: detected.type,
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
