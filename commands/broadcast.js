const {
    SlashCommandBuilder,
    ChannelType,
    PermissionFlagsBits
} = require('discord.js');

// 👑 Usuarios autorizados para utilizar /broadcast
const AUTHORIZED_USERS = [
    '1028491975181213738'
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('broadcast')
        .setDescription('Envía un mensaje a un canal de CHN.')
        .addStringOption(option =>
            option
                .setName('mensaje')
                .setDescription('Mensaje que se enviará.')
                .setRequired(true)
                .setMaxLength(2000)
        )
        .addChannelOption(option =>
            option
                .setName('canal')
                .setDescription('Canal donde se enviará el mensaje.')
                .setRequired(true)
                .addChannelTypes(
                    ChannelType.GuildText,
                    ChannelType.GuildAnnouncement
                )
        ),

    async execute(interaction) {

        // 🔐 Comprobar autorización
        if (!AUTHORIZED_USERS.includes(interaction.user.id)) {
            return interaction.reply({
                content: '❌ No tienes permiso para utilizar este comando.',
                ephemeral: true
            });
        }

        // 🌐 Comprobar que se ejecuta dentro de un servidor
        if (!interaction.guild) {
            return interaction.reply({
                content: '❌ Este comando solo puede utilizarse dentro de un servidor.',
                ephemeral: true
            });
        }

        const mensaje = interaction.options.getString('mensaje', true);
        const canal = interaction.options.getChannel('canal', true);

        // 📢 Comprobar tipo de canal
        if (
            canal.type !== ChannelType.GuildText &&
            canal.type !== ChannelType.GuildAnnouncement
        ) {
            return interaction.reply({
                content: '❌ El canal seleccionado no es compatible.',
                ephemeral: true
            });
        }

        // 🔒 Comprobar permisos del bot
        const permisos = canal.permissionsFor(interaction.guild.members.me);

        if (!permisos?.has(PermissionFlagsBits.SendMessages)) {
            return interaction.reply({
                content: '❌ No tengo permiso para enviar mensajes en ese canal.',
                ephemeral: true
            });
        }

        try {

            // 📢 Enviar broadcast
            await canal.send({
                content: mensaje
            });

            // ✅ Confirmación
            return interaction.reply({
                content:
                    `✅ **Broadcast enviado correctamente.**\n\n` +
                    `📢 Canal: ${canal}\n` +
                    `📝 Mensaje: ${mensaje}`,
                ephemeral: true
            });

        } catch (error) {

            console.error(
                `❌ Error enviando broadcast en ${interaction.guild.name}:`,
                error
            );

            return interaction.reply({
                content: '❌ Ocurrió un error al enviar el broadcast.',
                ephemeral: true
            });
        }
    }
};