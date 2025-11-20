/**
 * UseFlow-FR Dashboard Logic
 * Handles all client-side interactions, data loading, and UI updates.
 */

// --- Global Functions (attached to window for HTML access) ---

window.copyInstallUrl = function () {
    const urlToCopy = document.getElementById('installUrl').textContent;

    // Modern API
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(urlToCopy).then(function () {
            alert('URL copiée !');
        }).catch(function (err) {
            console.error('Async: Could not copy text: ', err);
            fallbackCopyTextToClipboard(urlToCopy);
        });
    } else {
        fallbackCopyTextToClipboard(urlToCopy);
    }
};

function fallbackCopyTextToClipboard(text) {
    var textArea = document.createElement("textarea");
    textArea.value = text;

    // Avoid scrolling to bottom
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        var successful = document.execCommand('copy');
        if (successful) {
            alert('URL copiée !');
        } else {
            alert('Erreur lors de la copie (fallback)');
        }
    } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
        alert('Erreur lors de la copie :(');
    }

    document.body.removeChild(textArea);
}

window.toggleTheme = function () {
    const body = document.body;
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    // Update button text
    const btn = document.getElementById('themeToggleBtn');
    if (btn) {
        btn.textContent = newTheme === 'dark' ? 'Ta gueule !' : 'Ça va être tout noir !';
    }
};

window.startSync = async function () {
    try {
        const response = await fetch('/api/sync', { method: 'POST' });
        const data = await response.json();

        if (response.ok) {
            document.getElementById('syncStatus').style.display = 'block';
            checkSyncStatus();
            if (!window.syncInterval) {
                window.syncInterval = setInterval(checkSyncStatus, 2000);
            }
        } else {
            alert('Erreur: ' + data.error);
        }
    } catch (error) {
        alert('Erreur réseau');
    }
};

window.logout = async function () {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/';
};

// --- Internal Logic ---

let syncInterval = null;

