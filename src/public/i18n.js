/**
 * UseFlow-FR i18n System
 * Supports: FR (default), EN, DE
 */

const translations = {
  fr: {
    // Login page
    login_subtitle: "Connexion à l'interface d'administration",
    login_username: "Nom d'utilisateur",
    login_password: "Mot de passe",
    login_submit: "Se connecter",
    login_error_credentials: "Identifiants incorrects",
    login_error_network: "Erreur réseau",
    login_error_generic: "Erreur de connexion",

    // Header
    logout: "Déconnexion",

    // Description
    description_text: 'UseFlow-FR est un addon de création de catalogues Stremio à partir de flux RSS. Il ne permet pas de lire du contenu, il faut pour cela utiliser des addons de stream tels que <a href="https://github.com/Telkaoss/stream-fusion" target="_blank">StreamFusion (BitTorrent)</a> ou <a href="https://github.com/Sanket9225/UsenetStreamer" target="_blank">Usenet-Streamer</a> avec <a href="https://github.com/nzbdav-dev/nzbdav" target="_blank">NZBdav (Usenet)</a>.<br>Tutoriels sur <a href="https://upandclear.org" target="_blank">mon blog</a>, <a href="https://github.com/Aerya/Stremio-Stack" target="_blank">exemple de stack</a> à auto-héberger, <a href="https://stremiofr.com/" target="_blank">instances</a> mises à disposition par la communauté StremioFR.',

    // Stats
    stat_films: "Films",
    stat_documentaires: "Documentaires",
    stat_indexed: "Médias indexés",

    // Sync history
    sync_history_title: "Historique des synchronisations",
    sync_history_desc: "Pour chaque release, UseFlow-FR va chercher le média correspondant sur TMDB et l'attribue ensuite à un catalogue Films ou Documentaires.<br>L'écart entre les releases sources dans un flux RSS et les médias ajoutés dans les catalogues vient des releases qui n'ont pas matché sur TMDB (nom erroné/différent de la fiche, pas de fiche, timeout TMDB, plusieurs médias du même nom etc) et de celles qui se réfèrent à un même média (rlz SD, HD, HDR, SDR, DV, UHD etc d'un même film par exemple) et ne comptent donc pas. Si une nouvelle release concerne des média déjà rattaché à un catalogue, ce media n'est alors pas remis en avant dans les derniers ajouts du catalogue.",
    sync_browse: "Parcourir :",
    sync_last_3: "Les 3 dernières",
    sync_loading: "Chargement...",
    sync_none: "Aucune synchronisation effectuée pour le moment.",
    sync_none_date: "Aucune synchronisation pour cette date.",
    sync_duration: "Durée",
    sync_status: "Statut",
    sync_completed: "✓ Terminée",
    sync_error: "✗ Erreur",
    sync_running: "⏳ En cours",
    sync_error_label: "Erreur",
    sync_releases: "Releases sources",
    sync_matched: "Matchées sur TMDB",
    sync_match_rate: "Réussite",
    sync_already_in_db: "Déjà en base",
    sync_new: "Nouvelles",
    sync_films: "Films",
    sync_docs: "Docs",
    sync_failed: "Non traitées",

    // Config
    config_title: "Configuration",
    config_note: "Cet outil ne traite que les releases taggées FRENCH/MULTi/TRUEFRENCH/VOF/VFF/VFI/VFQ.",
    config_rss_films: "Flux RSS de Films ou Documentaires",
    config_rss_films_hint: "Incluant votre clé API ou passkey",
    config_rss_additional_title: "Flux RSS additionnels",
    config_rss_additional_hint: "Même fonctionnement que le flux principal : Films et Documentaires uniquement, basés sur TMDB (pas de séries).",
    config_rss_add_btn: "➕ Ajouter un flux RSS",
    config_rss_remove_btn: "Supprimer",
    config_tmdb_key: "Clé API TMDB",
    config_rpdb_title: "Rating Poster DataBase aka RPDB",
    config_rpdb_enable: "Activer",
    config_rpdb_examples: "exemples",
    config_rpdb_get_key: "Obtenir une clé gratuite en créant un compte",
    config_rpdb_placeholder: "Votre clé API RPDB",
    config_proxy_title: "Proxy",
    config_proxy_enable: "Activer",
    config_proxy_protocol: "Protocole",
    config_proxy_host: "Hôte",
    config_proxy_port: "Port",
    config_proxy_username: "Utilisateur (optionnel)",
    config_proxy_password: "Mot de passe (optionnel)",
    config_auto_sync_title: "Synchronisation automatique",
    config_auto_sync_enable: "Activer",
    config_refresh_interval: "Intervalle de rafraîchissement (minutes)",
    config_refresh_hint: "Minimum : 15 minutes | Maximum : 1440 minutes (24h) | Par défaut : 180 minutes (3h)",
    config_discord_title: "Notifications Discord à la suite d'une synchronisation",
    config_discord_enable: "Activer",
    config_discord_webhook: "Webhook",
    config_discord_webhook_hint: "Créer un webhook dans Paramètres du serveur > Intégrations > Webhooks",
    config_discord_enhanced: "Afficher les 5 derniers ajouts de chaque catalogue",
    config_discord_enhanced_hint: "Affiche les 5 dernières affiches",
    config_discord_rpdb: "Utiliser les affiches RPDB pour Discord",
    config_discord_rpdb_hint: "Nécessite une clé API RPDB configurée",
    config_save: "Enregistrer",
    config_saved: "✓ Configuration sauvegardée",
    config_error_network: "✗ Erreur réseau",

    // Sync section
    sync_title: "Synchronisation",
    sync_auto_label: "Synchronisation automatique :",
    sync_auto_enabled: "✓ Activée (toutes les {interval} minutes)",
    sync_auto_disabled: "✗ Désactivée (synchronisation manuelle uniquement)",
    sync_start_btn: "▶️ Lancer manuellement la récupération des flux RSS et le matching avec TMDB",
    sync_in_progress: "En cours...",
    sync_waiting: "En attente",
    sync_progress: "Progression",
    sync_matched_label: "Matchées",
    sync_unprocessed: "Non traitées",

    // Install
    install_title: "Installation dans Stremio",
    install_desc: "Une fois la 1ère synchronisation terminée OU à chaque modification apportée sur la WebUI, (ré)installer l'addon dans Stremio avec cette URL :",
    install_loading: "Chargement...",
    install_copy: "Copier",
    install_copied: "URL copiée !",
    install_copy_error: "Erreur lors de la copie",

    // Misc
    by: "Par",
    donate: "M'offrir des Dragibus :-)",
  },

  en: {
    // Login page
    login_subtitle: "Login to the administration interface",
    login_username: "Username",
    login_password: "Password",
    login_submit: "Log in",
    login_error_credentials: "Invalid credentials",
    login_error_network: "Network error",
    login_error_generic: "Login error",

    // Header
    logout: "Logout",

    // Description
    description_text: 'UseFlow-FR is a Stremio catalog creation addon from RSS feeds. It does not play content; for that, use streaming addons such as <a href="https://github.com/Telkaoss/stream-fusion" target="_blank">StreamFusion (BitTorrent)</a> or <a href="https://github.com/Sanket9225/UsenetStreamer" target="_blank">Usenet-Streamer</a> with <a href="https://github.com/nzbdav-dev/nzbdav" target="_blank">NZBdav (Usenet)</a>.<br>Tutorials on <a href="https://upandclear.org" target="_blank">my blog</a>, <a href="https://github.com/Aerya/Stremio-Stack" target="_blank">stack example</a> to self-host, <a href="https://stremiofr.com/" target="_blank">instances</a> shared by the StremioFR community.',

    // Stats
    stat_films: "Movies",
    stat_documentaires: "Documentaries",
    stat_indexed: "Indexed media",

    // Sync history
    sync_history_title: "Synchronization history",
    sync_history_desc: "For each release, UseFlow-FR searches for the corresponding media on TMDB and assigns it to a Movies or Documentaries catalog.<br>The gap between source releases in an RSS feed and media added to catalogs comes from releases that didn't match on TMDB (wrong/different name, no listing, TMDB timeout, multiple media with same name, etc.) and those referring to the same media (SD, HD, HDR, SDR, DV, UHD releases of the same movie for example) which are not counted. If a new release concerns media already in a catalog, it won't be pushed to the top of recent additions.",
    sync_browse: "Browse:",
    sync_last_3: "Last 3",
    sync_loading: "Loading...",
    sync_none: "No synchronization performed yet.",
    sync_none_date: "No synchronization for this date.",
    sync_duration: "Duration",
    sync_status: "Status",
    sync_completed: "✓ Completed",
    sync_error: "✗ Error",
    sync_running: "⏳ Running",
    sync_error_label: "Error",
    sync_releases: "Source releases",
    sync_matched: "Matched on TMDB",
    sync_match_rate: "Success rate",
    sync_already_in_db: "Already in DB",
    sync_new: "New",
    sync_films: "Movies",
    sync_docs: "Docs",
    sync_failed: "Unprocessed",

    // Config
    config_title: "Configuration",
    config_note: "This tool only processes releases tagged FRENCH/MULTi/TRUEFRENCH/VOF/VFF/VFI/VFQ.",
    config_rss_films: "Movies or Documentaries RSS Feed",
    config_rss_films_hint: "Including your API key or passkey",
    config_rss_additional_title: "Additional RSS Feeds",
    config_rss_additional_hint: "Same behavior as the main feed: Movies and Documentaries only, based on TMDB (no series).",
    config_rss_add_btn: "➕ Add an RSS feed",
    config_rss_remove_btn: "Remove",
    config_tmdb_key: "TMDB API Key",
    config_rpdb_title: "Rating Poster DataBase aka RPDB",
    config_rpdb_enable: "Enable",
    config_rpdb_examples: "examples",
    config_rpdb_get_key: "Get a free key by creating an account",
    config_rpdb_placeholder: "Your RPDB API key",
    config_proxy_title: "Proxy",
    config_proxy_enable: "Enable",
    config_proxy_protocol: "Protocol",
    config_proxy_host: "Host",
    config_proxy_port: "Port",
    config_proxy_username: "Username (optional)",
    config_proxy_password: "Password (optional)",
    config_auto_sync_title: "Automatic synchronization",
    config_auto_sync_enable: "Enable",
    config_refresh_interval: "Refresh interval (minutes)",
    config_refresh_hint: "Minimum: 15 minutes | Maximum: 1440 minutes (24h) | Default: 180 minutes (3h)",
    config_discord_title: "Discord notifications after synchronization",
    config_discord_enable: "Enable",
    config_discord_webhook: "Webhook",
    config_discord_webhook_hint: "Create a webhook in Server Settings > Integrations > Webhooks",
    config_discord_enhanced: "Show the 5 latest additions of each catalog",
    config_discord_enhanced_hint: "Displays the 5 latest posters",
    config_discord_rpdb: "Use RPDB posters for Discord",
    config_discord_rpdb_hint: "Requires a configured RPDB API key",
    config_save: "Save",
    config_saved: "✓ Configuration saved",
    config_error_network: "✗ Network error",

    // Sync section
    sync_title: "Synchronization",
    sync_auto_label: "Automatic synchronization:",
    sync_auto_enabled: "✓ Enabled (every {interval} minutes)",
    sync_auto_disabled: "✗ Disabled (manual sync only)",
    sync_start_btn: "▶️ Manually start RSS feed retrieval and TMDB matching",
    sync_in_progress: "In progress...",
    sync_waiting: "Waiting",
    sync_progress: "Progress",
    sync_matched_label: "Matched",
    sync_unprocessed: "Unprocessed",

    // Install
    install_title: "Install in Stremio",
    install_desc: "Once the first synchronization is complete OR after any WebUI change, (re)install the addon in Stremio with this URL:",
    install_loading: "Loading...",
    install_copy: "Copy",
    install_copied: "URL copied!",
    install_copy_error: "Copy error",

    // Misc
    by: "By",
    donate: "Buy me some Dragibus :-)",
  },

  de: {
    // Login page
    login_subtitle: "Anmeldung zur Administrationsoberfläche",
    login_username: "Benutzername",
    login_password: "Passwort",
    login_submit: "Anmelden",
    login_error_credentials: "Ungültige Anmeldedaten",
    login_error_network: "Netzwerkfehler",
    login_error_generic: "Anmeldefehler",

    // Header
    logout: "Abmelden",

    // Description
    description_text: 'UseFlow-FR ist ein Stremio-Addon zur Erstellung von Katalogen aus RSS-Feeds. Es spielt keine Inhalte ab; dafür verwenden Sie Streaming-Addons wie <a href="https://github.com/Telkaoss/stream-fusion" target="_blank">StreamFusion (BitTorrent)</a> oder <a href="https://github.com/Sanket9225/UsenetStreamer" target="_blank">Usenet-Streamer</a> mit <a href="https://github.com/nzbdav-dev/nzbdav" target="_blank">NZBdav (Usenet)</a>.<br>Anleitungen auf <a href="https://upandclear.org" target="_blank">meinem Blog</a>, <a href="https://github.com/Aerya/Stremio-Stack" target="_blank">Stack-Beispiel</a> zum Selbsthosten, <a href="https://stremiofr.com/" target="_blank">Instanzen</a> von der StremioFR-Community bereitgestellt.',

    // Stats
    stat_films: "Filme",
    stat_documentaires: "Dokumentarfilme",
    stat_indexed: "Indexierte Medien",

    // Sync history
    sync_history_title: "Synchronisierungsverlauf",
    sync_history_desc: "Für jede Veröffentlichung sucht UseFlow-FR das entsprechende Medium auf TMDB und ordnet es einem Filme- oder Dokumentarfilm-Katalog zu.<br>Die Differenz zwischen den Quell-Veröffentlichungen im RSS-Feed und den hinzugefügten Medien ergibt sich aus Veröffentlichungen, die nicht auf TMDB übereinstimmen (falscher/anderer Name, kein Eintrag, TMDB-Timeout, mehrere Medien mit gleichem Namen usw.) und solchen, die sich auf dasselbe Medium beziehen (SD, HD, HDR, SDR, DV, UHD-Versionen desselben Films), die nicht gezählt werden.",
    sync_browse: "Durchsuchen:",
    sync_last_3: "Die letzten 3",
    sync_loading: "Laden...",
    sync_none: "Bisher keine Synchronisierung durchgeführt.",
    sync_none_date: "Keine Synchronisierung für dieses Datum.",
    sync_duration: "Dauer",
    sync_status: "Status",
    sync_completed: "✓ Abgeschlossen",
    sync_error: "✗ Fehler",
    sync_running: "⏳ Läuft",
    sync_error_label: "Fehler",
    sync_releases: "Quell-Releases",
    sync_matched: "Auf TMDB gefunden",
    sync_match_rate: "Erfolgsrate",
    sync_already_in_db: "Bereits in DB",
    sync_new: "Neu",
    sync_films: "Filme",
    sync_docs: "Dokus",
    sync_failed: "Nicht verarbeitet",

    // Config
    config_title: "Konfiguration",
    config_note: "Dieses Tool verarbeitet nur Releases mit FRENCH/MULTi/TRUEFRENCH/VOF/VFF/VFI/VFQ-Tags.",
    config_rss_films: "RSS-Feed für Filme oder Dokumentarfilme",
    config_rss_films_hint: "Einschließlich Ihres API-Schlüssels oder Passkeys",
    config_rss_additional_title: "Zusätzliche RSS-Feeds",
    config_rss_additional_hint: "Gleiche Funktionsweise wie der Haupt-Feed: nur Filme und Dokumentarfilme, basierend auf TMDB (keine Serien).",
    config_rss_add_btn: "➕ RSS-Feed hinzufügen",
    config_rss_remove_btn: "Entfernen",
    config_tmdb_key: "TMDB API-Schlüssel",
    config_rpdb_title: "Rating Poster DataBase aka RPDB",
    config_rpdb_enable: "Aktivieren",
    config_rpdb_examples: "Beispiele",
    config_rpdb_get_key: "Kostenlosen Schlüssel durch Kontoerstellung erhalten",
    config_rpdb_placeholder: "Ihr RPDB API-Schlüssel",
    config_proxy_title: "Proxy",
    config_proxy_enable: "Aktivieren",
    config_proxy_protocol: "Protokoll",
    config_proxy_host: "Host",
    config_proxy_port: "Port",
    config_proxy_username: "Benutzername (optional)",
    config_proxy_password: "Passwort (optional)",
    config_auto_sync_title: "Automatische Synchronisierung",
    config_auto_sync_enable: "Aktivieren",
    config_refresh_interval: "Aktualisierungsintervall (Minuten)",
    config_refresh_hint: "Minimum: 15 Minuten | Maximum: 1440 Minuten (24h) | Standard: 180 Minuten (3h)",
    config_discord_title: "Discord-Benachrichtigungen nach einer Synchronisierung",
    config_discord_enable: "Aktivieren",
    config_discord_webhook: "Webhook",
    config_discord_webhook_hint: "Webhook erstellen unter Servereinstellungen > Integrationen > Webhooks",
    config_discord_enhanced: "Die 5 letzten Ergänzungen jedes Katalogs anzeigen",
    config_discord_enhanced_hint: "Zeigt die 5 letzten Poster an",
    config_discord_rpdb: "RPDB-Poster für Discord verwenden",
    config_discord_rpdb_hint: "Erfordert einen konfigurierten RPDB API-Schlüssel",
    config_save: "Speichern",
    config_saved: "✓ Konfiguration gespeichert",
    config_error_network: "✗ Netzwerkfehler",

    // Sync section
    sync_title: "Synchronisierung",
    sync_auto_label: "Automatische Synchronisierung:",
    sync_auto_enabled: "✓ Aktiviert (alle {interval} Minuten)",
    sync_auto_disabled: "✗ Deaktiviert (nur manuelle Synchronisierung)",
    sync_start_btn: "▶️ RSS-Feed-Abruf und TMDB-Abgleich manuell starten",
    sync_in_progress: "Läuft...",
    sync_waiting: "Wartet",
    sync_progress: "Fortschritt",
    sync_matched_label: "Übereinstimmend",
    sync_unprocessed: "Nicht verarbeitet",

    // Install
    install_title: "In Stremio installieren",
    install_desc: "Sobald die erste Synchronisierung abgeschlossen ist ODER nach jeder WebUI-Änderung, das Addon in Stremio mit dieser URL (neu) installieren:",
    install_loading: "Laden...",
    install_copy: "Kopieren",
    install_copied: "URL kopiert!",
    install_copy_error: "Kopierfehler",

    // Misc
    by: "Von",
    donate: "Spendier mir ein paar Dragibus :-)",
  }
};

