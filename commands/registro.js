const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const { XP_CONFIG } = require("../config/xp");
const { addXpToUsers } = require("../utils/xpStore");
const { updateMemberLevelRole } = require("../utils/xpRoles");
const { sendXpLog } = require("../utils/xpLogger");

// Cambia este valor por el ID del canal donde se enviaran los registros.
const REGISTROS_CHANNEL_ID = "1533251581208952882";

// Deja este arreglo vacio para permitir que todos usen /registro.
// Agrega IDs de roles para restringirlo, por ejemplo: ["123456789012345678"].
const ALLOWED_ROLE_IDS = [
    "1516323966740856942",
    "1527967894854697061",
    "1519266891674161252",
    "1519266732404113571",
    "1519266851077750804"
];

const EVENT_TYPES = [
    "T3",
    "GSP",
    "PVP",
    "SECFOR",
    "Gamenight",
    "Otro"
];

const EMBED_COLOR = 0x2f80ed;
const EMBED_FIELD_LIMIT = 1024;
const EMPTY_VALUE = "N/A";
const SECTION_SEPARATOR = "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501";

const ICONS = {
    clipboard: "\u{1F4CB}",
    microphone: "\u{1F3A4}",
    handshake: "\u{1F91D}",
    users: "\u{1F465}",
    label: "\u{1F3F7}\uFE0F",
    note: "\u{1F4DD}",
    image: "\u{1F5BC}\uFE0F"
};

function mention(userId) {
    return userId ? `<@${userId}>` : EMPTY_VALUE;
}

function parseMentionedUserIds(rawAttendees) {
    const matches = rawAttendees.matchAll(/<@!?(\d{17,20})>/g);
    return uniqueUserIds([...matches].map(match => match[1]));
}

function uniqueUserIds(userIds) {
    return [...new Set(userIds.filter(Boolean))];
}

function formatUserList(userIds) {
    if (!Array.isArray(userIds) || userIds.length === 0) {
        return EMPTY_VALUE;
    }

    const fullList = userIds.map(mention).join("\n");

    if (fullList.length <= EMBED_FIELD_LIMIT) {
        return fullList;
    }

    const visibleMentions = [];
    let currentLength = 0;

    for (const userId of userIds) {
        const userMention = mention(userId);
        const nextLength = currentLength + userMention.length + (visibleMentions.length > 0 ? 1 : 0);

        if (nextLength > EMBED_FIELD_LIMIT - 40) {
            break;
        }

        visibleMentions.push(userMention);
        currentLength = nextLength;
    }

    const hiddenCount = userIds.length - visibleMentions.length;
    return `${visibleMentions.join("\n")}\n...y ${hiddenCount} asistente(s) mas`;
}

function formatFooterDate(date = new Date()) {
    const formatter = new Intl.DateTimeFormat("es-AR", {
        timeZone: "America/Argentina/Buenos_Aires",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    });

    return formatter.format(date).replace(",", "");
}

async function filterGuildMemberIds(guild, userIds) {
    const checks = await Promise.all(
        userIds.map(async userId => {
            const member = await guild.members.fetch(userId).catch(() => null);
            return member ? userId : null;
        })
    );

    return uniqueUserIds(checks);
}

async function getRegistroChannel(client) {
    if (!/^\d+$/.test(REGISTROS_CHANNEL_ID)) {
        return null;
    }

    return client.channels.fetch(REGISTROS_CHANNEL_ID).catch(() => null);
}

function isImageAttachment(attachment) {
    return Boolean(attachment?.contentType?.startsWith("image/") || attachment?.url?.match(/\.(png|jpe?g|gif|webp)$/i));
}

function buildRegistroEmbed({ host, cohost, cohost2, eventType, attendeeIds, observations, image, interaction }) {
    const attendeesList = formatUserList(attendeeIds);
    const cohostsList = [cohost, cohost2]
        .filter(Boolean)
        .map(user => mention(user.id))
        .join("\n") || EMPTY_VALUE;
    const cleanObservations = observations && observations !== "Ninguna" ? observations : EMPTY_VALUE;

    const embed = new EmbedBuilder()
        .setColor(EMBED_COLOR)
        .setTitle(`${ICONS.clipboard} Registro de Evento`)
        .setDescription([
            "Registro oficial de actividad/evento.",
            "",
            SECTION_SEPARATOR
        ].join("\n"))
        .addFields(
            { name: `${ICONS.microphone} Host`, value: mention(host?.id), inline: true },
            { name: `${ICONS.handshake} Co-host`, value: cohostsList, inline: true },
            { name: `${ICONS.label} Tipo de Evento`, value: eventType || EMPTY_VALUE, inline: true },
            { name: `${ICONS.users} Asistentes`, value: attendeesList, inline: false },
            { name: `${ICONS.image} Imagen`, value: image ? `[Ver imagen](${image.url})` : EMPTY_VALUE, inline: false },
            { name: `${ICONS.note} Observaciones`, value: cleanObservations, inline: false },
            { name: SECTION_SEPARATOR, value: "\u200B", inline: false }
        );

    if (image) {
        embed.setImage(image.url);
    }

    return embed
        .setFooter({ text: `Registrado por @${interaction.user.username} \u2022 ${formatFooterDate()}` })
        .setTimestamp();
}

