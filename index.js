const { verificarEstadoRoblox } = require('./utils/robloxStatus.js');
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { Client, Collection, GatewayIntentBits } = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath)
    .filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));

    if (!command.data || !command.execute) {
        console.warn(`Comando ignorado por export inválido: ${file}`);
        continue;
    }

    client.commands.set(command.data.name, command);
    console.log(`Comando cargado: ${command.data.name}`);
}

const eventsPath = path.join(__dirname, "events");
const eventFiles = fs.readdirSync(eventsPath)
    .filter(file => file.endsWith(".js"));

for (const file of eventFiles) {
    const event = require(path.join(eventsPath, file));

    if (!event.name || !event.execute) {
        console.warn(`Evento ignorado por export inválido: ${file}`);
        continue;
    }

    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
}

// MONITOREO AUTOMÁTICO DE ROBLOX
client.once("ready", () => {
    console.log(`¡Bot conectado como ${client.user.tag}!`);
    verificarEstadoRoblox(client);
    setInterval(() => verificarEstadoRoblox(client), 180000); // 3 minutos
});

if (!process.env.TOKEN) {
    console.error("Falta configurar TOKEN en el archivo .env");
    process.exit(1);
}

client.login(process.env.TOKEN);