async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        const stats = await response.json();

        const cards = document.querySelectorAll('.stat-card .value');
        if (cards.length >= 3) {
            cards[0].textContent = stats.films;
            cards[1].textContent = stats.documentaires;
            cards[2].textContent = stats.total;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadConfig() {
    try {
        const response = await fetch('/api/config');
        const config = await response.json();

        for (const [key, value] of Object.entries(config)) {
            const field = document.getElementById(key);
            if (field) {
                if (field.type === 'checkbox') {
                    field.checked = value === 'true';
                } else {
                    field.value = value;
                }
            }
        }

        updateAutoRefreshStatus(config);
    } catch (error) {
        console.error('Error loading config:', error);
    }
}

function updateAutoRefreshStatus(config) {
    const enabled = config.auto_refresh_enabled === 'true';
    const interval = config.refresh_interval || '180';
    const statusSpan = document.getElementById('autoRefreshState');

    if (statusSpan) {
        if (enabled) {
            statusSpan.innerHTML = '<span style="color: #48bb78;">✓ Activée (toutes les ' + interval + ' minutes)</span>';
        } else {
            statusSpan.innerHTML = '<span style="color: #e53e3e;">✗ Désactivée (synchronisation manuelle uniquement)</span>';
        }
    }
}

async function checkSyncStatus() {
    try {
        const response = await fetch('/api/sync/status');
        const status = await response.json();

        if (!status.running && window.syncInterval) {
            clearInterval(window.syncInterval);
            window.syncInterval = null;
            loadStats();
        }

        const syncStageEl = document.getElementById('syncStage');
        if (syncStageEl) syncStageEl.textContent = status.stage || 'En attente';

        if (status.total > 0) {
            const percent = Math.round((status.progress / status.total) * 100);
            const fill = document.getElementById('progressFill');
            const text = document.getElementById('progressText');
            const details = document.getElementById('syncDetails');

            if (fill) fill.style.width = percent + '%';
            if (text) text.textContent = percent + '%';
            if (details) details.textContent = 'Progression: ' + status.progress + '/' + status.total + ' | Matchées: ' + status.matched + ' | Non traitées: ' + status.failed;
        }

        if (status.completed || status.error) {
            const fill = document.getElementById('progressFill');
            const text = document.getElementById('progressText');

            if (fill) fill.style.width = '100%';
            if (text) text.textContent = status.error ? 'Erreur' : '✓ Terminée';

            setTimeout(loadSyncHistory, 1000);
        }
    } catch (error) {
        console.error('Error checking sync status:', error);
    }
}

async function loadSyncHistory() {
    try {
        const response = await fetch('/api/sync/history?limit=3');
        const history = await response.json();

        const container = document.getElementById('syncHistoryContainer');
        if (!container) return;

        if (history.length === 0) {
            container.innerHTML = '<p style="color: #666;">Aucune synchronisation effectuée pour le moment.</p>';
            return;
        }

        container.innerHTML = history.map(sync => {
            const startDate = new Date(sync.started_at);
            const duration = sync.finished_at ? Math.round((sync.finished_at - sync.started_at) / 1000) : 0;
            const statusClass = sync.status === 'error' ? 'error' : (sync.status === 'running' ? 'running' : '');
            const statusText = sync.status === 'completed' ? '✓ Terminée' : (sync.status === 'error' ? '✗ Erreur' : '⏳ En cours');
            const matchRate = sync.total_items > 0 ? Math.round((sync.matched_items / sync.total_items) * 100) : 0;
            const newItems = (sync.matched_items - (sync.already_in_db || 0));

            return `
            <div class="history-item ${statusClass}">
                <div class="history-meta">
                    <strong>${startDate.toLocaleString('fr-FR')}</strong> | 
                    Durée: ${duration}s | 
                    Statut: <strong>${statusText}</strong>
                    ${sync.error_message ? '<br><span style="color: #e53e3e;">Erreur: ' + sync.error_message + '</span>' : ''}
                </div>
                <div class="history-stats">
                    <div class="history-stat">
                        <div class="history-stat-label">Releases sources</div>
                        <div class="history-stat-value">${sync.total_items}</div>
                    </div>
                    <div class="history-stat">
                        <div class="history-stat-label">Matchées sur TMDB</div>
                        <div class="history-stat-value" style="color: #48bb78;">${sync.matched_items}</div>
                    </div>
                    <div class="history-stat">
                        <div class="history-stat-label">Réussite</div>
                        <div class="history-stat-value">${matchRate}%</div>
                    </div>
                    <div class="history-stat">
                        <div class="history-stat-label">Déjà en base</div>
                        <div class="history-stat-value" style="color: #718096;">${sync.already_in_db || 0}</div>
                    </div>
                    <div class="history-stat">
                        <div class="history-stat-label">Nouvelles</div>
                        <div class="history-stat-value" style="color: #8b5cf6;">${newItems}</div>
                    </div>
                    <div class="history-stat">
                        <div class="history-stat-label">Films</div>
                        <div class="history-stat-value" style="color: #667eea;">+${sync.films_added}</div>
                    </div>
                    <div class="history-stat">
                        <div class="history-stat-label">Docs</div>
                        <div class="history-stat-value" style="color: #667eea;">+${sync.documentaires_added}</div>
                    </div>
                    <div class="history-stat">
                        <div class="history-stat-label">Non traitées</div>
                        <div class="history-stat-value" style="color: #e53e3e;">${sync.failed_items}</div>
                    </div>
                </div>
            </div>`;
        }).join('');
    } catch (error) {
        console.error('Error loading sync history:', error);
    }
}

async function loadSyncDates() {
    try {
        const response = await fetch('/api/sync/history/dates');
        const dates = await response.json();

        const select = document.getElementById('dateFilter');
        if (!select) return;

        const defaultOption = select.options[0];
        select.innerHTML = '';
        select.appendChild(defaultOption);

        dates.forEach(item => {
            const option = document.createElement('option');
            option.value = item.date;
            option.textContent = item.date + ' (' + item.count + ' sync' + (item.count > 1 ? 's' : '') + ')';
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading dates:', error);
    }
}

// Make available globally for the onchange event
window.loadSyncHistoryByDate = async function () {
    const dateEl = document.getElementById('dateFilter');
    if (!dateEl) return;

    const date = dateEl.value;

    if (!date) {
        loadSyncHistory();
        return;
    }

    try {
        const response = await fetch('/api/sync/history/by-date?date=' + date);
        const history = await response.json();

        const container = document.getElementById('syncHistoryContainer');
        if (!container) return;

        if (history.length === 0) {
            container.innerHTML = '<p style="color: #666;">Aucune synchronisation pour cette date.</p>';
            return;
        }

        // Reuse the same rendering logic (simplified for brevity, ideally refactor to a render function)
        container.innerHTML = history.map(sync => {
            // ... same rendering code as loadSyncHistory ...
            // For now, let's just call loadSyncHistory if the logic is identical, 
            // BUT the data source is different. 
            // To keep this file clean, I'll duplicate the render logic or create a helper.
            // Let's use a helper function for rendering.
            return renderSyncHistoryItem(sync);
        }).join('');
    } catch (error) {
        console.error('Error loading history by date:', error);
    }
};

function renderSyncHistoryItem(sync) {
    const startDate = new Date(sync.started_at);
    const duration = sync.finished_at ? Math.round((sync.finished_at - sync.started_at) / 1000) : 0;
    const statusClass = sync.status === 'error' ? 'error' : (sync.status === 'running' ? 'running' : '');
    const statusText = sync.status === 'completed' ? '✓ Terminée' : (sync.status === 'error' ? '✗ Erreur' : '⏳ En cours');
    const matchRate = sync.total_items > 0 ? Math.round((sync.matched_items / sync.total_items) * 100) : 0;
    const newItems = (sync.matched_items - (sync.already_in_db || 0));

    return `
    <div class="history-item ${statusClass}">
        <div class="history-meta">
            <strong>${startDate.toLocaleString('fr-FR')}</strong> | 
            Durée: ${duration}s | 
            Statut: <strong>${statusText}</strong>
            ${sync.error_message ? '<br><span style="color: #e53e3e;">Erreur: ' + sync.error_message + '</span>' : ''}
        </div>
        <div class="history-stats">
            <div class="history-stat">
                <div class="history-stat-label">Releases sources</div>
                <div class="history-stat-value">${sync.total_items}</div>
            </div>
            <div class="history-stat">
                <div class="history-stat-label">Matchées</div>
                <div class="history-stat-value" style="color: #48bb78;">${sync.matched_items}</div>
            </div>
            <div class="history-stat">
                <div class="history-stat-label">Réussite</div>
                <div class="history-stat-value">${matchRate}%</div>
            </div>
            <div class="history-stat">
                <div class="history-stat-label">Déjà en base</div>
                <div class="history-stat-value" style="color: #718096;">${sync.already_in_db || 0}</div>
            </div>
            <div class="history-stat">
                <div class="history-stat-label">Nouvelles</div>
                <div class="history-stat-value" style="color: #8b5cf6;">${newItems}</div>
            </div>
            <div class="history-stat">
                <div class="history-stat-label">Films</div>
                <div class="history-stat-value" style="color: #667eea;">+${sync.films_added}</div>
            </div>
            <div class="history-stat">
                <div class="history-stat-label">Docs</div>
                <div class="history-stat-value" style="color: #667eea;">+${sync.documentaires_added}</div>
            </div>
            <div class="history-stat">
                <div class="history-stat-label">Non traitées</div>
                <div class="history-stat-value" style="color: #e53e3e;">${sync.failed_items}</div>
            </div>
        </div>
    </div>`;
}

// --- Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Dashboard JS loaded');

    // 1. Theme Init
    try {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            document.body.setAttribute('data-theme', savedTheme);
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.body.setAttribute('data-theme', 'dark');
        }

        // Update button text based on current theme
        const currentTheme = document.body.getAttribute('data-theme');
        const btn = document.getElementById('themeToggleBtn');
        if (btn) {
            btn.textContent = currentTheme === 'dark' ? 'Ta gueule !' : 'Ça va être tout noir !';
        }
    } catch (e) {
        console.error('Theme init error:', e);
    }

    // 2. Install URL Init
    function setInstallUrl() {
        const el = document.getElementById('installUrl');
        if (el) {
            const url = window.location.origin + '/manifest.json';
            el.innerHTML = url;
            console.log('✓ Install URL set to:', url);
        }
    }
    setInstallUrl();

    // 3. Config Form Listener
    const configForm = document.getElementById('configForm');
    if (configForm) {
        configForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const config = {};

            // Read all form fields (text inputs, selects, etc.)
            const formData = new FormData(e.target);
            for (const [key, value] of formData.entries()) {
                config[key] = value;
            }

            // Handle all checkboxes explicitly (checked or not)
            const checkboxes = [
                'proxy_enabled',
                'auto_refresh_enabled',
                'rpdb_enabled',
                'discord_notifications_enabled',
                'discord_enhanced_notifications_enabled',
                'discord_rpdb_posters_enabled'
            ];
            
            checkboxes.forEach(id => {
                const checkbox = document.getElementById(id);
                if (checkbox) {
                    config[id] = checkbox.checked ? 'true' : 'false';
                    console.log(`[Config] ${id}: ${config[id]}`);
                }
            });

            try {
                const response = await fetch('/api/config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(config)
                });

                const data = await response.json();
                const msg = document.getElementById('configMessage');

                if (response.ok) {
                    msg.className = 'success';
                    msg.textContent = '✓ Configuration sauvegardée';
                    setTimeout(() => msg.textContent = '', 3000);
                    loadConfig();
                } else {
                    msg.className = 'error';
                    msg.textContent = '✗ ' + data.error;
                }
            } catch (error) {
                const msg = document.getElementById('configMessage');
                if (msg) {
                    msg.className = 'error';
                    msg.textContent = '✗ Erreur réseau';
                }
            }
        });
    }

    // 4. Initial Data Load
    loadStats();
    loadConfig();
    loadSyncHistory();
    loadSyncDates();

    // 5. Intervals
    setInterval(loadStats, 30000);
    setInterval(loadSyncHistory, 30000);
    setInterval(loadSyncDates, 60000);
});
