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

// --- CONFIGURACIÓN DE ENTORNO ---
const DISCORD_TOKEN  = process.env.DISCORD_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MONGODB_URI    = process.env.MONGODB_URI;
const DM_CHANNEL_NAME = "dungeon-master";

// --- CONFIGURACIÓN IA ---
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    systemInstruction: "Eres un Dungeon Master experto en D&D 5e. Tu tono es épico y descriptivo. Gestionas el inventario y la vida. Si un jugador hace algo heroico, indica [INSPIRACION] al final."
});

// --- MODELOS DE BASE DE DATOS ---
const PersonajeSchema = new mongoose.Schema({
  discordId: { type: String, required: true },
  guildId: { type: String, required: true },
  nombre: { type: String, required: true },
  clase: { type: String, required: true },
  hp: { type: Number, required: true },
  hpMax: { type: Number, required: true },
  estado: { type: String, default: "Vivo" },
  oro: { type: Number, default: 50 },
  inventario: { type: [String], default: [] },
  titulos: { type: [String], default: [] },
  inspiracion: { type: Boolean, default: false }
});

const MundoSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  cronicas: { type: [String], default: [] }
});

const Personaje = mongoose.model("Personaje", PersonajeSchema);
const Mundo = mongoose.model("Mundo", MundoSchema);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent
  ]
});

// HELPER: Barra de Vida Visual
function generarBarraVida(actual, max) {
    if (actual <= 0) return "💀 [⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛] 0%";
    const porcentaje = Math.max(0, Math.min(1, actual / max));
    const bloques = Math.round(porcentaje * 10);
    const color = porcentaje > 0.5 ? "🟩" : (porcentaje > 0.2 ? "🟧" : "🟥");
    return `${color.repeat(bloques)}${"⬛".repeat(10 - bloques)} ${Math.round(porcentaje * 100)}%`;
}

// FUNCIÓN PARA IA
async function askDM(texto, usuario) {
    try {
        const prompt = `El jugador ${usuario} dice: ${texto}. Narra las consecuencias.`;
        const result = await geminiModel.generateContent(prompt);
        return result.response.text();
    } catch (err) {
        console.error("Error Gemini:", err);
        return "*(El viento aúlla y no entiendes lo que sucede... intenta de nuevo)*";
    }
}

client.once(Events.ClientReady, (c) => {
  console.log(`⚔️ DM Master v5.5.0 listo como: ${c.user.tag}`);
  mongoose.connect(MONGODB_URI).then(() => console.log("🔗 MongoDB Conectado")).catch(console.error);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || message.channel.name !== DM_CHANNEL_NAME) return;
  const lower = message.content.toLowerCase();

  // COMANDO INICIO
  if (lower === "!inicio") {
    const embed = new EmbedBuilder()
      .setTitle("⚔️ La Aventura Comienza")
      .setDescription("El Dungeon Master ha llegado. Preparaos para la gloria o la muerte.")
      .setColor(0xF1C40F);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("btn_unirse").setLabel("🙋 Unirse").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("btn_perfil").setLabel("👤 Perfil").setStyle(ButtonStyle.Secondary)
    );

    return message.reply({ embeds: [embed], components: [row] });
  }

  // COMANDO MENÚ
  if (lower === "!menu") {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("btn_perfil").setLabel("👤 Mi Perfil").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("btn_descanso").setLabel("🏕️ Descansar").setStyle(ButtonStyle.Success)
    );
    return message.reply({ content: "Panel del aventurero:", components: [row] });
  }

  // NARRACIÓN IA
  if (!message.content.startsWith("!")) {
    await message.channel.sendTyping();
    const respuesta = await askDM(message.content, message.author.username);
    return message.reply(respuesta);
  }
});

// GESTOR DE BOTONES
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;
  const p = await Personaje.findOne({ discordId: interaction.user.id });

  if (interaction.customId === "btn_unirse") {
    return interaction.reply({ content: "Usa `!unirse Nombre Clase` (Guerrero, Mago, Picaro, Clerigo).", ephemeral: true });
  }

  if (!p) return interaction.reply({ content: "No tienes personaje.", ephemeral: true });

  if (interaction.customId === "btn_perfil") {
    const embed = new EmbedBuilder()
      .setTitle(`🛡️ ${p.nombre}`)
      .addFields(
        { name: "Salud", value: generarBarraVida(p.hp, p.hpMax) },
        { name: "Oro", value: `💰 ${p.oro}g`, inline: true },
        { name: "Inspiración", value: p.inspiracion ? "✨" : "❌", inline: true }
      )
      .setColor(p.hp > 0 ? 0x2ECC71 : 0xE74C3C);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (interaction.customId === "btn_descanso") {
    p.hp = p.hpMax;
    await p.save();
    await interaction.reply({ content: "Has descansado por completo.", ephemeral: true });
  }
});

client.login(DISCORD_TOKEN);
