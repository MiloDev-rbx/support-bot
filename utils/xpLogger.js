const { EmbedBuilder } = require("discord.js");
const { XP_CONFIG } = require("../config/xp");

function formatTarget(target) {
    if (!target) {
        return "N/A";
    }

    if (typeof target === "string") {
        return target;
    }

    return `${target} (${target.tag})`;
}

async function sendXpLog(client, payload) {
    const channelId = XP_CONFIG.logs.channelId;

    if (!/^\d+$/.test(channelId)) {
        return false;
    }

    const channel = await client.channels.fetch(channelId).catch(() => null);

    if (!channel || !channel.isTextBased()) {
        return false;
    }

    const embed = new EmbedBuilder()
        .setColor(XP_CONFIG.logs.color)
        .setTitle(payload.title || "Registro de XP")
        .addFields(
            { name: "Accion", value: payload.action || "N/A", inline: true },
            { name: "Usuario", value: formatTarget(payload.target), inline: true },
            { name: "XP", value: `${payload.amount ?? 0}`, inline: true },
            { name: "Motivo", value: payload.reason || "Sin motivo", inline: false }
        )
        .setTimestamp();

    if (payload.admin) {
        embed.addFields({ name: "Administrador", value: formatTarget(payload.admin), inline: false });
    }

    if (payload.details) {
        embed.addFields({ name: "Detalle", value: payload.details, inline: false });
    }

    await channel.send({ embeds: [embed] }).catch(error => {
        console.error("No se pudo enviar el log de XP:", error);
    });

    return true;
}

module.exports = {
    sendXpLog
};
