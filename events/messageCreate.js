const { Events } = require("discord.js");
const { XP_CONFIG } = require("../config/xp");
const { addXp } = require("../utils/xpStore");
const { updateMemberLevelRole } = require("../utils/xpRoles");
const { sendXpLog } = require("../utils/xpLogger");

const cooldowns = new Map();
const recentMessages = new Map();

function normalizeContent(content) {
    return content.trim().toLowerCase().replace(/\s+/g, " ");
}

function isRepeatedMessage(message) {
    const key = `${message.guild.id}:${message.author.id}`;
    const now = Date.now();
    const content = normalizeContent(message.content);
    const history = recentMessages.get(key) || [];
    const recent = history.filter(entry => now - entry.createdAt <= XP_CONFIG.repeatedMessageWindowMs);
    const sameContentCount = recent.filter(entry => entry.content === content).length;

    recent.push({ content, createdAt: now });
    recentMessages.set(key, recent.slice(-10));

    return sameContentCount >= XP_CONFIG.repeatedMessageLimit;
}

function canEarnMessageXp(message) {
    if (!message.guild || message.author.bot) return false;
    if (message.content.startsWith("/") || message.content.startsWith("!")) return false;
    if (message.content.trim().length < XP_CONFIG.minMessageLength) return false;
    if (XP_CONFIG.excludedChannelIds.includes(message.channel.id)) return false;
    if (isRepeatedMessage(message)) return false;

    const key = `${message.guild.id}:${message.author.id}`;
    const lastEarnedAt = cooldowns.get(key) || 0;

    if (Date.now() - lastEarnedAt < XP_CONFIG.messageCooldownMs) {
        return false;
    }

    cooldowns.set(key, Date.now());
    return true;
}

module.exports = {
    name: Events.MessageCreate,

    async execute(message, client) {
        if (!canEarnMessageXp(message)) {
            return;
        }

        try {
            const result = await addXp(message.guild.id, message.author.id, XP_CONFIG.xpPerMessage, {
                reason: "Mensaje valido",
                source: "message",
                incrementMessages: true
            });
            const member = await message.guild.members.fetch(message.author.id).catch(() => null);
            const roleResult = await updateMemberLevelRole(member, result.newLevel);

            if (result.levelChanged) {
                await sendXpLog(client, {
                    title: "Cambio de nivel",
                    action: `Nivel ${result.previousLevel} -> ${result.newLevel}`,
                    target: message.author,
                    amount: result.newXp,
                    reason: "XP por mensajes"
                });
            }

            if (roleResult.changed && roleResult.roleId) {
                await sendXpLog(client, {
                    title: "Cambio de rol de nivel",
                    action: "Rol asignado",
                    target: message.author,
                    amount: result.newXp,
                    reason: `<@&${roleResult.roleId}>`
                });
            }
        } catch (error) {
            console.error("Error al otorgar XP por mensaje:", error);
        }
    }
};
