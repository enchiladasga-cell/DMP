const {
  Client,
  GatewayIntentBits,
  Events
} = require("discord.js");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const mongoose = require("mongoose");

// ═══════════════════════════════════════════════════════
//  CONFIGURACIÓN — Pon tus claves en variables de entorno
// ═══════════════════════════════════════════════════════
const DISCORD_TOKEN   = process.env.DISCORD_TOKEN;
const GEMINI_API_KEY  = process.env.GEMINI_API_KEY;
const MONGODB_URI     = process.env.MONGODB_URI;
const DM_CHANNEL_NAME = "dungeon-master";

if (!DISCORD_TOKEN || !GEMINI_API_KEY || !MONGODB_URI) {
  console.error("❌ Faltan variables de entorno: DISCORD_TOKEN, GEMINI_API_KEY o MONGODB_URI");
  process.exit(1);
}

// ═══════════════════════════════════════════════════════
//  INTELIGENCIA ARTIFICIAL (Gemini)
// ═══════════════════════════════════════════════════════
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const SYSTEM_INSTRUCTION = `Eres un Dungeon Master de D&D 5e experto y proactivo.
Tu misión es GUIAR la historia activamente:
1. Narra de forma inmersiva, sensorial y breve (máximo 2 párrafos).
2. Describe siempre el entorno, sonidos, olores y posibles amenazas sin esperar a que el jugador pregunte.
3. OBLIGATORIO: Termina CADA mensaje con una pregunta directa al jugador y exactamente 3 opciones numeradas (1, 2, 3).
4. Si hay varios jugadores, integra sus acciones en una sola narrativa coherente.
5. Recuerda el nombre, clase y HP del personaje para personalizar la narrativa.`;

// ═══════════════════════════════════════════════════════
//  HISTORIAL DE CONVERSACIÓN POR SERVIDOR
// ═══════════════════════════════════════════════════════
const historialesPorServidor = new Map();

function obtenerHistorial(guildId) {
  if (!historialesPorServidor.has(guildId)) {
    historialesPorServidor.set(guildId, []);
  }
  return historialesPorServidor.get(guildId);
}

function agregarAlHistorial(guildId, role, text) {
  const historial = obtenerHistorial(guildId);
  historial.push({ role, parts: [{ text }] });
  if (historial.length > 40) {
    historialesPorServidor.set(guildId, historial.slice(-40));
  }
}

// ═══════════════════════════════════════════════════════
//  BASE DE DATOS (MongoDB)
// ═══════════════════════════════════════════════════════
const PersonajeSchema = new mongoose.Schema({
  discordId:  { type: String, required: true },
  guildId:    { type: String, required: true },
  nombre:     { type: String, required: true },
  clase:      { type: String, required: true },
  hp:         { type: Number, required: true },
  hpMax:      { type: Number, required: true },
  oro:        { type: Number, default: 50 },
  inventario: { type: [String], default: ["Ropas comunes"] }
});
const Personaje = mongoose.model("Personaje", PersonajeSchema);

// ═══════════════════════════════════════════════════════
//  CLIENTE DE DISCORD
// ═══════════════════════════════════════════════════════
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ═══════════════════════════════════════════════════════
//  CLASES DISPONIBLES — Agrega o quita clases aquí fácilmente
// ═══════════════════════════════════════════════════════
const CLASES = {
  guerrero: { hp: 12, emoji: "⚔️",  descripcion: "Especialista en combate cuerpo a cuerpo" },
  mago:     { hp: 6,  emoji: "🔮",  descripcion: "Lanzador de hechizos poderosos" },
  picaro:   { hp: 8,  emoji: "🗡️",  descripcion: "Experto en sigilo y trampas" },
  clerigo:  { hp: 10, emoji: "✨",  descripcion: "Sanador y defensor divino" },
  arquero:  { hp: 9,  emoji: "🏹",  descripcion: "Combatiente a distancia y rastreador" }
};

// ═══════════════════════════════════════════════════════
//  FUNCIONES DE UTILIDAD
// ═══════════════════════════════════════════════════════

async function mantenerTyping(channel, promesa) {
  const intervalo = setInterval(() => channel.sendTyping().catch(() => {}), 5000);
  try {
    return await promesa;
  } finally {
    clearInterval(intervalo);
  }
}

