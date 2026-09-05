const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

const PACKAGE_JSON_PATH = path.join(__dirname, "..", "package.json");

// Deja este arreglo vacio para permitir que todos usen /ping.
// Agrega IDs de roles para restringirlo, por ejemplo: ["123456789012345678"].
const ALLOWED_ROLE_IDS = [];
const PING_UPDATE_INTERVAL_MS = 15 * 60 * 1000;

function getPackageVersion() {
    try {
        const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, "utf8"));
        return packageJson.version || "0.0.0";
    } catch (error) {
        console.error("No se pudo leer la version del bot:", error.message);
        return "No disponible";
    }
}

function formatUptime(totalSeconds) {
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    const parts = [];

    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);

    return parts.join(" ");
}

function buildPingEmbed(client, responseLatency = null) {
    const websocketLatency = client.ws.ping;
    const uptime = formatUptime(process.uptime());
    const fields = [
        { name: "Version", value: getPackageVersion(), inline: true },
        { name: "WebSocket", value: `${websocketLatency}ms`, inline: true },
        { name: "Tiempo activo", value: uptime, inline: true },
        { name: "Actualizacion", value: "Cada 15 minutos", inline: true }
    ];

    if (responseLatency !== null) {
        fields.splice(1, 0, { name: "Velocidad", value: `${responseLatency}ms`, inline: true });
    }

    return new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle("Estado del Bot")
        .addFields(fields)
        .setFooter({ text: "CHN Support Bot" })
        .setTimestamp();
}

function startPingAutoUpdate(message, client) {
    const interval = setInterval(async () => {
        try {
            await message.edit({ embeds: [buildPingEmbed(client)] });
        } catch (error) {
            console.error("No se pudo actualizar el mensaje de /ping:", error.message);
            clearInterval(interval);
        }
    }, PING_UPDATE_INTERVAL_MS);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Muestra el estado y velocidad del bot"),

    allowedRoleIds: ALLOWED_ROLE_IDS,

    async execute(interaction) {
        const sentAt = Date.now();

        await interaction.deferReply();

        const responseLatency = Date.now() - sentAt;
        const message = await interaction.editReply({
            embeds: [buildPingEmbed(interaction.client, responseLatency)]
        });

        startPingAutoUpdate(message, interaction.client);
    }
};
