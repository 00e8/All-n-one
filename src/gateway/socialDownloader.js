// © Author:  
// https://discord.gg/wwv

const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    AttachmentBuilder,
    MessageFlags,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    Events,
} = require('discord.js');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const axios = require('axios');
const Tiktok = require('@tobyg74/tiktok-api-dl');
const { igdl, twitter } = require('btch-downloader');
const { instagramGetUrl } = require('instagram-url-direct');
const ffmpeg = require('fluent-ffmpeg');
const ffprobeInstaller = require('@ffprobe-installer/ffprobe');
const ffmpegStatic = require('ffmpeg-static');
const socialDownloader = require('../data/socialDownloader');
const cacheBus = require('../data/cacheBus');
const emojis = require('../emojis.json');
const { checkCooldown, storePendingReply, clearPendingReply } = require('../lib/cooldown');
const config = require('../config');

ffmpeg.setFfprobePath(ffprobeInstaller.path);
ffmpeg.setFfmpegPath(ffmpegStatic);

const enabledCache = new Map();
const CACHE_TTL = 30000;

setInterval(() => {
    const now = Date.now();
    for (const [k, v] of enabledCache) {
        if (now - v.ts >= CACHE_TTL) enabledCache.delete(k);
    }
}, 60000);

cacheBus.on('invalidate:socialDownloader', ({ guildId, enabled }) => {
    enabledCache.set(guildId, { val: enabled, ts: Date.now() });
});

async function isDownloaderEnabled(guildId) {
    const cached = enabledCache.get(guildId);
    if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.val;
    const val = await socialDownloader.isEnabled(guildId);
    enabledCache.set(guildId, { val, ts: Date.now() });
    return val;
}

function downloadToTemp(url, ext, headers = {}) {
    return new Promise((resolve, reject) => {
        const dest = path.join(os.tmpdir(), `media_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`);
        const file = fs.createWriteStream(dest);
        const proto = url.startsWith('https') ? https : http;
        const parsedUrl = new URL(url);
        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                ...headers,
            },
        };
        proto
            .get(options, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    file.close();
                    fs.unlink(dest, () => {});
                    return downloadToTemp(res.headers.location, ext, headers).then(resolve).catch(reject);
                }
                if (res.statusCode !== 200) {
                    file.close();
                    fs.unlink(dest, () => {});
                    return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
                }
                res.pipe(file);
                file.on('finish', () => file.close(() => resolve(dest)));
            })
            .on('error', (err) => {
                fs.unlink(dest, () => {});
                reject(err);
            });
    });
}
function remuxToMp4(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .outputOptions(['-c:v libx264', '-c:a aac', '-movflags +faststart', '-pix_fmt yuv420p'])
            .save(outputPath)
            .on('end', resolve)
            .on('error', reject);
    });
}
function mergeVideoAudio(videoPath, audioPath, outputPath) {
    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(videoPath)
            .input(audioPath)
            .outputOptions(['-c:v libx264', '-c:a aac', '-movflags +faststart', '-pix_fmt yuv420p', '-shortest'])
            .save(outputPath)
            .on('end', resolve)
            .on('error', reject);
    });
}
function getVideoMeta(filePath) {
    return new Promise((resolve) => {
        ffmpeg.ffprobe(filePath, (err, meta) => {
            if (err) return resolve(null);
            try {
                const videoStream = meta.streams.find((s) => s.codec_type === 'video');
                const width = videoStream?.width ?? 0;
                const height = videoStream?.height ?? 0;
                const frames = parseInt(videoStream?.nb_frames ?? '0', 10);
                const sizeMB = (meta.format.size / 1024 / 1024).toFixed(2);
                resolve({ width, height, frames, sizeMB });
            } catch {
                resolve(null);
            }
        });
    });
}

function resolveRedirect(url) {
    return new Promise((resolve, reject) => {
        const attempt = (currentUrl, hops = 0) => {
            if (hops > 10) return resolve(currentUrl);
            https
                .get(currentUrl, (res) => {
                    if (res.headers.location) attempt(res.headers.location, hops + 1);
                    else resolve(currentUrl);
                })
                .on('error', reject);
        };
        attempt(url);
    });
}

