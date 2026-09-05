const { EmbedBuilder } = require('discord.js');

const CANAL_ALERTAS_ID = '1532631042630881290';
const ROL_NOTIFICACIONES_ID = '1545857316136685568';

// Reemplaza esta URL con el endpoint de la API que deseas consultar
const API_URL = 'https://api.status.io/v2/status/TU_ID_DE_ESTADO';

let ultimoEstadoRegistrado = null;

async function verificarEstadoAPI(client) {
    try {
        const respuesta = await fetch(API_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) DiscordBot'
            }
        });

        if (!respuesta.ok) {
            console.warn(`[API Status] Error en la respuesta. Código: ${respuesta.status}`);
            return;
        }

        const data = await respuesta.json();

        // Ajusta estas propiedades según la estructura JSON específica de la API que uses
        const estadoActual = data.result?.status_overall?.status_code || 'normal';

        if (ultimoEstadoRegistrado !== null && estadoActual !== ultimoEstadoRegistrado) {
            const embed = new EmbedBuilder()
                .setTitle('⚠️ Cambio de Estado Detectado')
                .setDescription(`El estado actual del sistema ha cambiado a: **${estadoActual}**`)
                .setColor(0xE67E22)
                .setTimestamp();

            const canal = await client.channels.fetch(CANAL_ALERTAS_ID);
            if (canal) {
                let mencion = '';
                if (ROL_NOTIFICACIONES_ID === '@everyone') mencion = '@everyone';
                else if (ROL_NOTIFICACIONES_ID) mencion = `<@&${ROL_NOTIFICACIONES_ID}>`;

                await canal.send({ content: mencion || null, embeds: [embed] });
            }
        }

        ultimoEstadoRegistrado = estadoActual;

    } catch (error) {
        console.error('Error al conectar con la API:', error.message);
    }
}

async function manejarComandoStatus(interaction) {
    await interaction.deferReply();

    try {
        const respuesta = await fetch(API_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) DiscordBot'
            }
        });

        if (!respuesta.ok) {
            return await interaction.editReply('❌ No se pudo conectar con el servidor de la API.');
        }

        const data = await respuesta.json();
        const estadoActual = data.result?.status_overall?.status_name || 'Operacional';

        const embed = new EmbedBuilder()
            .setTitle('📊 Estado Actual')
            .setDescription(`El servicio se encuentra actualmente: **${estadoActual}**`)
            .setColor(0x57F287)
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('Error en el comando status:', error.message);
        await interaction.editReply('❌ Ocurrió un error inesperado al procesar la solicitud.');
    }
}

module.exports = {
    verificarEstadoAPI,
    manejarComandoStatus
};