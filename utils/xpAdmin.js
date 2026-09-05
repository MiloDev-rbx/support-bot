const { EmbedBuilder } = require("discord.js");
const { XP_CONFIG } = require("../config/xp");
const { addXp, getUserStats, removeXp, resetUserXp, setXp } = require("./xpStore");
const { updateMemberLevelRole } = require("./xpRoles");
const { sendXpLog } = require("./xpLogger");

function normalizeReason(reason) {
    return reason?.trim() || "Sin motivo";
}

function validateXpAmount(amount) {
    return Number.isInteger(amount) && amount >= 0;
}

function getActionLabel(action) {
    const labels = {
        add: "Agregar XP",
        remove: "Quitar XP",
        set: "Establecer XP",
        reset: "Reiniciar XP"
    };

    return labels[action] || "Modificar XP";
}

async function applyXpAction(guildId, userId, action, amount, metadata) {
    if (action === "add") return addXp(guildId, userId, amount, { ...metadata, source: "admin" });
    if (action === "remove") return removeXp(guildId, userId, amount, { ...metadata, source: "admin" });
    if (action === "set") return setXp(guildId, userId, amount, { ...metadata, source: "admin" });
    if (action === "reset") return resetUserXp(guildId, userId, { ...metadata, source: "admin" });

    throw new Error(`Accion XP no soportada: ${action}`);
}

function buildAdminEmbed({ interaction, targetUser, actionLabel, amount, previousXp, newXp, reason, stats }) {
    return new EmbedBuilder()
        .setColor(XP_CONFIG.logs.color)
        .setTitle("XP actualizada")
        .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
        .addFields(
            { name: "Usuario", value: `${targetUser}`, inline: true },
            { name: "Accion", value: actionLabel, inline: true },
            { name: "XP modificada", value: `${amount}`, inline: true },
            { name: "XP anterior", value: `${previousXp}`, inline: true },
            { name: "XP actual", value: `${newXp}`, inline: true },
            { name: "Nivel", value: `${stats.level}`, inline: true },
            { name: "Motivo", value: reason, inline: false }
        )
        .setFooter({ text: interaction.client.user?.username || "Bot" })
        .setTimestamp();
}

async function executeXpAdminCommand(interaction, action) {
    await interaction.deferReply({ ephemeral: true });

    const targetUser = interaction.options.getUser("usuario");
    const amount = action === "reset" ? 0 : interaction.options.getInteger("cantidad");
    const reason = normalizeReason(interaction.options.getString("motivo"));

    if (!targetUser || (action !== "reset" && !validateXpAmount(amount))) {
        await interaction.editReply({
            content: "Debes indicar un usuario valido y una cantidad igual o mayor a 0."
        });
        return;
    }

    try {
        const before = await getUserStats(interaction.guild.id, targetUser.id);
        const result = await applyXpAction(interaction.guild.id, targetUser.id, action, amount, {
            reason,
            adminId: interaction.user.id
        });
        const after = result.stats;
        const changedXp = action === "set"
            ? Math.abs(result.newXp - result.previousXp)
            : action === "reset"
                ? result.previousXp
                : amount;

        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        const roleResult = await updateMemberLevelRole(member, after.level);

        const actionLabel = getActionLabel(action);
        const embed = buildAdminEmbed({
            interaction,
            targetUser,
            actionLabel,
            amount: changedXp,
            previousXp: before.xp,
            newXp: after.xp,
            reason,
            stats: after
        });

        const logSent = await sendXpLog(interaction.client, {
            title: "Accion administrativa de XP",
            action: actionLabel,
            target: targetUser,
            admin: interaction.user,
            amount: changedXp,
            reason,
            details: `XP: ${before.xp} -> ${after.xp} | Nivel: ${before.level} -> ${after.level}`
        });

        if (roleResult.changed && roleResult.roleId) {
            await sendXpLog(interaction.client, {
                title: "Cambio de rol de nivel",
                action: "Rol sincronizado",
                target: targetUser,
                admin: interaction.user,
                amount: after.xp,
                reason: `<@&${roleResult.roleId}>`,
                details: `Nivel actual: ${after.level}`
            });
        }

        const payload = { embeds: [embed] };

        if (!logSent) {
            payload.content = "XP actualizada, pero no pude enviar el log al canal configurado.";
        }

        await interaction.editReply(payload);
    } catch (error) {
        console.error(`Error al ejecutar comando administrativo XP (${action}):`, error);

        await interaction.editReply({
            content: "No se pudo actualizar la XP. Revisa la consola del bot para mas detalles."
        });
    }
}

module.exports = {
    executeXpAdminCommand,
    normalizeReason
};
