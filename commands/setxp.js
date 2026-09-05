const { SlashCommandBuilder } = require("discord.js");
const { XP_CONFIG } = require("../config/xp");
const { executeXpAdminCommand } = require("../utils/xpAdmin");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("setxp")
        .setDescription("Establece la XP exacta de un usuario")
        .addUserOption(option => option.setName("usuario").setDescription("Usuario").setRequired(true))
        .addIntegerOption(option => option.setName("cantidad").setDescription("XP exacta").setMinValue(0).setRequired(true))
        .addStringOption(option => option.setName("motivo").setDescription("Motivo").setMaxLength(500).setRequired(false)),

    allowedRoleIds: XP_CONFIG.adminRoleIds,

    async execute(interaction) {
        await executeXpAdminCommand(interaction, "set");
    }
};