async function narrarEscena(texto, personaje, guildId) {
  try {
    const { nombre, clase, hp, hpMax, oro, inventario } = personaje;

    const mensajeConContexto =
      `[Personaje: ${nombre} | Clase: ${clase} | HP: ${hp}/${hpMax} | Oro: ${oro} | Inventario: ${inventario.join(", ")}]\n` +
      `Acción del jugador: "${texto}"`;

    agregarAlHistorial(guildId, "user", mensajeConContexto);

    const chat = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: SYSTEM_INSTRUCTION
    }).startChat({
      history: obtenerHistorial(guildId).slice(0, -1)
    });

    const result    = await chat.sendMessage(mensajeConContexto);
    const respuesta = result.response.text();

    agregarAlHistorial(guildId, "model", respuesta);
    return respuesta;
  } catch (err) {
    console.error("❌ Error IA:", err);
    return "*(Las nieblas del destino ocultan el camino... intenta de nuevo)*";
  }
}

// ═══════════════════════════════════════════════════════
//  MENSAJE DE AYUDA
// ═══════════════════════════════════════════════════════
function mensajeAyuda() {
  const listaClases = Object.entries(CLASES)
    .map(([nombre, datos]) => `  ${datos.emoji} **${nombre}** — ${datos.descripcion} (HP: ${datos.hp})`)
    .join("\n");

  return (
    `# ⚔️ Dungeon Master Bot — Guía Rápida\n\n` +

    `## 🚀 ¿Cómo empezar?\n` +
    `Escribe \`!jugar\` y el bot te guiará paso a paso.\n\n` +

    `## 📋 Comandos\n` +
    `\`!jugar\`     — Crea tu personaje y comienza la aventura\n` +
    `\`!yo\`        — Muestra tu ficha de personaje\n` +
    `\`!reiniciar\` — Borra tu personaje e historia para empezar de cero\n` +
    `\`!ayuda\`     — Muestra este mensaje\n\n` +

    `## 🧙 Clases disponibles\n` +
    `${listaClases}\n\n` +

    `## 💬 ¿Cómo jugar?\n` +
    `Una vez creado tu personaje, **escribe libremente** lo que quieres hacer.\n` +
    `El DM responderá y te dará **3 opciones** para continuar.\n\n` +
    `*Ejemplo:* \`Entro al bosque con cuidado y observo mis alrededores\``
  );
}

// ═══════════════════════════════════════════════════════
//  CREACIÓN DE PERSONAJE PASO A PASO
//  En lugar de un comando largo, el bot hace preguntas simples
// ═══════════════════════════════════════════════════════
const creacionEnCurso = new Map(); // userId → { paso, nombre? }

async function manejarCreacion(message) {
  const userId  = message.author.id;
  const guildId = message.guild.id;
  const estado  = creacionEnCurso.get(userId);
  const texto   = message.content.trim();

  // PASO 1: El bot preguntó el nombre, el usuario responde
  if (estado.paso === 1) {
    if (texto.length < 2 || texto.length > 20) {
      return message.reply("✏️ El nombre debe tener entre 2 y 20 caracteres. ¿Cómo se llama tu personaje?");
    }
    creacionEnCurso.set(userId, { paso: 2, nombre: texto });

    const listaClases = Object.entries(CLASES)
      .map(([nombre, datos], i) => `**${i + 1}.** ${datos.emoji} ${nombre} — ${datos.descripcion} (HP: ${datos.hp})`)
      .join("\n");

    return message.reply(
      `✅ ¡Perfecto, **${texto}**!\n\n` +
      `Ahora elige tu clase escribiendo el **número** o el **nombre**:\n\n` +
      `${listaClases}`
    );
  }

  // PASO 2: El bot preguntó la clase, el usuario responde
  if (estado.paso === 2) {
    const nombresClases = Object.keys(CLASES);
    let claseElegida = null;

    const num = parseInt(texto);
    if (!isNaN(num) && num >= 1 && num <= nombresClases.length) {
      claseElegida = nombresClases[num - 1]; // Eligió por número
    } else if (CLASES[texto.toLowerCase()]) {
      claseElegida = texto.toLowerCase();    // Eligió por nombre
    }

    if (!claseElegida) {
      return message.reply(
        `❌ No reconocí esa clase. Escribe el **número** o el **nombre**:\n` +
        nombresClases.map((c, i) => `**${i + 1}.** ${c}`).join(" | ")
      );
    }

    const nombre = estado.nombre;
    const datos  = CLASES[claseElegida];
    creacionEnCurso.delete(userId); // Termina el flujo de creación

    const p = await Personaje.findOneAndUpdate(
      { discordId: userId, guildId },
      { nombre, clase: claseElegida, hp: datos.hp, hpMax: datos.hp, oro: 50, inventario: ["Ropas comunes"] },
      { upsert: true, new: true }
    );

    historialesPorServidor.delete(guildId);
    await message.channel.sendTyping();

    const textoInicial =
      `Empieza mi aventura. Soy ${nombre}, un ${claseElegida}. ` +
      `Aparezco en un lugar desconocido y peligroso. Describe dónde estoy y dame mis primeras 3 opciones.`;

    const intro = await mantenerTyping(
      message.channel,
      narrarEscena(textoInicial, p, guildId)
    );

    return message.reply(
      `${datos.emoji} **¡${nombre} el ${claseElegida} comienza su aventura!**\n` +
      `HP: ${p.hp}/${p.hpMax} ❤️ | Oro: ${p.oro} 🪙\n` +
      `─────────────────────────────\n` +
      `${intro}`
    );
  }
}

