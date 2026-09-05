const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");
const { calculateLevel, getNextLevelInfo } = require("./xpLevels");

const DATA_DIR = path.join(__dirname, "..", "data");
const DB_PATH = path.join(DATA_DIR, "xp.sqlite");

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");
db.exec(`
    CREATE TABLE IF NOT EXISTS xp_users (
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        xp INTEGER NOT NULL DEFAULT 0,
        valid_messages INTEGER NOT NULL DEFAULT 0,
        registered_events INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_xp_at TEXT,
        PRIMARY KEY (guild_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS xp_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        user_id TEXT,
        action TEXT NOT NULL,
        amount INTEGER NOT NULL DEFAULT 0,
        previous_xp INTEGER NOT NULL DEFAULT 0,
        new_xp INTEGER NOT NULL DEFAULT 0,
        reason TEXT,
        source TEXT,
        admin_id TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_xp_users_ranking
        ON xp_users (guild_id, xp DESC);
`);

function nowIso() {
    return new Date().toISOString();
}

function ensureUser(guildId, userId) {
    db.prepare(`
        INSERT OR IGNORE INTO xp_users (guild_id, user_id, created_at)
        VALUES (?, ?, ?)
    `).run(guildId, userId, nowIso());
}

function getRawUser(guildId, userId) {
    ensureUser(guildId, userId);

    return db.prepare(`
        SELECT guild_id, user_id, xp, valid_messages, registered_events, created_at, last_xp_at
        FROM xp_users
        WHERE guild_id = ? AND user_id = ?
    `).get(guildId, userId);
}

