const { EmbedBuilder } = require('discord.js');

// Configuración
const CANAL_ALERTAS_ID = 'TU_ID_DE_CANAL_AQUI';
const ROL_NOTIFICACIONES_ID = 'TU_ID_DE_ROL_AQUI'; // O '@everyone' o '' si no quieres ping

const EMOJIS = {
    OPERATIONAL: '<:Operational:1545848750025482240>',
    ISSUES: '<:IssuesDetected:1545848824050884779>',
    CRITICAL: '<:MajorOutage:1545848872012615820>'
};

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

// Lógica para los anuncios automáticos
async function verificarEstadoRoblox(client) {
    try {
        const respuesta = await fetch('https://status.roblox.com/api/v2/summary.json');
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
        console.error('Error al verificar el estado de Roblox:', error);
    }
}

// Lógica para responder al comando /status
async function manejarComandoStatus(interaction) {
    await interaction.deferReply();

    try {
        const respuesta = await fetch('https://status.roblox.com/api/v2/summary.json');
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
        console.error('Error en /status:', error);
        await interaction.editReply('❌ Ocurrió un error al intentar consultar el estado de Roblox.');
    }
}

module.exports = {
    verificarEstadoRoblox,
    manejarComandoStatus
};