// Current language (default: FR)
let currentLang = 'fr';

/**
 * Get a translation by key
 */
function t(key) {
  const lang = translations[currentLang] || translations.fr;
  return lang[key] || translations.fr[key] || key;
}

/**
 * Set the active language and apply translations
 */
function setLanguage(lang) {
  if (!translations[lang]) lang = 'fr';
  currentLang = lang;
  localStorage.setItem('useflow_lang', lang);
  applyTranslations();

  // Update select if it exists
  const select = document.getElementById('langSelect');
  if (select) select.value = lang;
}

/**
 * Apply translations to all elements with data-i18n attribute
 */
function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const value = t(key);
    if (value) {
      // For elements that contain HTML (like descriptions), use innerHTML
      if (el.hasAttribute('data-i18n-html')) {
        el.innerHTML = value;
      } else if (el.tagName === 'INPUT' && el.type !== 'checkbox') {
        // For inputs, set placeholder
        if (el.hasAttribute('data-i18n-placeholder')) {
          el.placeholder = value;
        }
      } else {
        el.textContent = value;
      }
    }
  });
}

/**
 * Initialize i18n - call this on page load
 */
function initI18n() {
  const saved = localStorage.getItem('useflow_lang');
  if (saved && translations[saved]) {
    currentLang = saved;
  } else {
    // Try to detect from browser
    const browserLang = navigator.language?.substring(0, 2);
    if (translations[browserLang]) {
      currentLang = browserLang;
    }
  }

  // Set select value
  const select = document.getElementById('langSelect');
  if (select) select.value = currentLang;

  applyTranslations();
}