function extractUrl(text) {
    const match = text.match(/https?:\/\/[^\s]+/);
    return match ? match[0] : null;
}
function isTikTokUrl(url) {
    try {
        const u = new URL(url);
        if (!u.hostname.includes('tiktok.com')) return false;
        if (u.hostname.includes('vt.tiktok.com') || u.hostname.includes('vm.tiktok.com')) return true;
        return /\/(video|photo)\//i.test(u.pathname);
    } catch {
        return false;
    }
}

function isInstagramUrl(url) {
    return /instagram\.com\/(p|reel|tv)\//i.test(url);
}
function isTwitterUrl(url) {
    return /(twitter\.com|x\.com)\/\w+\/status\/\d+/i.test(url);
}
function isRedditUrl(url) {
    return /reddit\.com\/(r\/\w+\/(comments|s)\/|s\/)/i.test(url);
}
function mention(user) {
    return `<@${user.id}>`;
}

function normalizeIgdl(raw) {
    let list = [];
    if (raw?.result && Array.isArray(raw.result)) {
        list = raw.result.map((item) => (typeof item === 'string' ? item : item?.url)).filter(Boolean);
    } else if (Array.isArray(raw)) {
        list = raw.map((item) => (typeof item === 'string' ? item : item?.url)).filter(Boolean);
    } else if (raw?.url) {
        list = Array.isArray(raw.url) ? raw.url : [raw.url];
    }
    return [...new Set(list)];
}

function hashFile(filePath) {
    return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

async function fetchInstagramCarouselDirect(rawUrl) {
    try {
        const data = await instagramGetUrl(rawUrl);
        const details = Array.isArray(data?.media_details) ? data.media_details : [];
        if (details.length > 0) {
            const out = details
                .map((d) => ({ url: d.url, isVideo: d.type === 'video' }))
                .filter((item) => item.url);
            return out.length > 0 ? out : null;
        }
        const urls = Array.isArray(data?.url_list) ? data.url_list : [];
        if (urls.length > 0) {
            return urls.map((u) => ({ url: u, isVideo: null }));
        }
        return null;
    } catch (err) {
        return null;
    }
}

async function ensureFitsDiscord(filePath, guild, tempFiles) {
    const maxBytes = (guild?.premiumTier >= 2 ? 50 : 8) * 1024 * 1024;
    if (fs.statSync(filePath).size <= maxBytes) return filePath;

    const targetSizeMB = (maxBytes / 1024 / 1024) * 0.9;
    const meta = await getVideoMeta(filePath);
    if (!meta) throw new Error('Could not read video metadata for compression');

    const duration = await new Promise((resolve) => {
        ffmpeg.ffprobe(filePath, (err, info) => {
            resolve(err ? null : info?.format?.duration ?? null);
        });
    });
    if (!duration) throw new Error('Could not determine video duration for compression');

    const targetBitrateKbps = Math.floor((targetSizeMB * 8192) / duration);
    const videoBitrateKbps = Math.max(200, Math.floor(targetBitrateKbps * 0.9));
    const audioBitrateKbps = Math.max(32, Math.min(128, targetBitrateKbps - videoBitrateKbps));

    const compressedPath = path.join(os.tmpdir(), `compressed_${Date.now()}.mp4`);
    tempFiles.push(compressedPath);

    await new Promise((resolve, reject) => {
        ffmpeg(filePath)
            .outputOptions([
                `-b:v ${videoBitrateKbps}k`,
                `-maxrate ${videoBitrateKbps * 1.5}k`,
                `-bufsize ${videoBitrateKbps * 2}k`,
                `-b:a ${audioBitrateKbps}k`,
                '-c:v libx264',
                '-c:a aac',
                '-movflags +faststart',
                '-pix_fmt yuv420p',
                '-preset fast',
            ])
            .save(compressedPath)
            .on('end', resolve)
            .on('error', reject);
    });

    if (fs.statSync(compressedPath).size > maxBytes) {
        throw new Error('Video is too large even after compression');
    }
    return compressedPath;
}

function buildCV2Message({ headerText, footerText, mediaItems, files }) {
    const container = new ContainerBuilder();

    if (headerText) {
        container
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(headerText))
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
    }

    if (mediaItems && mediaItems.length > 0) {
        const gallery = new MediaGalleryBuilder().addItems(
            mediaItems.slice(0, 10).map((item) => new MediaGalleryItemBuilder().setURL(item.url))
        );
        container.addMediaGalleryComponents(gallery);
        if (footerText) {
            container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
        }
    }

    if (footerText) {
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${footerText}`));
    }

    return {
        components: [container],
        files: files ?? [],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { users: [] },
    };
}

function buildErrorCV2Message(text) {
    const container = new ContainerBuilder();
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
    return {
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { users: [] },
    };
}


const DOWNLOAD_COOLDOWN_MS = 10_000;
const DOWNLOAD_COOLDOWN_KEY = 'social-download';

function buildCooldownCV2Message(remaining) {
    const container = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`-# Command Cooldown`)
        )
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`-# Oi Stop You're doing it too fast. ${emojis.angry}\n-# Try again later in ${remaining}s`)
        );
    return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

