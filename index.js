const { 
  Client, 
  GatewayIntentBits, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  EmbedBuilder, 
  Events, 
  Partials 
} = require("discord.js");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const mongoose = require("mongoose");

// --- CONFIGURACIÓN ---
const DISCORD_TOKEN  = process.env.DISCORD_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MONGODB_URI    = process.env.MONGODB_URI;
const DM_CHANNEL_NAME = "dungeon-master";

// --- IA ---
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    systemInstruction: "Eres un Dungeon Master experto. Narra aventuras de D&D 5e de forma épica. Mantén el rastro de la salud y el inventario. Si alguien hace algo increíble, añade [INSPIRACION] al final."
});

// --- BASE DE DATOS ---
const PersonajeSchema = new mongoose.Schema({
  discordId: { type: String, required: true },
  guildId: { type: String, required: true },
  nombre: { type: String, required: true },
  clase: { type: String, required: true },
  hp: { type: Number, required: true },
  hpMax: { type: Number, required: true },
  oro: { type: Number, default: 50 },
  inventario: { type: [String], default: [] },
  inspiracion: { type: Boolean, default: false }
});
const Personaje = mongoose.model("Personaje", PersonajeSchema);

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// Helper: Barra de Vida
function getBarra(actual, max) {
    const p = Math.max(0, Math.min(1, actual / max));
    const b = Math.round(p * 10);
    const c = p > 0.5 ? "🟩" : (p > 0.2 ? "🟧" : "🟥");
    return `${c.repeat(b)}${"⬛".repeat(10 - b)} ${Math.round(p * 100)}%`;
}

// Función IA
async function askDM(texto, usuario) {
    try {
        const result = await geminiModel.generateContent(`Jugador ${usuario}: ${texto}`);
        return result.response.text();
    } catch (err) {
        return "*(El destino es incierto... intenta de nuevo)*";
    }
}

client.once(Events.ClientReady, () => {
  console.log(`⚔️ DM Master v5.6.0 listo: ${client.user.tag}`);
  mongoose.connect(MONGODB_URI).then(() => console.log("🔗 DB Conectada"));
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || message.channel.name !== DM_CHANNEL_NAME) return;
  const lower = message.content.toLowerCase();

  if (lower === "!inicio") {
    const embed = new EmbedBuilder()
      .setTitle("⚔️ Nueva Aventura")
      .setDescription("El Dungeon Master aguarda. ¡Preparaos!")
      .setColor(0xF1C40F);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("btn_unirse").setLabel("🙋 Unirse").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("btn_perfil").setLabel("👤 Perfil").setStyle(ButtonStyle.Secondary)
    );
    return message.reply({ embeds: [embed], components: [row] });
  }

  if (lower === "!menu") {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("btn_perfil").setLabel("👤 Mi Perfil").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("btn_descanso").setLabel("🏕️ Descansar").setStyle(ButtonStyle.Success)
    );
    return message.reply({ content: "Panel de control:", components: [row] });
  }

  if (!message.content.startsWith("!")) {
    await message.channel.sendTyping();
    const r = await askDM(message.content, message.author.username);
    return message.reply(r);
  }
});

// GESTOR DE BOTONES (PARCHE DE SEGURIDAD 40060)
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;
  
  // PARCHE: Evitar responder dos veces o a interacciones caducadas
  if (interaction.replied || interaction.deferred) return;

  try {
    const p = await Personaje.findOne({ discordId: interaction.user.id });

    if (interaction.customId === "btn_unirse") {
      return await interaction.reply({ content: "Usa `!unirse Nombre Clase` para empezar.", ephemeral: true });
    }

    if (!p) return await interaction.reply({ content: "❌ No tienes personaje.", ephemeral: true });

    if (interaction.customId === "btn_perfil") {
      const embed = new EmbedBuilder()
        .setTitle(`🛡️ ${p.nombre}`)
        .addFields(
          { name: "Salud", value: getBarra(p.hp, p.hpMax) },
          { name: "Oro", value: `💰 ${p.oro}g`, inline: true },
          { name: "Inspiración", value: p.inspiracion ? "✨" : "❌", inline: true }
        )
        .setColor(p.hp > 0 ? 0x2ECC71 : 0xE74C3C);
      return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (interaction.customId === "btn_descanso") {
      p.hp = p.hpMax;
      await p.save();
      return await interaction.reply({ content: "✅ Has descansado por completo.", ephemeral: true });
    }
  } catch (err) {
    console.error(err);
    if (!interaction.replied) {
      await interaction.reply({ content: "Error procesando botón.", ephemeral: true });
    }
  }
});

client.login(DISCORD_TOKEN);
