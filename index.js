const { 
  Client, 
  GatewayIntentBits, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  EmbedBuilder, 
  Events 
} = require("discord.js");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const mongoose = require("mongoose");

// --- CONFIGURACIÓN ---
const DISCORD_TOKEN  = process.env.DISCORD_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MONGODB_URI    = process.env.MONGODB_URI;
const DM_CHANNEL_NAME = "dungeon-master";

// --- IA ACTUALIZADA (v5.8.0) ---
// Cambiamos el modelo a uno compatible con las cuotas actuales y resolvemos el error 404
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash" 
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
  inventario: { type: [String], default: ["Ropas comunes"] },
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

// Función IA con manejo de errores robusto
async function askDM(texto, usuario) {
    try {
        const prompt = `Eres un Dungeon Master de D&D 5e. El jugador ${usuario} dice: ${texto}. Narra las consecuencias de forma épica y breve.`;
        const result = await geminiModel.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (err) {
        console.error("DETALLE ERROR IA:", err);
        return "*(El oráculo se ha oscurecido... intenta hablar de nuevo)*";
    }
}

client.once(Events.ClientReady, () => {
  console.log(`⚔️ DM Master v5.8.0 listo: ${client.user.tag}`);
  mongoose.connect(MONGODB_URI).then(() => console.log("🔗 DB Conectada"));
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || message.channel.name !== DM_CHANNEL_NAME) return;
  const content = message.content.trim();
  const args = content.split(/\s+/);
  const command = args[0].toLowerCase();

  // COMANDO !INICIO
  if (command === "!inicio") {
    const embed = new EmbedBuilder()
      .setTitle("⚔️ El Destino Llama")
      .setDescription("¡La aventura comienza! Usa los botones para gestionar tu camino.")
      .setColor(0xF1C40F);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("btn_unirse_info").setLabel("🙋 Cómo Unirse").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("btn_perfil").setLabel("👤 Mi Perfil").setStyle(ButtonStyle.Secondary)
    );
    return message.reply({ embeds: [embed], components: [row] });
  }

  // COMANDO !UNIRSE
  if (command === "!unirse") {
    const nombre = args[1];
    const clase = args[2];
    if (!nombre || !clase) return message.reply("❌ Uso: `!unirse Nombre Clase` (Ej: `!unirse Knazto Guerrero`) ");

    const hpBase = { "guerrero": 12, "mago": 6, "picaro": 8, "clerigo": 10 };
    const vida = hpBase[clase.toLowerCase()] || 10;

    try {
        await Personaje.findOneAndUpdate(
            { discordId: message.author.id, guildId: message.guild.id },
            { nombre, clase, hp: vida, hpMax: vida, oro: 50 },
            { upsert: true }
        );
        return message.reply(`✅ ¡Bienvenido **${nombre}** el **${clase}**! Tu ficha está lista.`);
    } catch (e) {
        return message.reply("❌ Error en la base de datos.");
    }
  }

  // NARRACIÓN IA
  if (!content.startsWith("!")) {
    await message.channel.sendTyping();
    const r = await askDM(content, message.author.username);
    return message.reply(r);
  }
});

// GESTOR DE BOTONES (PARCHE 40060 APLICADO)
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;
  if (interaction.replied || interaction.deferred) return;

  try {
    const p = await Personaje.findOne({ discordId: interaction.user.id });

    if (interaction.customId === "btn_unirse_info") {
      return await interaction.reply({ content: "Escribe: `!unirse TuNombre Clase`\nEjemplo: `!unirse Knazto Guerrero`", ephemeral: true });
    }

    if (!p) return await interaction.reply({ content: "❌ No tienes personaje. Usa `!unirse`.", ephemeral: true });

    if (interaction.customId === "btn_perfil") {
      const embed = new EmbedBuilder()
        .setTitle(`🛡️ ${p.nombre}`)
        .addFields(
          { name: "Salud", value: getBarra(p.hp, p.hpMax) },
          { name: "Clase", value: p.clase, inline: true },
          { name: "Oro", value: `💰 ${p.oro}g`, inline: true }
        )
        .setColor(p.hp > 0 ? 0x2ECC71 : 0xE74C3C);
      return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (interaction.customId === "btn_descanso") {
      p.hp = p.hpMax;
      await p.save();
      return await interaction.reply({ content: "✅ Descanso completado. Vida restaurada.", ephemeral: true });
    }
  } catch (err) {
    if (!interaction.replied) await interaction.reply({ content: "Error procesando botón.", ephemeral: true });
  }
});

client.login(DISCORD_TOKEN);
