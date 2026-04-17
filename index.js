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
const geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- ESQUEMAS ---
const PersonajeSchema = new mongoose.Schema({
  discordId: { type: String, required: true },
  guildId: { type: String, required: true },
  nombre: { type: String, required: true },
  clase: { type: String, required: true },
  hp: { type: Number, required: true },
  hpMax: { type: Number, required: true },
  estado: { type: String, default: "Vivo" }, // Vivo, Inconsciente, Muerto
  oro: { type: Number, default: 50 },
  inventario: { type: [String], default: [] },
  titulos: { type: [String], default: [] },
  inspiracion: { type: Boolean, default: false }
});

const MundoSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  cronicas: { type: [String], default: [] } // Mejora: Diario de Crónicas
});

const Personaje = mongoose.model("Personaje", PersonajeSchema);
const Mundo = mongoose.model("Mundo", MundoSchema);

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// Helper: Barra de Vida Visual
function generarBarraVida(actual, max) {
    if (actual <= 0) return "💀 [⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛] 0%";
    const porcentaje = Math.max(0, Math.min(1, actual / max));
    const bloques = Math.round(porcentaje * 10);
    const color = porcentaje > 0.5 ? "🟩" : (porcentaje > 0.2 ? "🟧" : "🟥");
    return `${color.repeat(bloques)}${"⬛".repeat(10 - bloques)} ${Math.round(porcentaje * 100)}%`;
}

client.once(Events.ClientReady, (c) => {
  console.log(`⚔️ DM Master v5.5.0 listo: ${c.user.tag}`);
  mongoose.connect(MONGODB_URI).then(() => console.log("🔗 DB Conectada"));
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || message.channel.name !== DM_CHANNEL_NAME) return;
  const lower = message.content.toLowerCase();

  // COMANDO MENÚ (Acciones Rápidas con Botones)
  if (lower === "!menu") {
    const embed = new EmbedBuilder()
      .setTitle("🎮 Panel de Acciones")
      .setDescription("Elige una acción rápida para tu aventura.")
      .setColor(0x2F3136);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("btn_perfil").setLabel("👤 Perfil").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("btn_tienda").setLabel("🛒 Tienda").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("btn_descanso").setLabel("🏕️ Descansar").setStyle(ButtonStyle.Primary)
    );

    return message.reply({ embeds: [embed], components: [row] });
  }

  // Lógica de narración omitida para brevedad, pero Gemini recibiría el contexto de crónicas
});

// GESTOR DE INTERACCIONES (BOTONES)
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  const p = await Personaje.findOne({ discordId: interaction.user.id, guildId: interaction.guild.id });
  if (!p) return interaction.reply({ content: "❌ No tienes personaje.", ephemeral: true });

  if (interaction.customId === "btn_perfil") {
    const embed = new EmbedBuilder()
      .setTitle(`🛡️ Ficha: ${p.nombre}`)
      .setColor(p.hp > 0 ? 0x2ECC71 : 0xE74C3C)
      .addFields(
        { name: "Salud", value: generarBarraVida(p.hp, p.hpMax) },
        { name: "Estado", value: p.estado, inline: true },
        { name: "Inspiración", value: p.inspiracion ? "✨ DISPONIBLE" : "❌ No", inline: true },
        { name: "Oro", value: `💰 ${p.oro}g`, inline: true },
        { name: "Títulos", value: p.titulos.join(", ") || "Aventurero" }
      );
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (interaction.customId === "btn_descanso") {
    if (p.hp <= 0 && p.estado === "Inconsciente") {
        return interaction.reply({ content: "❌ Estás inconsciente, no puedes acampar solo. ¡Necesitas ayuda!", ephemeral: true });
    }
    p.hp = p.hpMax;
    p.estado = "Vivo";
    await p.save();
    await interaction.reply({ content: "🏕️ Has descansado y recuperado tus fuerzas.", ephemeral: true });
  }
  
  // Lógica de tienda incluida en el botón btn_tienda...
});

client.login(DISCORD_TOKEN);