function buildDuplicateLinkCV2Message(author) {
    const container = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`-# ${mention(author)} You've already sent this link before.`)
    );
    return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

async function handleTikTok(message, rawUrl) {
    await message.delete().catch(() => {});
    await message.channel.sendTyping();
    const tempFiles = [];

    try {
        let link = rawUrl;
        if (rawUrl.includes('vt.tiktok.com')) link = await resolveRedirect(rawUrl);
        link = link.split('?')[0];

        const result = await Tiktok.Downloader(link, { version: 'v3', showOriginalResponse: true });
        const attachments = [];
        const mediaItems = [];

        if (result.result?.type === 'image' && result.result.images?.length > 0) {
            const uniqueImages = [...new Set(result.result.images)].slice(0, 10);
            uniqueImages.forEach((img, i) => {
                const name = `image${i}.png`;
                attachments.push(new AttachmentBuilder(img, { name }));
                mediaItems.push({ url: `attachment://${name}` });
            });
        } else {
            let primaryVideoUrl = result.result?.videoSD || result.result?.videoHD;
            if (!primaryVideoUrl) {
                const fb = await axios.post(
                    'https://www.tikwm.com/api/',
                    new URLSearchParams({ url: link }),
                    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
                );
                primaryVideoUrl = fb.data?.data?.play || fb.data?.data?.hdplay;
            }
            if (!primaryVideoUrl) throw new Error('No video URL');

            const tmpPath = await downloadToTemp(primaryVideoUrl, '.mp4');
            tempFiles.push(tmpPath);

            const finalPath = await ensureFitsDiscord(tmpPath, message.guild, tempFiles);
            attachments.push(new AttachmentBuilder(finalPath, { name: 'video.mp4' }));
            mediaItems.push({ url: 'attachment://video.mp4' });
        }

        if (mediaItems.length === 0) throw new Error('No media found');
        const footerText = `${mention(message.author)} shared`;

        await message.channel.send(buildCV2Message({ footerText, mediaItems, files: attachments }));
    } catch (err) {
        console.error(`[TikTok] Failed: ${err.message}`);
        await message.channel.send(buildErrorCV2Message(`-# Failed, try again ${mention(message.author)}`));
    } finally {
        for (const f of tempFiles) fs.unlink(f, () => {});
    }
}

