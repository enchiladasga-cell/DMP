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

// --- IA (GEMINI 2.0 FLASH - MODO GUÍA) ---
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash",
    systemInstruction: `Eres un Dungeon Master experto de D&D 5e. 
    Tu misión es GUIAR a un GRUPO de jugadores. 
    1. Narra de forma épica, breve y envolvente. 
    2. Al final de cada mensaje, ofrece siempre 3 OPCIONES numeradas para que el grupo decida.
    3. Si hay varios jugadores, interactúa con todos y crea situaciones donde deban colaborar.
    4. Tú controlas el mundo, los monstruos y el clima. Lanza eventos inesperados.`
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
  inventario: { type: [String], default: ["Equipo básico"] },
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

// Función para llamar a la IA con contexto de grupo
async function askDM(texto, usuario, contextoGrupo) {
    try {
        const prompt = `Integrantes del grupo actualmente: ${contextoGrupo}. El jugador ${usuario} dice: ${texto}. Continúa la historia de forma emocionante y termina dando 3 opciones numeradas claras.`;
        const result = await geminiModel.generateContent(prompt);
        return result.response.text();
    } catch (err) {
        console.error("Error en IA:", err);
        return "*(Las nieblas del destino bloquean la visión del DM... intenta de nuevo)*";
    }
}

client.once(Events.ClientReady, () => {
  console.log(`⚔️ DM Multijugador v6.0.0 listo: ${client.user.tag}`);
  mongoose.connect(MONGODB_URI).then(() => console.log("🔗 DB Conectada"));
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || message.channel.name !== DM_CHANNEL_NAME) return;
  const content = message.content.trim();
  const args = content.split(/\s+/);
  const command = args[0].toLowerCase();

  // COMANDO !GRUPO
  if (command === "!grupo") {
    const miembros = await Personaje.find({ guildId: message.guild.id });
    if (miembros.length === 0) return message.reply("No hay aventureros en este grupo aún.");

    const embed = new EmbedBuilder()
      .setTitle("🛡️ Compañía de Aventureros")
      .setDescription("Estado actual del grupo:")
      .setColor(0x34495E);
    
    miembros.forEach(m => {
        embed.addFields({ name: m.nombre, value: `${m.clase} | Vida: ${getBarra(m.hp, m.hpMax)} | 💰 ${m.oro}g`, inline: false });
    });

    return message.reply({ embeds: [embed] });
  }

  // COMANDO !UNIRSE
  if (command === "!unirse") {
    const nombre = args[1]; const clase = args[2];
    if (!nombre || !clase) return message.reply("❌ Formato: \`!unirse Nombre Clase\` (Ej: \`!unirse Knazto Guerrero\`) ");
    
    const hpBase = { "guerrero": 12, "mago": 6, "picaro": 8, "clerigo": 10 };
    const vida = hpBase[clase.toLowerCase()] || 10;

    await Personaje.findOneAndUpdate(
        { discordId: message.author.id, guildId: message.guild.id },
        { nombre, clase, hp: vida, hpMax: vida, oro: 50 },
        { upsert: true }
    );
    return message.reply(`✅ **${nombre}** se ha unido a la partida como **${clase}**. ¡Escribe algo para que el DM comience la narración!`);
  }

  // COMANDO !MENU
  if (command === "!menu") {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("btn_perfil").setLabel("👤 Mi Ficha").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("btn_descanso").setLabel("🏕️ Descansar").setStyle(ButtonStyle.Success)
    );
    return message.reply({ content: "Gestión de aventura:", components: [row] });
  }

  // NARRACIÓN IA (SOPORTE MULTIJUGADOR)
  if (!content.startsWith("!")) {
    await message.channel.sendTyping();
    const grupo = await Personaje.find({ guildId: message.guild.id });
    const contexto = grupo.length > 0 ? grupo.map(m => `${m.nombre} (${m.clase})`).join(", ") : "Jugador solitario";
    
    const r = await askDM(content, message.author.username, contexto);
    return message.reply(r);
  }
});

// GESTOR DE BOTONES
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;
  if (interaction.replied || interaction.deferred) return;

  try {
    const p = await Personaje.findOne({ discordId: interaction.user.id });
    if (!p) return await interaction.reply({ content: "Primero crea tu personaje con `!unirse`.", ephemeral: true });

    if (interaction.customId === "btn_perfil") {
      const embed = new EmbedBuilder()
        .setTitle(`📜 Ficha: ${p.nombre}`)
        .addFields(
          { name: "Clase", value: p.clase, inline: true },
          { name: "Vida", value: getBarra(p.hp, p.hpMax) },
          { name: "Oro", value: `💰 ${p.oro}g`, inline: true }
        )
        .setColor(0x2ECC71);
      return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (interaction.customId === "btn_descanso") {
      p.hp = p.hpMax;
      await p.save();
      return await interaction.reply({ content: "Has acampado y recuperado tus fuerzas (HP al máximo).", ephemeral: true });
    }
  } catch (err) {
    console.error(err);
  }
});

client.login(DISCORD_TOKEN);
