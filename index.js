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

// --- IA (ACTUALIZADA A GEMINI 2.0 FLASH) ---
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

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
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent
  ]
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
        const prompt = `Eres un DM de D&D 5e experto. El jugador ${usuario} dice: "${texto}". Responde de forma épica, breve y descriptiva, guiando la historia.`;
        const result = await geminiModel.generateContent(prompt);
        return result.response.text();
    } catch (err) {
        console.error("Error en IA:", err);
        return "*(El viento aúlla entre las ruinas y no logras distinguir las palabras del destino... intenta de nuevo)*";
    }
}

client.once(Events.ClientReady, (c) => {
  console.log(`⚔️ DM Master v5.8.0 operativo: ${c.user.tag}`);
  mongoose.connect(MONGODB_URI).then(() => console.log("🔗 Conexión a MongoDB establecida"));
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || message.channel.name !== DM_CHANNEL_NAME) return;
  const content = message.content.trim();
  const args = content.split(/\s+/);
  const command = args[0].toLowerCase();

  // COMANDO !AYUDA
  if (command === "!ayuda") {
      const embed = new EmbedBuilder()
          .setTitle("📜 Códice del Aventurero")
          .setDescription("Usa estos comandos para forjar tu leyenda:\n\n`!inicio` - Abre la sala de juego\n`!unirse Nombre Clase` - Crea tu ficha (Guerrero, Mago, Picaro, Clerigo)\n`!menu` - Panel de acciones rápidas\n`!perfil` - Mira tu estado actual")
          .setColor(0x3498DB);
      return message.reply({ embeds: [embed] });
  }

  // COMANDO !INICIO
  if (command === "!inicio") {
    const embed = new EmbedBuilder()
      .setTitle("⚔️ El Llamado de la Aventura")
      .setDescription("El Dungeon Master ha despertado. ¿Quién se atreve a desafiar al destino?")
      .setColor(0xF1C40F);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("btn_unirse_info").setLabel("🙋 Cómo unirse").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("btn_perfil").setLabel("👤 Mi Ficha").setStyle(ButtonStyle.Secondary)
    );
    return message.reply({ embeds: [embed], components: [row] });
  }

  // COMANDO !UNIRSE
  if (command === "!unirse") {
    const nombre = args[1];
    const clase = args[2];
    if (!nombre || !clase) return message.reply("❌ Formato incorrecto. Usa: `!unirse Nombre Clase` (Ejemplo: `!unirse Knazto Guerrero`) ");
    
    const hpBase = { "guerrero": 12, "mago": 6, "picaro": 8, "clerigo": 10 };
    const vida = hpBase[clase.toLowerCase()] || 10;

    await Personaje.findOneAndUpdate(
        { discordId: message.author.id, guildId: message.guild.id },
        { nombre, clase, hp: vida, hpMax: vida, oro: 50 },
        { upsert: true }
    );
    return message.reply(`✅ **${nombre}** el **${clase}**, ¡tu historia comienza ahora! Escribe cualquier acción para empezar.`);
  }

  // COMANDO !MENU
  if (command === "!menu") {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("btn_perfil").setLabel("👤 Ver Perfil").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("btn_descanso").setLabel("🏕️ Descansar").setStyle(ButtonStyle.Success)
    );
    return message.reply({ content: "Panel de gestión:", components: [row] });
  }

  // NARRACIÓN IA (Si no es comando)
  if (!content.startsWith("!")) {
    await message.channel.sendTyping();
    const r = await askDM(content, message.author.username);
    return message.reply(r);
  }
});

// GESTOR DE BOTONES (Con parche de seguridad)
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;
  if (interaction.replied || interaction.deferred) return;

  try {
    const p = await Personaje.findOne({ discordId: interaction.user.id });

    if (interaction.customId === "btn_unirse_info") {
      return await interaction.reply({ content: "Escribe en el chat: `!unirse TuNombre TuClase`\nClases disponibles: Guerrero, Mago, Picaro, Clerigo.", ephemeral: true });
    }

    if (!p) return await interaction.reply({ content: "❌ No tienes personaje registrado. ¡Usa `!unirse`!", ephemeral: true });

    if (interaction.customId === "btn_perfil") {
      const embed = new EmbedBuilder()
        .setTitle(`🛡️ Ficha: ${p.nombre}`)
        .addFields(
          { name: "Salud", value: getBarra(p.hp, p.hpMax) },
          { name: "Oro", value: `💰 ${p.oro}g`, inline: true },
          { name: "Inspiración", value: p.inspiracion ? "✨ Sí" : "❌ No", inline: true }
        )
        .setColor(p.hp > 0 ? 0x2ECC71 : 0xE74C3C);
      return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (interaction.customId === "btn_descanso") {
      p.hp = p.hpMax;
      await p.save();
      return await interaction.reply({ content: "🏕️ Has recuperado toda tu vida tras un descanso largo.", ephemeral: true });
    }
  } catch (err) {
    if (!interaction.replied) await interaction.reply({ content: "Error procesando la acción.", ephemeral: true });
  }
});

client.login(DISCORD_TOKEN);
