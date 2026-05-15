require("dotenv").config();
const { Client, GatewayIntentBits, REST, Routes, Collection } = require("discord.js");
const mongoose = require("mongoose");
const { comandos } = require("./commands");

// =============================================
//   CLIENTE DE DISCORD
// =============================================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

client.commands = new Collection();
for (const cmd of comandos) {
  client.commands.set(cmd.data.name, cmd);
}

// =============================================
//   CONEXIÓN A MONGODB
// =============================================
async function conectarDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB conectado");
  } catch (err) {
    console.error("❌ Error MongoDB:", err.message);
    process.exit(1);
  }
}

// =============================================
//   REGISTRAR COMANDOS SLASH
// =============================================
async function registrarComandos() {
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
  try {
    console.log("📡 Registrando comandos slash...");
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID),
      { body: comandos.map(c => c.data.toJSON()) }
    );
    console.log("✅ Comandos registrados");
  } catch (err) {
    console.error("❌ Error al registrar comandos:", err.message);
  }
}

// =============================================
//   EVENTOS
// =============================================
client.once("ready", async () => {
  console.log(`⚔️  ${client.user.tag} está en línea — Ecos de Eldoria`);
  await registrarComandos();
  
  client.user.setActivity("⚔️ Ecos de Eldoria", { type: 0 });
});

client.on("interactionCreate", async (interaction) => {
  // ---- Slash Commands ----
  if (interaction.isChatInputCommand()) {
    const cmd = client.commands.get(interaction.commandName);
    if (!cmd) return;

    try {
      await cmd.execute(interaction);
    } catch (err) {
      console.error(`Error en /${interaction.commandName}:`, err);
      const msg = { content: "❌ Ocurrió un error al ejecutar el comando.", ephemeral: true };
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(msg).catch(() => {});
      } else {
        await interaction.reply(msg).catch(() => {});
      }
    }
  }

  // ---- Botones ----
  if (interaction.isButton()) {
    const { Personaje } = require("./models");
    
    if (interaction.customId === "terminar_aventura") {
      const personaje = await Personaje.findOne({ userId: interaction.user.id });
      if (!personaje) return interaction.reply({ content: "❌ No tienes personaje.", ephemeral: true });
      
      personaje.en_aventura = false;
      personaje.historia = [];
      const oroBonus = Math.floor(Math.random() * 30) + 10;
      personaje.oro += oroBonus;
      await personaje.save();

      await interaction.reply({ content: `🏁 Aventura terminada. Ganaste **+${oroBonus} oro**. ¡Descansa en la taberna, héroe!`, ephemeral: true });
    }

    if (interaction.customId === "ver_habilidades") {
      const { CLASES } = require("./gameData");
      const personaje = await Personaje.findOne({ userId: interaction.user.id });
      if (!personaje) return;
      const clase = CLASES[personaje.clase];
      const disponibles = clase.habilidades.filter(h => personaje.nivel >= h.nivel);
      const lista = disponibles.map(h => `✅ **${h.nombre}** — ${h.dano || h.efecto || h.cura || "Especial"}`).join("\n");
      await interaction.reply({ content: `**Habilidades desbloqueadas:**\n${lista || "Ninguna"}`, ephemeral: true });
    }
  }
});

// =============================================
//   INICIO
// =============================================
(async () => {
  await conectarDB();
  await client.login(process.env.DISCORD_TOKEN);
})();
