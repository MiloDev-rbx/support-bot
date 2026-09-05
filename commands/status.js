const { SlashCommandBuilder } = require('discord.js');
const { manejarComandoStatus } = require('../utils/robloxStatus.js'); // Ajusta la ruta si tu carpeta es diferente

module.exports = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('Muestra el estado actual de los servidores de Roblox'),
        
    async execute(interaction) {
        await manejarComandoStatus(interaction);
    }
};