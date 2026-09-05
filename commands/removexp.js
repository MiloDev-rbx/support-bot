const { SlashCommandBuilder } = require("discord.js");
const { XP_CONFIG } = require("../config/xp");
const { executeXpAdminCommand } = require("../utils/xpAdmin");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("removexp")
        .setDescription("Quita XP a un usuario")
        .addUserOption(option => option.setName("usuario").setDescription("Usuario").setRequired(true))
        .addIntegerOption(option => option.setName("cantidad").setDescription("Cantidad de XP").setMinValue(0).setRequired(true))
        .addStringOption(option => option.setName("motivo").setDescription("Motivo").setMaxLength(500).setRequired(false)),

    allowedRoleIds: XP_CONFIG.adminRoleIds,

    async execute(interaction) {
        await executeXpAdminCommand(interaction, "remove");
    }
};
