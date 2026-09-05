const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const { XP_CONFIG } = require("../config/xp");
const { getTopUsers } = require("../utils/xpStore");

async function formatLine(guild, entry) {
    const member = await guild.members.fetch(entry.userId).catch(() => null);
    const userLabel = member ? `${member}` : "Usuario desconocido";
    return `#${entry.position} - ${userLabel} | Nivel ${entry.level} | ${entry.xp} XP`;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("leaderboard")
        .setDescription("Muestra el ranking de XP"),

    allowedRoleIds: XP_CONFIG.adminRoleIds,

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const topUsers = await getTopUsers(interaction.guild.id, XP_CONFIG.leaderboard.limit);
            const lines = await Promise.all(topUsers.map(entry => formatLine(interaction.guild, entry)));

            const embed = new EmbedBuilder()
                .setColor(XP_CONFIG.logs.color)
                .setTitle("Leaderboard de XP")
                .setDescription(lines.length > 0 ? lines.join("\n") : "Todavia no hay usuarios con XP.")
                .setFooter({ text: interaction.client.user?.username || "Bot" })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error("Error al ejecutar /leaderboard:", error);
            await interaction.editReply({ content: "No se pudo leer el ranking de XP." });
        }
    }
};
