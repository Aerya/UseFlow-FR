const axios = require('axios');
const sharp = require('sharp');

function getPosterUrl(item, rpdbEnabled, rpdbKey) {
    if (rpdbEnabled && rpdbKey && item.imdb_id) {
        return `https://api.ratingposterdb.com/${rpdbKey}/imdb/poster-default/${item.imdb_id}.jpg?fallback=true`;
    }
    return item.poster;
}

async function downloadImage(url) {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        return Buffer.from(response.data);
    } catch (error) {
        console.error(`[Discord] Failed to download image from ${url}:`, error.message);
        return null;
    }
}

async function createCompositeImage(items, rpdbEnabled, rpdbKey) {
    const posterWidth = 200; // Width per poster
    const posterHeight = 300; // Height per poster
    const spacing = 10; // Space between posters

    // Download all poster images
    const posterBuffers = await Promise.all(
        items.map(async (item) => {
            const posterUrl = getPosterUrl(item, rpdbEnabled, rpdbKey);
            return await downloadImage(posterUrl);
        })
    );

    // Filter out failed downloads
    const validPosters = posterBuffers.filter(buffer => buffer !== null);

    if (validPosters.length === 0) {
        return null;
    }

    // Resize all posters to uniform size
    const resizedPosters = await Promise.all(
        validPosters.map(buffer =>
            sharp(buffer)
                .resize(posterWidth, posterHeight, { fit: 'cover' })
                .toBuffer()
        )
    );

    // Calculate composite dimensions
    const totalWidth = (posterWidth * resizedPosters.length) + (spacing * (resizedPosters.length - 1));
    const totalHeight = posterHeight;

    // Create composite image
    const compositeInputs = resizedPosters.map((buffer, index) => ({
        input: buffer,
        left: index * (posterWidth + spacing),
        top: 0
    }));

    const composite = await sharp({
        create: {
            width: totalWidth,
            height: totalHeight,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
    })
        .composite(compositeInputs)
        .png()
        .toBuffer();

    return composite;
}

async function sendDiscordNotification(webhookUrl, syncStats) {
    if (!webhookUrl) {
        return;
    }

    try {
        const isSuccess = syncStats.status === 'completed';
        const color = isSuccess ? 0x48bb78 : 0xe53e3e;
        const title = isSuccess ? 'Synchronisation terminée' : '❌ Synchronisation échouée';

        // 1. Main Stats Embed
        const mainEmbed = {
            title: title,
            color: color,
            fields: [
                {
                    name: 'Ajoutés',
                    value: `Films : **${syncStats.filmsAdded || 0}**\nDocs : **${syncStats.documentairesAdded || 0}**`,
                    inline: true
                },
                {
                    name: 'Totaux',
                    value: `Films: **${syncStats.totalFilms || 0}**\nDocs: **${syncStats.totalDocs || 0}**`,
                    inline: true
                },
                {
                    name: 'En détails',
                    value: `Durée: **${syncStats.duration || 0}s**\nMatchées: **${syncStats.matched || 0}**\nNon traitées: **${syncStats.failed || 0}**`,
                    inline: false
                }
            ],
            timestamp: new Date().toISOString(),
            footer: {
                text: 'UseFlow-FR Stremio Addon'
            }
        };

        // Add error message if sync failed
        if (!isSuccess && syncStats.errorMessage) {
            mainEmbed.fields.push({
                name: '❌ Erreur',
                value: syncStats.errorMessage.substring(0, 1024),
                inline: false
            });
        }

        // Add WebUI URL if available
        if (syncStats.installUrl) {
            const webUIUrl = syncStats.installUrl.replace('/manifest.json', '/dashboard');
            mainEmbed.fields.push({
                name: 'WebUI',
                value: `[Aller sur la WebUI](${webUIUrl})`,
                inline: false
            });
        }

        // Send Main Embed
        await axios.post(webhookUrl, {
            username: 'UseFlow-FR',
            avatar_url: 'https://raw.githubusercontent.com/Aerya/UseFlow-FR/main/src/public/logo.png',
            embeds: [mainEmbed]
        });

        // 2. Poster Gallery - Composite images with posters side by side
        if (syncStats.recentAdditions) {
            const { rpdbEnabled, rpdbKey } = syncStats;

            // Send Films Gallery
            if (syncStats.recentAdditions.films && syncStats.recentAdditions.films.length > 0) {
                const compositeImage = await createCompositeImage(
                    syncStats.recentAdditions.films,
                    rpdbEnabled,
                    rpdbKey
                );

                if (compositeImage) {
                    const FormData = require('form-data');
                    const form = new FormData();

                    form.append('file', compositeImage, 'films.png');

                    const payload = {
                        username: 'UseFlow-FR',
                        avatar_url: 'https://raw.githubusercontent.com/Aerya/UseFlow-FR/main/src/public/logo.png',
                        embeds: [{
                            title: 'Derniers Films ajoutés',
                            color: 0x667eea,
                            image: {
                                url: 'attachment://films.png'
                            }
                        }]
                    };

                    form.append('payload_json', JSON.stringify(payload));

                    await axios.post(webhookUrl, form, {
                        headers: form.getHeaders()
                    });
                }
            }

            // Send Documentaries Gallery
            if (syncStats.recentAdditions.documentaires && syncStats.recentAdditions.documentaires.length > 0) {
                const compositeImage = await createCompositeImage(
                    syncStats.recentAdditions.documentaires,
                    rpdbEnabled,
                    rpdbKey
                );

                if (compositeImage) {
                    const FormData = require('form-data');
                    const form = new FormData();

                    form.append('file', compositeImage, 'documentaires.png');

                    const payload = {
                        username: 'UseFlow-FR',
                        avatar_url: 'https://raw.githubusercontent.com/Aerya/UseFlow-FR/main/src/public/logo.png',
                        embeds: [{
                            title: 'Derniers Documentaires ajoutés',
                            color: 0x48bb78,
                            image: {
                                url: 'attachment://documentaires.png'
                            }
                        }]
                    };

                    form.append('payload_json', JSON.stringify(payload));

                    await axios.post(webhookUrl, form, {
                        headers: form.getHeaders()
                    });
                }
            }
        }

        console.log('[Discord] Notification sent successfully');
    } catch (error) {
        console.error('[Discord] Failed to send notification:', error.message);
    }
}

module.exports = {
    sendDiscordNotification
};
