const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const { XP_CONFIG } = require("../config/xp");
const { getUserStats } = require("../utils/xpStore");
const { getRoleIdForLevel, updateMemberLevelRole } = require("../utils/xpRoles");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("xp")
        .setDescription("Muestra tu XP y nivel"),

    allowedRoleIds: [],

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const stats = await getUserStats(interaction.guild.id, interaction.user.id);
            const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
            await updateMemberLevelRole(member, stats.level);

            const roleId = getRoleIdForLevel(stats.level);
            const roleLabel = roleId ? `<@&${roleId}>` : "Sin rol de nivel";

            const embed = new EmbedBuilder()
                .setColor(XP_CONFIG.logs.color)
                .setTitle("Tu progreso de XP")
                .setThumbnail(interaction.user.displayAvatarURL({ size: 256 }))
                .addFields(
                    { name: "XP total", value: `${stats.xp}`, inline: true },
                    { name: "Nivel", value: `${stats.level}`, inline: true },
                    { name: "Ranking", value: stats.rank ? `#${stats.rank}` : "N/A", inline: true },
                    { name: "XP para siguiente nivel", value: `${stats.nextLevel.remainingXp}`, inline: true },
                    { name: "Rol actual", value: roleLabel, inline: true }
                )
                .setFooter({ text: interaction.client.user?.username || "Bot" })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error("Error al ejecutar /xp:", error);
            await interaction.editReply({ content: "No pude consultar tu XP." });
        }
    }
};