// ═══════════════════════════════════════════════════════
//  EVENTOS DEL BOT
// ═══════════════════════════════════════════════════════

client.once(Events.ClientReady, async (c) => {
  console.log(`⚔️  DM Master v8.0 listo: ${c.user.tag}`);
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("🔗 MongoDB conectada");
  } catch (err) {
    console.error("❌ Error MongoDB:", err);
    process.exit(1);
  }
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (message.channel.name !== DM_CHANNEL_NAME) return;

  const content  = message.content.trim();
  if (!content) return;

  const userId  = message.author.id;
  const guildId = message.guild.id;
  const comando = content.split(/\s+/)[0].toLowerCase();

  // Si el usuario está en medio de la creación de personaje, manejarlo
  if (creacionEnCurso.has(userId)) {
    if (content.startsWith("!")) {
      creacionEnCurso.delete(userId);
      await message.reply("⚠️ Creación cancelada.");
      // Cae al procesado normal de comandos
    } else {
      return manejarCreacion(message);
    }
  }

  // ── !ayuda ───────────────────────────────────────────
  if (comando === "!ayuda" || comando === "!help") {
    return message.reply(mensajeAyuda());
  }

  // ── !jugar — Inicia creación paso a paso ─────────────
  if (comando === "!jugar") {
    const existente = await Personaje.findOne({ discordId: userId, guildId });
    if (existente) {
      return message.reply(
        `⚠️ Ya tienes un personaje: **${existente.nombre} el ${existente.clase}** (HP: ${existente.hp}/${existente.hpMax}).\n` +
        `Escribe \`!reiniciar\` si quieres empezar desde cero, o sigue escribiendo lo que quieres hacer.`
      );
    }
    creacionEnCurso.set(userId, { paso: 1 });
    return message.reply(
      `🎲 **¡Vamos a crear tu personaje!**\n\n` +
      `✏️ ¿Cómo se llama tu personaje?`
    );
  }

  // ── !yo — Muestra ficha del personaje ────────────────
  if (comando === "!yo") {
    const p = await Personaje.findOne({ discordId: userId, guildId });
    if (!p) return message.reply("⚠️ No tienes personaje. Escribe `!jugar` para crear uno.");
    const datos = CLASES[p.clase.toLowerCase()] || { emoji: "🧙" };
    return message.reply(
      `${datos.emoji} **Ficha de ${p.nombre}**\n` +
      `Clase: ${p.clase}\n` +
      `HP: ${p.hp}/${p.hpMax} ❤️\n` +
      `Oro: ${p.oro} 🪙\n` +
      `Inventario: ${p.inventario.join(", ")}`
    );
  }

  // ── !reiniciar — Borra personaje e historial ─────────
  if (comando === "!reiniciar") {
    await Personaje.deleteOne({ discordId: userId, guildId });
    historialesPorServidor.delete(guildId);
    return message.reply(
      `🔄 **Personaje eliminado e historial borrado.**\n` +
      `Escribe \`!jugar\` para comenzar una nueva aventura.`
    );
  }

  // ── Comando desconocido ───────────────────────────────
  if (content.startsWith("!")) {
    return message.reply("❓ Comando no reconocido. Escribe `!ayuda` para ver los comandos disponibles.");
  }

  // ── Narración libre ───────────────────────────────────
  try {
    const p = await Personaje.findOne({ discordId: userId, guildId });
    if (!p) {
      return message.reply(
        `⚠️ Necesitas un personaje para jugar.\n` +
        `Escribe \`!jugar\` para crear uno — ¡solo toma un momento!`
      );
    }

    const respuesta = await mantenerTyping(
      message.channel,
      narrarEscena(content, p, guildId)
    );
    return message.reply(respuesta);
  } catch (e) {
    console.error("❌ Error en narración:", e);
    return message.reply("❌ Ocurrió un error inesperado. Intenta de nuevo.");
  }
});

process.on("unhandledRejection", (err) => {
  console.error("❌ Error no manejado:", err);
});

client.login(DISCORD_TOKEN);
