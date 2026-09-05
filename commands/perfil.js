const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const { XP_CONFIG } = require("../config/xp");
const { getUserStats } = require("../utils/xpStore");
const { getRoleIdForLevel } = require("../utils/xpRoles");

const HIDDEN_PROFILE_ROLE_IDS = [
    "1519256687624720414"
];

function getHighestRole(member) {
    return member.roles.cache
        .filter(role => role.id !== member.guild.id && !HIDDEN_PROFILE_ROLE_IDS.includes(role.id))
        .sort((firstRole, secondRole) => secondRole.position - firstRole.position)
        .first();
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("perfil")
        .setDescription("Muestra el perfil XP de un usuario")
        .addUserOption(option =>
            option.setName("usuario").setDescription("Usuario que quieres consultar").setRequired(false)
        ),

    allowedRoleIds: [],

    async execute(interaction) {
        await interaction.deferReply();

        const targetUser = interaction.options.getUser("usuario") || interaction.user;
        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!member) {
            await interaction.editReply({ content: "No pude encontrar a ese usuario dentro del servidor." });
            return;
        }

        try {
            const stats = await getUserStats(interaction.guild.id, targetUser.id);
            const highestRole = getHighestRole(member);
            const levelRoleId = getRoleIdForLevel(stats.level);
            const levelRole = levelRoleId ? `<@&${levelRoleId}>` : "Sin rol de nivel";

            const embed = new EmbedBuilder()
                .setColor(XP_CONFIG.logs.color)
                .setAuthor({ name: `Perfil de ${targetUser.username}`, iconURL: targetUser.displayAvatarURL({ size: 128 }) })
                .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
                .addFields(
                    { name: "XP total", value: `${stats.xp}`, inline: true },
                    { name: "Nivel", value: `${stats.level}`, inline: true },
                    { name: "Ranking", value: stats.rank ? `#${stats.rank}` : "N/A", inline: true },
                    { name: "Mensajes validos", value: `${stats.validMessages}`, inline: true },
                    { name: "Eventos", value: `${stats.registeredEvents}`, inline: true },
                    { name: "XP siguiente nivel", value: `${stats.nextLevel.remainingXp}`, inline: true },
                    { name: "Rol de nivel", value: levelRole, inline: true },
                    { name: "Cargo principal", value: highestRole ? highestRole.toString() : "Sin cargo", inline: true }
                )
                .setFooter({ text: interaction.client.user?.username || "Bot" })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error("Error al ejecutar /perfil:", error);
            await interaction.editReply({ content: "No pude consultar el perfil XP." });
        }
    }
};