async function handleInstagram(message, rawUrl) {
    await message.delete().catch(() => {});
    await message.channel.sendTyping();
    const tempFiles = [];

    try {
        let items = await fetchInstagramCarouselDirect(rawUrl);

        if (!items || items.length === 0) {
            const rawIgdl = await igdl(rawUrl);
            const rawUrls = normalizeIgdl(rawIgdl);
            if (rawUrls.length === 0) throw new Error('No media found');
            items = rawUrls.slice(0, 10).map((u) => ({ url: u, isVideo: null }));
        } else {
            items = items.slice(0, 10);
        }

        const attachments = [];
        const mediaItems = [];
        const seenHashes = new Set();

        const first = items[0];
        const firstExt = first.isVideo === false ? '.jpg' : '.mp4';
        const firstTmp = await downloadToTemp(first.url, firstExt);
        tempFiles.push(firstTmp);

        let isVideo = first.isVideo;
        if (isVideo === null || isVideo === undefined) {
            const firstMeta = await getVideoMeta(firstTmp);
            isVideo = firstMeta && firstMeta.frames > 1;
        }

        if (isVideo) {
            const finalPath = await ensureFitsDiscord(firstTmp, message.guild, tempFiles);
            attachments.push(new AttachmentBuilder(finalPath, { name: 'video.mp4' }));
            mediaItems.push({ url: 'attachment://video.mp4' });
        } else {
            const name0 = 'media0.jpg';
            attachments.push(new AttachmentBuilder(firstTmp, { name: name0 }));
            mediaItems.push({ url: `attachment://${name0}` });
            seenHashes.add(hashFile(firstTmp));

            for (let i = 1; i < items.length; i++) {
                const item = items[i];
                const ext = item.isVideo ? '.mp4' : '.jpg';
                const tmp = await downloadToTemp(item.url, ext);
                tempFiles.push(tmp);

                const hash = hashFile(tmp);
                if (seenHashes.has(hash)) {
                    continue;
                }
                seenHashes.add(hash);

                const name = item.isVideo ? `media${i}.mp4` : `media${i}.jpg`;
                attachments.push(new AttachmentBuilder(tmp, { name }));
                mediaItems.push({ url: `attachment://${name}` });
            }
        }

        const footerText = `${mention(message.author)} shared`;
        await message.channel.send(buildCV2Message({ footerText, mediaItems, files: attachments }));
    } catch (err) {
        console.error(`[Instagram] Failed: ${err.message}`);
        await message.channel.send(buildErrorCV2Message(`-# Failed, try again ${mention(message.author)}`));
    } finally {
        for (const f of tempFiles) fs.unlink(f, () => {});
    }
}

async function handleReddit(message, rawUrl) {
    await message.delete().catch(() => {});
    await message.channel.sendTyping();
    const tempFiles = [];

    try {
        let targetUrl = rawUrl;
        if (rawUrl.includes('/s/')) targetUrl = await resolveRedirect(rawUrl);
        const cleanUrl = targetUrl.split('?')[0].replace(/\/$/, '');
        const res = await axios.get(`${cleanUrl}.json`, {
            headers: { 'User-Agent': 'discord-media-bot/1.0', 'Accept': 'application/json' },
        });

        const post = res.data?.[0]?.data?.children?.[0]?.data;
        if (!post) throw new Error('Could not parse Reddit post');

        const attachments = [];
        const mediaItems = [];
        let finalTmp = null;

        if (post.is_video && post.media?.reddit_video) {
            const redditVideo = post.media.reddit_video;
            const rawFallback = redditVideo.fallback_url;
            const fallbackVideoUrl = rawFallback.split('?')[0];
            const queryString = rawFallback.includes('?') ? rawFallback.split('?')[1] : '';
            const baseUrl = fallbackVideoUrl.replace(/(DASH|CMAF)_[\w]+\.mp4/, '');
            const redditHeaders = { 'Referer': 'https://www.reddit.com/', 'Origin': 'https://www.reddit.com' };

            const videoUrl = fallbackVideoUrl;
            const audioUrl = `${baseUrl}DASH_audio.mp4${queryString ? '?' + queryString : ''}`;

            const videoTmp = await downloadToTemp(videoUrl, '_video.mp4', redditHeaders);
            tempFiles.push(videoTmp);

            if (redditVideo.has_audio) {
                try {
                    const audioTmp = await downloadToTemp(audioUrl, '_audio.mp4', redditHeaders);
                    tempFiles.push(audioTmp);
                    finalTmp = path.join(os.tmpdir(), `merged_${Date.now()}.mp4`);
                    tempFiles.push(finalTmp);
                    await mergeVideoAudio(videoTmp, audioTmp, finalTmp);
                } catch {
                    finalTmp = path.join(os.tmpdir(), `remuxed_${Date.now()}.mp4`);
                    tempFiles.push(finalTmp);
                    await remuxToMp4(videoTmp, finalTmp);
                }
            } else {
                finalTmp = path.join(os.tmpdir(), `remuxed_${Date.now()}.mp4`);
                tempFiles.push(finalTmp);
                await remuxToMp4(videoTmp, finalTmp);
            }

            finalTmp = await ensureFitsDiscord(finalTmp, message.guild, tempFiles);
            attachments.push(new AttachmentBuilder(finalTmp, { name: 'video.mp4' }));
            mediaItems.push({ url: 'attachment://video.mp4' });
        } else if (post.is_gallery && post.media_metadata) {
            Object.values(post.media_metadata)
                .filter((m) => m.status === 'valid')
                .slice(0, 10)
                .forEach((m, i) => {
                    const imgUrl = m.s?.u?.replace(/&amp;/g, '&');
                    if (!imgUrl) return;
                    const name = `image${i}.jpg`;
                    attachments.push(new AttachmentBuilder(imgUrl, { name }));
                    mediaItems.push({ url: `attachment://${name}` });
                });
        } else if (post.url && /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(post.url)) {
            attachments.push(new AttachmentBuilder(post.url, { name: 'image0.jpg' }));
            mediaItems.push({ url: 'attachment://image0.jpg' });
        }

        if (mediaItems.length === 0) throw new Error('No media found in post');
        const footerText = `${mention(message.author)} shared`;

        await message.channel.send(buildCV2Message({ footerText, mediaItems, files: attachments }));
    } catch (err) {
        console.error(`[Reddit] Failed: ${err.message}`);
        await message.channel.send(buildErrorCV2Message(`-# Failed, try again ${mention(message.author)}`));
    } finally {
        for (const f of tempFiles) fs.unlink(f, () => {});
    }
}

