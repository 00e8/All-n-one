const lvl = require('../data/leveling');

const levelFormula = (level) => 5 * level * level + 50 * level + 100;

function levelFromXp(totalXp) {
    let level = 0;
    let remaining = totalXp;
    while (remaining >= levelFormula(level)) {
        remaining -= levelFormula(level);
        level++;
    }
    return { level, remainingXp: remaining };
}

function xpNeededForLevel(level) {
    let xp = 0;
    for (let l = 0; l < level; l++) xp += levelFormula(l);
    return xp;
}

function formatXP(xp) {
    if (xp >= 1_000_000) return `${(xp / 1_000_000).toFixed(1)}M`;
    if (xp >= 1_000) return `${(xp / 1_000).toFixed(1)}K`;
    return String(Math.round(xp));
}

function formatDuration(totalSeconds) {
    const safeSeconds = Math.max(0, Math.floor(totalSeconds ?? 0));
    const days = Math.floor(safeSeconds / 86400);
    const hours = Math.floor((safeSeconds % 86400) / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const seconds = safeSeconds % 60;
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
}

function progressBar(current, max, length = 12) {
    const filled = Math.max(0, Math.min(length, Math.round((current / max) * length)));
    const empty = length - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
}

function ordinal(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function rewardKey(level, roleId) {
    return `${level}:${roleId}`;
}

async function ensure(userId, guildId) {
    await lvl.ensureUser(userId, guildId);
    await lvl.ensureStreak(userId, guildId);
    await lvl.ensureGuildSettings(guildId);
}

async function getGuildXPConfig(guildId) {
    const s = await lvl.getGuildSettings(guildId);
    return {
        min: s?.xp_min ?? 15,
        max: s?.xp_max ?? 40,
        cooldownSecs: s?.xp_cooldown_secs ?? 0,
        voiceXpPerMin: s?.voice_xp_per_min ?? 10,
        voiceEnabled: (s?.voice_xp_enabled ?? 1) === 1,
    };
}

async function getProfile(userId, guildId) {
    const user = await lvl.getUser(userId, guildId);
    if (!user) return null;
    const streak = await lvl.getStreak(userId, guildId);
    const rank = await lvl.getRank(userId, guildId);
    const xp = parseInt(user.xp);
    const { level, remainingXp } = levelFromXp(xp);
    const xpForNext = levelFormula(level);

    return {
        ...user,
        xp,
        voice_secs: parseInt(user.voice_secs) || 0,
        messages: parseInt(user.messages) || 0,
        streak,
        rank,
        remainingXp,
        xpForNext,
        computedLevel: level,
    };
}

async function processUserMessage(userId, guildId, channelId, roleIds = []) {
    await ensure(userId, guildId);
    const now = lvl.nowTs();

    await lvl.incrementMessages(userId, guildId);

    let gained = 0;
    const isEligible =
        !(await lvl.isBlacklisted(guildId, channelId, 'channel')) &&
        !(await lvl.isBlacklisted(guildId, userId, 'user')) &&
        !(await Promise.all(roleIds.map((rid) => lvl.isBlacklisted(guildId, rid, 'role')))).some(Boolean);

    const user = await lvl.getUser(userId, guildId);
    const xpCfg = await getGuildXPConfig(guildId);
    const isOnCooldown = (now - (parseInt(user.last_xp_at) || 0)) < xpCfg.cooldownSecs;

    if (isEligible && !isOnCooldown) {
        const multipliers = await lvl.getMultipliers(guildId);
        let mult = 1.0;
        for (const m of multipliers) {
            if (m.type === 'channel' && m.target_id === channelId) mult = Math.max(mult, m.multiplier);
            if (m.type === 'role' && roleIds.includes(m.target_id)) mult = Math.max(mult, m.multiplier);
        }

        const streak = await lvl.getStreak(userId, guildId);
        let streakBonus = 1;
        if (streak?.last_claim_at) {
            const diff = now - parseInt(streak.last_claim_at);
            if (diff <= 36 * 3600) {
                streakBonus = 1 + streak.current * 0.10;
            }
        }

        const base = xpCfg.min + Math.floor(Math.random() * (xpCfg.max - xpCfg.min + 1));
        gained = Math.round(base * streakBonus * mult);
        await lvl.addXP(userId, guildId, gained, now);
    }

    await lvl.logMessage(userId, guildId, channelId, gained);

    if (gained <= 0) return { gained: 0, leveledUp: false };

    const fresh = await lvl.getUser(userId, guildId);
    const prevLevel = user.level;
    const { level: newLevel } = levelFromXp(parseInt(fresh.xp));

    let leveledUp = false;
    let rewards = [];
    if (newLevel > prevLevel) {
        await lvl.setLevel(userId, guildId, newLevel);
        leveledUp = true;
        rewards = await lvl.rewardsForLevel(guildId, newLevel);
    }

    return { gained, leveledUp, newLevel, prevLevel, totalXp: parseInt(fresh.xp), rewards };
}

async function addVoiceXP(userId, guildId, durationSecs) {
    const safeDurationSecs = Math.max(0, Math.floor(durationSecs ?? 0));
    if (safeDurationSecs <= 0) return 0;

    const settings = await lvl.getGuildSettings(guildId);
    await ensure(userId, guildId);

    const earnedMinutes = Math.floor(safeDurationSecs / 60);
    const rate = settings?.voice_xp_enabled === 0 ? 0 : (settings?.voice_xp_per_min ?? 10);
    const gained = earnedMinutes * rate;

    await lvl.addVoice(userId, guildId, safeDurationSecs, gained);
    if (gained <= 0) return 0;

    const user = await lvl.getUser(userId, guildId);
    const { level } = levelFromXp(parseInt(user.xp));
    if (level > user.level) await lvl.setLevel(userId, guildId, level);
    return gained;
}

async function giveXP(userId, guildId, amount) {
    await ensure(userId, guildId);
    const user = await lvl.getUser(userId, guildId);
    const newXp = Math.max(0, parseInt(user.xp) + amount);
    const { level } = levelFromXp(newXp);
    await lvl.setXP(userId, guildId, newXp, level);
    return { newXp, level, oldLevel: user.level };
}

async function resetXP(userId, guildId) {
    await ensure(userId, guildId);
    await lvl.setXP(userId, guildId, 0, 0);
    await lvl.resetStreak(userId, guildId, 0, null, 0);
}

async function setLevel(userId, guildId, level) {
    await ensure(userId, guildId);
    const user = await lvl.getUser(userId, guildId);
    const xpNeeded = xpNeededForLevel(level);
    await lvl.setXP(userId, guildId, xpNeeded, level);
    return { xpSet: xpNeeded, oldLevel: user.level };
}

function todayStr() {
    return new Date().toISOString().slice(0, 10);
}

async function claimStreak(userId, guildId) {
    await ensure(userId, guildId);
    const streak = await lvl.getStreak(userId, guildId);
    const now = lvl.nowTs();
    const today = todayStr();

    if (streak?.last_claim_at) {
        const diff = now - parseInt(streak.last_claim_at);

        if (diff < 12 * 3600) {
            return { success: false, reason: 'cooldown', nextAt: parseInt(streak.last_claim_at) + 12 * 3600 };
        }

        if (diff > 36 * 3600) {
            await lvl.resetStreak(userId, guildId, 1, today, now);
            await lvl.addXP(userId, guildId, 200, now);
            return { success: true, current: 1, best: Math.max(streak.best, 1), xpGained: 200 };
        }

        const next = streak.current + 1;
        await lvl.updateStreak(userId, guildId, next, today, now);
        await lvl.addXP(userId, guildId, 200, now);
        return { success: true, current: next, best: Math.max(streak.best, next), xpGained: 200 };
    }

    await lvl.updateStreak(userId, guildId, 1, today, now);
    await lvl.addXP(userId, guildId, 200, now);
    return { success: true, current: 1, best: 1, xpGained: 200 };
}

async function getRewardStatus(userId, guildId, heldRoleIds = []) {
    await ensure(userId, guildId);
    const settings = await lvl.getGuildSettings(guildId);
    const stackRewards = settings?.stack_rewards !== 0;
    const profile = await getProfile(userId, guildId);

    if (!profile) {
        return { profile: null, stackRewards, eligibleRewards: [], activeTierRewards: [], claimableRewards: [] };
    }

    const eligibleRewards = await lvl.rewardsForLevel(guildId, profile.computedLevel);
    const claimed = await lvl.listClaims(userId, guildId);
    const claimedKeys = new Set(claimed.map((c) => rewardKey(c.level, c.role_id)));

    const heldRoleSet = new Set(heldRoleIds);
    for (const reward of eligibleRewards) {
        const key = rewardKey(reward.level, reward.role_id);
        if (heldRoleSet.has(reward.role_id) && !claimedKeys.has(key)) {
            await lvl.addClaim(userId, guildId, reward.level, reward.role_id);
            claimedKeys.add(key);
        }
    }

    const highestEligibleLevel = eligibleRewards.length ? eligibleRewards[eligibleRewards.length - 1].level : null;
    const activeTierRewards = highestEligibleLevel === null
        ? []
        : eligibleRewards.filter((r) => r.level === highestEligibleLevel);

    const pendingRewards = eligibleRewards.filter((r) => !claimedKeys.has(rewardKey(r.level, r.role_id)) && !heldRoleSet.has(r.role_id));
    const claimableRewards = stackRewards
        ? pendingRewards
        : activeTierRewards.filter((r) => !claimedKeys.has(rewardKey(r.level, r.role_id)) && !heldRoleSet.has(r.role_id));

    return { profile, stackRewards, eligibleRewards, activeTierRewards, claimableRewards };
}

async function markRewardsClaimed(userId, guildId, rewards = []) {
    for (const reward of rewards) {
        await lvl.addClaim(userId, guildId, reward.level, reward.role_id);
    }
}

function replacePlaceholders(template, user, level, xp) {
    return template
        .replace(/{mention}/g, `<@${user.id}>`)
        .replace(/{username}/g, user.username)
        .replace(/{level}/g, level)
        .replace(/{xp}/g, formatXP(xp));
}

module.exports = {
    levelFormula, levelFromXp, xpNeededForLevel,
    formatXP, formatDuration, progressBar, ordinal,
    ensure, getGuildXPConfig, getProfile,
    processUserMessage, addVoiceXP, giveXP, resetXP, setLevel,
    claimStreak, getRewardStatus, markRewardsClaimed,
    replacePlaceholders,
};

/**
 * Project: hana
 * Author: nunu.58 (shutup)
 * Organization: HYZEX Development
 * GitHub: https://github.com/ 
 * License: Custom
 * © 2026 HYZEX Development. All rights reserved.
 */
