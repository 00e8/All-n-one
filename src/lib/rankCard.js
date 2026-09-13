// © Author:  
// https://discord.gg/wwv

const path = require('path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

/**
 * Draws the 661x254 leveling card used both for level-up announcements
 * and for the /rank command, so both stay visually identical.
 */
async function renderLevelCard({
    avatarURL,
    username,
    level,
    xpInLevel,
    xpForNext,
    backgroundURL,
    title = 'YOUR RANK',
    formatXP = (n) => String(Math.round(n)),
}) {
    const progress = Math.min(1, xpForNext > 0 ? xpInLevel / xpForNext : 0);

    const canvas = createCanvas(661, 254);
    const ctx = canvas.getContext('2d');

    try {
        let bg;
        if (backgroundURL) {
            bg = await loadImage(backgroundURL).catch(() => null);
        }
        if (!bg) {
            bg = await loadImage(path.join(__dirname, '..', 'assets', 'levelbg.png'));
        }
        ctx.drawImage(bg, 0, 0, 661, 254);
    } catch {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 661, 254);
    }

    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, 661, 254);

    const avatar = await loadImage(avatarURL).catch(() => null);
    if (avatar) {
        const avatarSize = 110;
        const avatarX = 500;
        const avatarY = 70;

        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
        ctx.restore();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 3, 0, Math.PI * 2);
        ctx.stroke();
    }

    const barX = 40, barY = 40, barW = 12, barH = 170;
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 10);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(barX, barY + barH * (1 - progress), barW, barH * progress, 10);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(title, 70, 60);

    ctx.font = 'bold 22px sans-serif';
    let displayUsername = username || 'User';
    const maxWidth = 320;
    if (ctx.measureText(displayUsername).width > maxWidth) {
        while (ctx.measureText(displayUsername + '...').width > maxWidth) displayUsername = displayUsername.slice(0, -1);
        displayUsername += '...';
    }
    ctx.fillText(displayUsername, 70, 95);

    ctx.font = 'bold 40px sans-serif';
    ctx.fillText(`LVL ${level}`, 70, 150);

    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#dddddd';
    ctx.fillText(`${formatXP(xpInLevel)} / ${formatXP(xpForNext)} XP`, 70, 185);

    return canvas.toBuffer('image/png');
}

module.exports = { renderLevelCard };

/**
 * Project: hana
 * Author: nunu.58 (shutup)
 * Organization: HYZEX Development
 * GitHub: https://github.com/ 
 * License: Custom
 * © 2026 HYZEX Development. All rights reserved.
 */
