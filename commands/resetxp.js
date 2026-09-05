const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    SlashCommandBuilder
} = require("discord.js");
const { XP_CONFIG } = require("../config/xp");
const { executeXpAdminCommand } = require("../utils/xpAdmin");
const { resetAllXp } = require("../utils/xpStore");
const { sendXpLog } = require("../utils/xpLogger");
const { updateMemberLevelRole } = require("../utils/xpRoles");

const CONFIRM_TIMEOUT_MS = 60 * 1000;
const CUSTOM_ID_PREFIX = "resetxp";
const sessions = new Map();

function createSessionId() {
    return `${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
}

function customId(action, sessionId) {
    return `${CUSTOM_ID_PREFIX}:${action}:${sessionId}`;
}

function parseCustomId(id) {
    const [prefix, action, sessionId] = id.split(":");
    return prefix === CUSTOM_ID_PREFIX && action && sessionId ? { action, sessionId } : null;
}

function buildConfirmationRows(sessionId) {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(customId("confirm", sessionId)).setLabel("Confirmar").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(customId("cancel", sessionId)).setLabel("Cancelar").setStyle(ButtonStyle.Danger)
        )
    ];
}

function closeSession(session) {
    clearTimeout(session.timeout);
    sessions.delete(session.id);
}

async function resetAll(interaction, session) {
    await interaction.deferUpdate();

    try {
        const result = await resetAllXp(interaction.guild.id, {
            reason: "Reset global",
            source: "admin",
            adminId: interaction.user.id
        });

        for (const userId of result.affectedUserIds) {
            const member = await interaction.guild.members.fetch(userId).catch(() => null);
            await updateMemberLevelRole(member, 0);
        }

        await sendXpLog(interaction.client, {
            title: "Reset global de XP",
            action: "Reiniciar XP",
            target: "Todos los usuarios",
            admin: interaction.user,
            amount: result.changedXp,
            reason: "Sin motivo",
            details: `Usuarios afectados: ${result.affectedUsers}`
        });

        closeSession(session);

        const embed = new EmbedBuilder()
            .setColor(XP_CONFIG.logs.color)
            .setTitle("XP reiniciada")
            .addFields(
                { name: "Usuarios afectados", value: `${result.affectedUsers}`, inline: true },
                { name: "XP reiniciada", value: `${result.changedXp}`, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ content: "", embeds: [embed], components: [] });
    } catch (error) {
        console.error("Error al reiniciar XP global:", error);
        closeSession(session);
        await interaction.editReply({ content: "No se pudo reiniciar la XP.", embeds: [], components: [] });
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("resetxp")
        .setDescription("Reinicia la XP de un usuario o de todos")
        .addUserOption(option => option.setName("usuario").setDescription("Usuario").setRequired(false)),

    allowedRoleIds: XP_CONFIG.adminRoleIds,

    async execute(interaction) {
        const targetUser = interaction.options.getUser("usuario");

        if (targetUser) {
            await executeXpAdminCommand(interaction, "reset");
            return;
        }

        const session = {
            id: createSessionId(),
            userId: interaction.user.id,
            timeout: null
        };

        session.timeout = setTimeout(async () => {
            sessions.delete(session.id);
            await interaction.editReply({ content: "La confirmacion de reset XP expiro.", components: [] }).catch(() => null);
        }, CONFIRM_TIMEOUT_MS);

        sessions.set(session.id, session);

        await interaction.reply({
            content: "Vas a reiniciar la XP de todos los usuarios. Esta accion no se puede deshacer desde Discord.",
            components: buildConfirmationRows(session.id),
            ephemeral: true
        });
    },

    async handleComponent(interaction) {
        const parsedId = parseCustomId(interaction.customId);

        if (!parsedId) return false;

        const session = sessions.get(parsedId.sessionId);

        if (!session) {
            await interaction.reply({ content: "Esta confirmacion expiro o ya fue usada.", ephemeral: true });
            return true;
        }

        if (interaction.user.id !== session.userId) {
            await interaction.reply({ content: "Solo quien ejecuto /resetxp puede confirmar.", ephemeral: true });
            return true;
        }

        if (parsedId.action === "cancel") {
            closeSession(session);
            await interaction.update({ content: "Reset XP cancelado.", components: [] });
            return true;
        }

        if (parsedId.action === "confirm") {
            await resetAll(interaction, session);
            return true;
        }

        return false;
    }
};
