const { EmbedBuilder } = require('discord.js');

const CANAL_ALERTAS_ID = '1532631042630881290';
const ROL_NOTIFICACIONES_ID = '1545857316136685568';

// Ingresa tu API Key de ScraperAPI aquí
const SCRAPER_API_KEY = 'TU_SCRAPER_API_KEY_AQUI';

const EMOJIS = {
    OPERATIONAL: '<:Operational:1545848750025482240>',
    ISSUES: '<:IssuesDetected:1545848824050884779>',
    CRITICAL: '<:MajorOutage:1545848872012615820>'
};

// Petición a través de ScraperAPI para omitir Cloudflare (Bypasses 401, 403 y 503)
const TARGET_URL = encodeURIComponent('https://roblox.statuspage.io/api/v2/summary.json');
const API_URL = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${TARGET_URL}`;

let ultimoEstado = 'none';

function obtenerIconoYColor(statusIndicator) {
    switch (statusIndicator) {
        case 'minor':
            return { emoji: EMOJIS.OPERATIONAL, color: 0xFEE75C };
        case 'major':
            return { emoji: EMOJIS.ISSUES, color: 0xE67E22 };
        case 'critical':
            return { emoji: EMOJIS.CRITICAL, color: 0xED4245 };
        default:
            return { emoji: EMOJIS.OPERATIONAL, color: 0x57F287 };
    }
}

function obtenerIconoComponente(componentStatus) {
    if (componentStatus === 'degraded_performance' || componentStatus === 'partial_outage') {
        return EMOJIS.ISSUES;
    } else if (componentStatus === 'major_outage') {
        return EMOJIS.CRITICAL;
    }
    return EMOJIS.OPERATIONAL;
}

async function realizarPeticionAPI() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
        const respuesta = await fetch(API_URL, { signal: controller.signal });
        return respuesta;
    } finally {
        clearTimeout(timeout);
    }
}

async function verificarEstadoRoblox(client) {
    try {
        const respuesta = await realizarPeticionAPI();

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
                await canal.send(`${EMOJIS.OPERATIONAL} **Roblox se ha recuperado.** Todos los servicios operan con normalidad.`);
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
        const respuesta = await realizarPeticionAPI();

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