function insertHistory({ guildId, userId, action, amount, previousXp, newXp, reason, source, adminId }) {
    db.prepare(`
        INSERT INTO xp_history (
            guild_id, user_id, action, amount, previous_xp, new_xp, reason, source, admin_id, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        guildId,
        userId,
        action,
        amount,
        previousXp,
        newXp,
        reason || null,
        source || null,
        adminId || null,
        nowIso()
    );
}

function getRank(guildId, userId) {
    const user = getRawUser(guildId, userId);

    if (!user || user.xp <= 0) {
        return null;
    }

    const result = db.prepare(`
        SELECT COUNT(*) + 1 AS rank
        FROM xp_users
        WHERE guild_id = ? AND xp > ?
    `).get(guildId, user.xp);

    return result?.rank || null;
}

function mapUserStats(row, rank = null) {
    const nextLevel = getNextLevelInfo(row.xp);

    return {
        guildId: row.guild_id,
        userId: row.user_id,
        xp: row.xp,
        level: calculateLevel(row.xp),
        rank,
        validMessages: row.valid_messages,
        registeredEvents: row.registered_events,
        createdAt: row.created_at,
        lastXpAt: row.last_xp_at,
        nextLevel
    };
}

async function getUserStats(guildId, userId) {
    const user = getRawUser(guildId, userId);
    return mapUserStats(user, getRank(guildId, userId));
}

async function addXp(guildId, userId, amount, metadata = {}) {
    ensureUser(guildId, userId);

    const user = getRawUser(guildId, userId);
    const previousXp = user.xp;
    const newXp = Math.max(0, previousXp + amount);
    const previousLevel = calculateLevel(previousXp);
    const newLevel = calculateLevel(newXp);

    db.prepare(`
        UPDATE xp_users
        SET xp = ?,
            valid_messages = valid_messages + ?,
            registered_events = registered_events + ?,
            last_xp_at = ?
        WHERE guild_id = ? AND user_id = ?
    `).run(
        newXp,
        metadata.incrementMessages ? 1 : 0,
        metadata.incrementEvents ? 1 : 0,
        nowIso(),
        guildId,
        userId
    );

    insertHistory({
        guildId,
        userId,
        action: metadata.action || "add_xp",
        amount,
        previousXp,
        newXp,
        reason: metadata.reason,
        source: metadata.source,
        adminId: metadata.adminId
    });

    return {
        stats: await getUserStats(guildId, userId),
        previousXp,
        newXp,
        previousLevel,
        newLevel,
        levelChanged: newLevel > previousLevel
    };
}

async function addXpToUsers(guildId, userIds, amount, metadata = {}) {
    const uniqueIds = [...new Set(userIds.filter(Boolean))];
    const results = [];

    for (const userId of uniqueIds) {
        results.push(await addXp(guildId, userId, amount, metadata));
    }

    return results;
}

async function setXp(guildId, userId, amount, metadata = {}) {
    ensureUser(guildId, userId);

    const user = getRawUser(guildId, userId);
    const previousXp = user.xp;
    const newXp = Math.max(0, amount);

    db.prepare(`
        UPDATE xp_users
        SET xp = ?, last_xp_at = ?
        WHERE guild_id = ? AND user_id = ?
    `).run(newXp, nowIso(), guildId, userId);

    insertHistory({
        guildId,
        userId,
        action: metadata.action || "set_xp",
        amount: newXp,
        previousXp,
        newXp,
        reason: metadata.reason,
        source: metadata.source,
        adminId: metadata.adminId
    });

    return {
        stats: await getUserStats(guildId, userId),
        previousXp,
        newXp,
        changedXp: Math.abs(newXp - previousXp),
        previousLevel: calculateLevel(previousXp),
        newLevel: calculateLevel(newXp)
    };
}

async function removeXp(guildId, userId, amount, metadata = {}) {
    const user = getRawUser(guildId, userId);
    const newXp = Math.max(0, user.xp - amount);
    const removedXp = user.xp - newXp;
    const previousLevel = calculateLevel(user.xp);
    const newLevel = calculateLevel(newXp);

    db.prepare(`
        UPDATE xp_users
        SET xp = ?, last_xp_at = ?
        WHERE guild_id = ? AND user_id = ?
    `).run(newXp, nowIso(), guildId, userId);

    insertHistory({
        guildId,
        userId,
        action: "remove_xp",
        amount: removedXp,
        previousXp: user.xp,
        newXp,
        reason: metadata.reason,
        source: metadata.source || "admin",
        adminId: metadata.adminId
    });

    return {
        stats: await getUserStats(guildId, userId),
        previousXp: user.xp,
        newXp,
        changedXp: removedXp,
        previousLevel,
        newLevel,
        levelChanged: newLevel !== previousLevel
    };
}

async function resetUserXp(guildId, userId, metadata = {}) {
    return setXp(guildId, userId, 0, {
        ...metadata,
        action: "reset_xp",
        source: metadata.source || "admin"
    });
}

async function resetAllXp(guildId, metadata = {}) {
    const rows = db.prepare(`
        SELECT user_id, xp
        FROM xp_users
        WHERE guild_id = ? AND xp > 0
    `).all(guildId);
    let changedXp = 0;

    for (const row of rows) {
        changedXp += row.xp;

        insertHistory({
            guildId,
            userId: row.user_id,
            action: "reset_all_xp",
            amount: row.xp,
            previousXp: row.xp,
            newXp: 0,
            reason: metadata.reason,
            source: metadata.source || "admin",
            adminId: metadata.adminId
        });
    }

    db.prepare(`
        UPDATE xp_users
        SET xp = 0, last_xp_at = ?
        WHERE guild_id = ?
    `).run(nowIso(), guildId);

    return {
        affectedUsers: rows.length,
        changedXp,
        affectedUserIds: rows.map(row => row.user_id)
    };
}

async function getTopUsers(guildId, limit = 10) {
    const rows = db.prepare(`
        SELECT user_id, xp, valid_messages, registered_events, created_at, last_xp_at
        FROM xp_users
        WHERE guild_id = ? AND xp > 0
        ORDER BY xp DESC
        LIMIT ?
    `).all(guildId, limit);

    return rows.map((row, index) => ({
        ...mapUserStats({
            guild_id: guildId,
            user_id: row.user_id,
            xp: row.xp,
            valid_messages: row.valid_messages,
            registered_events: row.registered_events,
            created_at: row.created_at,
            last_xp_at: row.last_xp_at
        }, index + 1),
        position: index + 1
    }));
}

module.exports = {
    addXp,
    addXpToUsers,
    getTopUsers,
    getUserStats,
    removeXp,
    resetAllXp,
    resetUserXp,
    setXp
};
