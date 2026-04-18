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

// --- CONFIGURACIÓN DE ENTORNO ---
const DISCORD_TOKEN  = process.env.DISCORD_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MONGODB_URI    = process.env.MONGODB_URI;
const DM_CHANNEL_NAME = "dungeon-master";

// --- CONFIGURACIÓN IA (Modo Guía Activa) ---
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash",
    systemInstruction: `Eres un Dungeon Master de D&D 5e experto y proactivo. 
    Tu misión es GUIAR la historia:
    1. Narra de forma inmersiva, sensorial y breve (máximo 2 párrafos).
    2. No esperes a que el jugador pregunte "qué hay aquí". Tú describe el entorno, los ruidos y las amenazas.
    3. OBLIGATORIO: Termina CADA mensaje con una pregunta directa y 3 opciones numeradas (1, 2, 3) que representen caminos o acciones distintas.
    4. Si hay varios jugadores, integra sus acciones en una sola narrativa coherente.`
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
  inventario: { type: [String], default: ["Ropas comunes"] }
});
const Personaje = mongoose.model("Personaje", PersonajeSchema);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent
  ]
});

// Función Maestra de Narrativa
async function narrarEscena(texto, nombre, clase, hp) {
    try {
        const prompt = `[Personaje: ${nombre}, Clase: ${clase}, HP: ${hp}]. El jugador dice/hace: "${texto}". Genera la continuación de la historia y ofrece 3 opciones de acción numeradas.`;
        const result = await geminiModel.generateContent(prompt);
        return result.response.text();
    } catch (err) {
        console.error("Error IA:", err);
        return "*(Las nieblas del destino ocultan el camino... intenta de nuevo)*";
    }
}

client.once(Events.ClientReady, (c) => {
  console.log(`⚔️ DM Master v6.0 (Narrativa Automática) listo: ${c.user.tag}`);
  mongoose.connect(MONGODB_URI).then(() => console.log("🔗 MongoDB Conectada"));
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || message.channel.name !== DM_CHANNEL_NAME) return;
  const content = message.content.trim();
  const args = content.split(/\s+/);
  const command = args[0].toLowerCase();

  // COMANDO !INICIO
  if (command === "!inicio") {
    return message.reply("🛡️ **La mesa está lista.** Usa `!unirse Nombre Clase` para que el DM comience a narrar tu historia.");
  }

  // !unirse REPARADO CON DISPARO DE HISTORIA
  if (command === "!unirse") {
    const nombre = args[1];
    const clase = args[2];
    if (!nombre || !clase) return message.reply("❌ Uso: `!unirse Nombre Clase` (Ej: `!unirse Knazto Guerrero`) ");

    const hpBase = { "guerrero": 12, "mago": 6, "picaro": 8, "clerigo": 10 };
    const vida = hpBase[clase.toLowerCase()] || 10;

    try {
        const p = await Personaje.findOneAndUpdate(
            { discordId: message.author.id, guildId: message.guild.id },
            { nombre, clase, hp: vida, hpMax: vida, oro: 50 },
            { upsert: true, new: true }
        );

        await message.channel.sendTyping();
        const intro = await narrarEscena("Empieza mi aventura en un lugar desconocido y peligroso.", p.nombre, p.clase, p.hp);
        
        return message.reply(`✅ **Ficha creada para ${p.nombre} el ${p.clase}.**\n\n${intro}`);
    } catch (e) {
        return message.reply("❌ Error al conectar con la base de datos.");
    }
  }

  // NARRACIÓN FLUIDA (IA RESPONDE SIEMPRE)
  if (!content.startsWith("!")) {
    const p = await Personaje.findOne({ discordId: message.author.id });
    if (!p) return message.reply("⚠️ Debes unirte primero con `!unirse Nombre Clase`.");

    await message.channel.sendTyping();
    const respuesta = await narrarEscena(content, p.nombre, p.clase, p.hp);
    return message.reply(respuesta);
  }
});

client.login(DISCORD_TOKEN);
