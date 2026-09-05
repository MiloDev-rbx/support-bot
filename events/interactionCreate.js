const { Events } = require("discord.js");
const { canUseCommand } = require("../utils/commandPermissions");

async function handleCommand(interaction, client) {
    const command = client.commands.get(interaction.commandName);

    if (!command) {
        await interaction.reply({
            content: "Este comando no esta cargado en el bot.",
            ephemeral: true
        });
        console.log(`Comando no encontrado: ${interaction.commandName}`);
        return;
    }

    if (!(await canUseCommand(interaction, command))) {
        return;
    }

    await command.execute(interaction);
}

async function handleComponent(interaction, client) {
    for (const command of client.commands.values()) {
        if (typeof command.handleComponent !== "function") {
            continue;
        }

        const handled = await command.handleComponent(interaction);

        if (handled) {
            return;
        }
    }

    await interaction.reply({
        content: "Esta interaccion ya no esta disponible o no pertenece a un comando activo.",
        ephemeral: true
    });
}

async function handleModal(interaction, client) {
    for (const command of client.commands.values()) {
        if (typeof command.handleModal !== "function") {
            continue;
        }

        const handled = await command.handleModal(interaction);

        if (handled) {
            return;
        }
    }

    await interaction.reply({
        content: "Este formulario ya no esta disponible o no pertenece a un comando activo.",
        ephemeral: true
    });
}

async function replyWithError(interaction) {
    const response = {
        content: "Hubo un error ejecutando esta interaccion.",
        ephemeral: true
    };

    if (interaction.replied || interaction.deferred) {
        await interaction.followUp(response);
        return;
    }

    if (interaction.isMessageComponent()) {
        await interaction.reply(response);
        return;
    }

    if (interaction.isModalSubmit() || interaction.isChatInputCommand()) {
        await interaction.reply(response);
    }
}

module.exports = {
    name: Events.InteractionCreate,

    async execute(interaction, client) {
        try {
            if (interaction.isChatInputCommand()) {
                console.log(`Slash command recibido: /${interaction.commandName}`);
                await handleCommand(interaction, client);
                return;
            }

            if (interaction.isMessageComponent()) {
                await handleComponent(interaction, client);
                return;
            }

            if (interaction.isModalSubmit()) {
                await handleModal(interaction, client);
            }
        } catch (error) {
            console.error("Error en interactionCreate:", error);
            await replyWithError(interaction);
        }
    }
};
