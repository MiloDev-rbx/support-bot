console.log("ESTOY EJECUTANDO ESTE ARCHIVO");

console.log("🚀 Deploy iniciado");

const { REST, Routes } = require("discord.js");
const fs = require("fs");
require("dotenv").config();

console.log("TOKEN:", process.env.TOKEN ? "Cargado ✅" : "Falta ❌");
console.log("CLIENT_ID:", process.env.CLIENT_ID ? "Cargado ✅" : "Falta ❌");
console.log("GUILD_ID:", process.env.GUILD_ID ? "Cargado ✅" : "Falta ❌");

const commands = [];

console.log("📂 Cargando comandos...");

const commandFiles = fs.readdirSync("./commands")
    .filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
    console.log(`➡️ Cargando ${file}`);

    const command = require(`./commands/${file}`);

    console.log(`✅ ${command.data.name} cargado`);

    commands.push(command.data.toJSON());
}

const rest = new REST({ version: "10" })
    .setToken(process.env.TOKEN);

(async () => {
    try {
        console.log("🔄 Registrando comandos...");

        await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENT_ID,
                process.env.GUILD_ID
            ),
            { body: commands }
        );

        console.log("✅ Comandos registrados correctamente.");
    } catch (error) {
        console.error(error);
    }
})();