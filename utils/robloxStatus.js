const Parser = require('rss-parser');
const { EmbedBuilder } = require('discord.js');

const parser = new Parser({
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) DiscordBot'
    }
});

const CANAL_ALERTAS_ID = '1532631042630881290';
const ROL_NOTIFICACIONES_ID = '1545857316136685568';

let ultimoGuid = null;

async function verificarEstadoRoblox(client) {
    try {
        const feed = await parser.parseURL('https://status.roblox.com/history.rss');
        if (!feed.items || feed.items.length === 0) return;

        const ultimaIncidencia = feed.items[0];
        const guidActual = ultimaIncidencia.guid || ultimaIncidencia.link;

        if (ultimoGuid === null) {
            ultimoGuid = guidActual;
            return;
        }

        if (guidActual !== ultimoGuid) {
            ultimoGuid = guidActual;

            const embed = new EmbedBuilder()
                .setTitle('📢 Actualización de Estado de Roblox')
                .setDescription(`**${ultimaIncidencia.title}**\n\n${ultimaIncidencia.contentSnippet || 'Sin descripción adicional.'}`)
                .setColor(0xE67E22)
                .setFooter({ text: 'Fuente: status.roblox.com (RSS)' })
                .setTimestamp();

            const canal = await client.channels.fetch(CANAL_ALERTAS_ID);
            if (canal) {
                let contenidoMensaje = '';
                if (ROL_NOTIFICACIONES_ID === '@everyone') contenidoMensaje = '@everyone';
                else if (ROL_NOTIFICACIONES_ID) contenidoMensaje = `<@&${ROL_NOTIFICACIONES_ID}>`;

                await canal.send({ content: contenidoMensaje || null, embeds: [embed] });
            }
        }
    } catch (error) {
        console.error('Error al verificar el RSS de Roblox:', error.message);
    }
}

async function manejarComandoStatus(interaction) {
    await interaction.deferReply();

    try {
        const feed = await parser.parseURL('https://status.roblox.com/history.rss');
        if (!feed.items || feed.items.length === 0) {
            return await interaction.editReply('❌ No se encontraron actualizaciones recientes.');
        }

        const ultima = feed.items[0];

        const embed = new EmbedBuilder()
            .setTitle('📊 Último Estado de Roblox')
            .setDescription(`**${ultima.title}**\n\n${ultima.contentSnippet || 'Sin descripción detallada.'}`)
            .setColor(0x57F287)
            .setFooter({ text: 'Fuente: status.roblox.com' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('Error en /status:', error.message);
        await interaction.editReply('❌ Ocurrió un error al intentar consultar el estado de Roblox.');
    }
}

module.exports = {
    verificarEstadoRoblox,
    manejarComandoStatus
};