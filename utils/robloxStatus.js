const { EmbedBuilder } = require('discord.js');

const CANAL_ALERTAS_ID = '1532631042630881290';
const ROL_NOTIFICACIONES_ID = '1545857316136685568';

const API_URL = 'https://roblox.statuspage.io/api/v2/summary.json';

let ultimoEstado = 'none';

function obtenerIconoYColor(statusIndicator) {
    switch (statusIndicator) {
        case 'minor':
            return { emoji: '🟡', color: 0xFEE75C };
        case 'major':
            return { emoji: '🟠', color: 0xE67E22 };
        case 'critical':
            return { emoji: '🔴', color: 0xED4245 };
        default:
            return { emoji: '🟢', color: 0x57F287 };
    }
}

function obtenerIconoComponente(componentStatus) {
    if (componentStatus === 'degraded_performance' || componentStatus === 'partial_outage') {
        return '⚠️';
    } else if (componentStatus === 'major_outage') {
        return '❌';
    }
    return '✅';
}

async function verificarEstadoRoblox(client) {
    try {
        const respuesta = await fetch(API_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://status.roblox.com/',
                'Cache-Control': 'no-cache'
            }
        });

        if (!respuesta.ok) {
            console.warn(`[Roblox API] Respuesta no válida. Código de estado: ${respuesta.status}`);
            return;
        }

        const data = await respuesta.json();
        const estadoActual = data.status.indicator;
        const descripcion = data.status.description;

        if (estadoActual !== 'none' && estadoActual !== ultimoEstado) {
            const { emoji, color } = obtenerIconoYColor(estadoActual);

            const componentesAfectados = data.components
                .filter(comp => comp.status !== 'operational')
                .map(comp => `${obtenerIconoComponente(comp.status)} **${comp.name}**: ${comp.status}`)
                .join('\n');

            const embed = new EmbedBuilder()
                .setTitle(`${emoji} Incidencia Detectada en Roblox`)
                .setDescription(`**Estado:** ${descripcion}\n\n**Servicios afectados:**\n${componentesAfectados || 'Sin detalle específico'}`)
                .setColor(color)
                .setFooter({ text: 'Monitoreo Automático | status.roblox.com' })
                .setTimestamp();

            const canal = await client.channels.fetch(CANAL_ALERTAS_ID);
            if (canal) {
                let contenidoMensaje = '';
                if (ROL_NOTIFICACIONES_ID === '@everyone') contenidoMensaje = '@everyone';
                else if (ROL_NOTIFICACIONES_ID) contenidoMensaje = `<@&${ROL_NOTIFICACIONES_ID}>`;

                await canal.send({ content: contenidoMensaje || null, embeds: [embed] });
            }

            ultimoEstado = estadoActual;

        } else if (estadoActual === 'none' && ultimoEstado !== 'none') {
            const canal = await client.channels.fetch(CANAL_ALERTAS_ID);
            if (canal) {
                await canal.send(`🟢 **Roblox se ha recuperado.** Todos los servicios operan con normalidad.`);
            }
            ultimoEstado = 'none';
        }

    } catch (error) {
        console.error('Error al verificar el estado de Roblox:', error.message);
    }
}

async function manejarComandoStatus(interaction) {
    await interaction.deferReply();

    try {
        const respuesta = await fetch(API_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://status.roblox.com/',
                'Cache-Control': 'no-cache'
            }
        });

        if (!respuesta.ok) {
            return await interaction.editReply(`❌ No se pudo obtener respuesta de los servidores de Roblox (Código ${respuesta.status}).`);
        }

        const data = await respuesta.json();
        const estadoActual = data.status.indicator;
        const descripcion = data.status.description;
        const { emoji, color } = obtenerIconoYColor(estadoActual);

        const detallesServicios = data.components
            .map(comp => `${obtenerIconoComponente(comp.status)} **${comp.name}**: ${comp.status}`)
            .join('\n');

        const embedStatus = new EmbedBuilder()
            .setTitle(`${emoji} Estado Actual de Roblox`)
            .setDescription(`**Estado general:** ${descripcion}\n\n**Detalle por servicio:**\n${detallesServicios}`)
            .setColor(color)
            .setFooter({ text: 'Fuente: status.roblox.com' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embedStatus] });

    } catch (error) {
        console.error('Error en /status:', error.message);
        await interaction.editReply('❌ Ocurrió un error al intentar consultar el estado de Roblox.');
    }
}

module.exports = {
    verificarEstadoRoblox,
    manejarComandoStatus
};