function getXpForAttendeeCount(attendeeCount) {
    return attendeeCount < XP_CONFIG.eventXp.minAttendeesForFullXp
        ? XP_CONFIG.eventXp.smallEventXp
        : XP_CONFIG.eventXp.fullEventXp;
}

function buildCommandData() {
    return new SlashCommandBuilder()
        .setName("registro")
        .setDescription("Registra un evento CHN")
        .addUserOption(option =>
            option
                .setName("host")
                .setDescription("Host del evento")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("tipo")
                .setDescription("Tipo de evento")
                .setRequired(true)
                .addChoices(
                    ...EVENT_TYPES.map(eventType => ({
                        name: eventType,
                        value: eventType
                    }))
                )
        )
        .addStringOption(option =>
            option
                .setName("asistentes")
                .setDescription("Menciona a los asistentes. Ejemplo: @Usuario1 @Usuario2 @Usuario3")
                .setRequired(true)
        )
        .addUserOption(option =>
            option
                .setName("co-host")
                .setDescription("Co-Host del evento")
                .setRequired(false)
        )
        .addUserOption(option =>
            option
                .setName("co-host2")
                .setDescription("Segundo Co-Host del evento")
                .setRequired(false)
        )
        .addStringOption(option =>
            option
                .setName("observaciones")
                .setDescription("Observaciones opcionales del evento")
                .setMaxLength(1000)
                .setRequired(false)
        )
        .addAttachmentOption(option =>
            option
                .setName("imagen")
                .setDescription("Imagen opcional del registro")
                .setRequired(false)
        );
}

module.exports = {
    data: buildCommandData(),

    allowedRoleIds: ALLOWED_ROLE_IDS,

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const host = interaction.options.getUser("host");
        const cohost = interaction.options.getUser("co-host");
        const cohost2 = interaction.options.getUser("co-host2");
        const eventType = interaction.options.getString("tipo");
        const rawAttendees = interaction.options.getString("asistentes");
        const observations = interaction.options.getString("observaciones")?.trim() || "Ninguna";
        const image = interaction.options.getAttachment("imagen");
        const parsedAttendeeIds = parseMentionedUserIds(rawAttendees);
        const attendeeIds = await filterGuildMemberIds(interaction.guild, parsedAttendeeIds);

        if (!host || !eventType || attendeeIds.length === 0) {
            await interaction.editReply({
                content: "Faltan datos obligatorios o no se detectaron menciones validas de miembros del servidor en asistentes. Usa el formato: @Usuario1 @Usuario2 @Usuario3."
            });
            return;
        }

        if (image && !isImageAttachment(image)) {
            await interaction.editReply({
                content: "El archivo adjunto debe ser una imagen valida."
            });
            return;
        }

        const channel = await getRegistroChannel(interaction.client);

        if (!channel || !channel.isTextBased()) {
            await interaction.editReply({
                content: "No se pudo encontrar el canal de registros. Revisa el ID configurado en el bot."
            });
            return;
        }

        const participantIds = uniqueUserIds([
            host.id,
            cohost?.id,
            cohost2?.id,
            ...attendeeIds
        ]);
        const xpPerParticipant = getXpForAttendeeCount(attendeeIds.length);

        try {
            const results = await addXpToUsers(interaction.guild.id, participantIds, xpPerParticipant, {
                reason: "Registro de evento",
                source: "event",
                eventType,
                adminId: interaction.user.id,
                incrementEvents: true
            });

            for (const result of results) {
                const member = await interaction.guild.members.fetch(result.stats.userId).catch(() => null);
                const roleResult = await updateMemberLevelRole(member, result.newLevel);

                if (roleResult.changed && roleResult.roleId) {
                    await sendXpLog(interaction.client, {
                        title: "Cambio de rol de nivel",
                        action: "Rol sincronizado",
                        target: member?.user || `<@${result.stats.userId}>`,
                        admin: interaction.user,
                        amount: result.newXp,
                        reason: `<@&${roleResult.roleId}>`,
                        details: `Nivel actual: ${result.newLevel}`
                    });
                }
            }

            const embed = buildRegistroEmbed({
                host,
                cohost,
                cohost2,
                eventType,
                attendeeIds,
                observations,
                image,
                interaction
            });

            await channel.send({ embeds: [embed] });

            await sendXpLog(interaction.client, {
                title: "Evento registrado",
                action: "XP por evento",
                target: `${participantIds.length} participante(s)`,
                admin: interaction.user,
                amount: xpPerParticipant,
                reason: eventType,
                details: `Registro enviado al canal ${channel}`
            });

            await interaction.editReply({
                content: `Registro enviado correctamente. Se otorgaron ${xpPerParticipant} XP a ${participantIds.length} participante(s).`
            });
        } catch (error) {
            console.error("Error al ejecutar /registro:", error);

            await interaction.editReply({
                content: "No se pudo completar el registro. Revisa la consola del bot para mas detalles."
            });
        }
    }
};