async function handleTwitter(message, rawUrl) {
    await message.delete().catch(() => {});
    await message.channel.sendTyping();
    const tempFiles = [];

    try {
        const data = await twitter(rawUrl);
        const entries = data?.url ?? [];
        if (entries.length === 0) throw new Error('No media found');

        const videoUrl = entries[0]?.sd || entries[0]?.hd;
        if (!videoUrl) throw new Error('No video URL');

        const tmpPath = await downloadToTemp(videoUrl, '.mp4');
        tempFiles.push(tmpPath);

        const finalPath = await ensureFitsDiscord(tmpPath, message.guild, tempFiles);
        const attachments = [new AttachmentBuilder(finalPath, { name: 'video.mp4' })];
        const mediaItems = [{ url: 'attachment://video.mp4' }];

        const footerText = `${mention(message.author)} shared`;
        await message.channel.send(buildCV2Message({ footerText, mediaItems, files: attachments }));
    } catch (err) {
        console.error(`[Twitter] Failed: ${err.message}`);
        await message.channel.send(buildErrorCV2Message(`-# Failed, try again ${mention(message.author)}`));
    } finally {
        for (const f of tempFiles) fs.unlink(f, () => {});
    }
}

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        if (message.author.bot || !message.guild) return;

        const enabled = await isDownloaderEnabled(message.guild.id);
        if (!enabled) return;

        const content = message.content.trim();
        const url = extractUrl(content);
        if (!url) return;

        let handler = null;
        if (isTikTokUrl(url)) handler = handleTikTok;
        else if (isInstagramUrl(url)) handler = handleInstagram;
        else if (isTwitterUrl(url)) handler = handleTwitter;
        else if (isRedditUrl(url)) handler = handleReddit;
        if (!handler) return;

        const isOwner = message.author.id === config.OWNER_ID;

        if (!isOwner && await socialDownloader.isDuplicateLink(message.author.id, url)) {
            await message.delete().catch(() => {});
            const dupMsg = await message.channel.send(buildDuplicateLinkCV2Message(message.author)).catch(() => null);
            if (dupMsg) setTimeout(() => dupMsg.delete().catch(() => {}), 5000);
            return;
        }

        if (!isOwner) {
            const { onCooldown, remaining } = checkCooldown(message.author.id, DOWNLOAD_COOLDOWN_KEY, DOWNLOAD_COOLDOWN_MS);
            if (onCooldown) {
                await message.delete().catch(() => {});
                const cooldownMsg = await message.channel.send(buildCooldownCV2Message(remaining)).catch(() => null);
                if (cooldownMsg) {
                    const timeoutId = setTimeout(async () => {
                        await cooldownMsg.delete().catch(() => {});
                        clearPendingReply(message.author.id);
                    }, parseFloat(remaining) * 1000);
                    storePendingReply(message.author.id, timeoutId, async () => {
                        await cooldownMsg.delete().catch(() => {});
                    });
                }
                return;
            }
        }

        if (!isOwner) await socialDownloader.rememberLink(message.author.id, url);
        handler(message, url);
    },
};

/**
 * Project: hana
 * Author: nunu.58 (shutup)
 * Organization: HYZEX Development
 * GitHub: https://github.com/ 
 * License: Custom
 * © 2026 HYZEX Development. All rights reserved.
 */