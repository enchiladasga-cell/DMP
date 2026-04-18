const {
  Client,
  GatewayIntentBits,
  Events
} = require("discord.js");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const mongoose = require("mongoose");

// ═══════════════════════════════════════════════════════
//  CONFIGURACIÓN
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
//  AVENTURAS PREDEFINIDAS
//  Cada aventura tiene: nombre, tipo, descripción y prompt
//  de inicio que se envía a Gemini para arrancar la historia
// ═══════════════════════════════════════════════════════
const AVENTURAS = {
  1: {
    nombre:      "Las Catacumbas Malditas",
    tipo:        "🏚️ Mazmorra Clásica",
    descripcion: "Un grupo de aventureros desciende a unas catacumbas llenas de no-muertos, trampas mortales y un tesoro legendario custodiado por un liche antiguo.",
    prompt:      "El jugador acaba de descender por una escalera de piedra hacia unas catacumbas antiguas. El aire huele a polvo y muerte. Antorchas tenues iluminan corredores llenos de huesos. En la distancia se escuchan pasos arrastrados. Comienza la historia con tensión y misterio, describe el entorno con detalle sensorial y ofrece 3 opciones de acción numeradas."
  },
  2: {
    nombre:      "La Corona del Dragón de Fuego",
    tipo:        "🐉 Historia Épica",
    descripcion: "Un reino está siendo devastado por un dragón anciano que reclama una corona perdida. Solo un héroe puede recuperarla desde las ruinas de un castillo volcánico.",
    prompt:      "El jugador se encuentra en las afueras de un reino en llamas. En el horizonte, un dragón rojo circunda una montaña volcánica donde se dice que está la Corona del Dragón. Aldeanos desesperados piden ayuda. Comienza la historia con epicidad y peligro, describe el ambiente desolado y ofrece 3 opciones de acción numeradas."
  },
  3: {
    nombre:      "El Asesino de Puerta Negra",
    tipo:        "🔍 Misterio Oscuro",
    descripcion: "En la ciudad de Puerta Negra, nobles aparecen muertos con una marca extraña. Las pistas apuntan a una secta secreta y una maldición ancestral.",
    prompt:      "El jugador llega a Puerta Negra, una ciudad envuelta en niebla y miedo. Acaban de encontrar otro noble muerto con una extraña marca en forma de ojo en su frente. La guardia está sobornada y nadie habla. Comienza el misterio con atmósfera oscura y opresiva, describe la ciudad y ofrece 3 opciones de investigación numeradas."
  },
  4: {
    nombre:      "El Bosque de los Espíritus",
    tipo:        "🌲 Aventura Mágica",
    descripcion: "Un bosque encantado donde los árboles hablan y los espíritus antiguos guardan un secreto que podría salvar o destruir el mundo natural.",
    prompt:      "El jugador entra a un bosque donde los árboles murmuran nombres y las luces de colores flotan entre las ramas. Un espíritu zorro aparece y dice que el Gran Árbol está muriendo. Comienza la historia con magia y maravilla, describe los sonidos y colores del bosque y ofrece 3 opciones de acción numeradas."
  },
  5: {
    nombre:      "El Puerto de los Piratas",
    tipo:        "⚓ Aventura en el Mar",
    descripcion: "En un puerto corrupto dominado por piratas, el jugador debe encontrar un mapa hacia una isla con un tesoro que muchos matarían por obtener.",
    prompt:      "El jugador llega al Puerto Maldito, una ciudad costera llena de piratas, contrabandistas y tabernas ruidosas. En el suelo hay un marinero muerto con un trozo de mapa en la mano. El olor a sal y ron llena el aire. Comienza la historia con intriga y peligro callejero, describe el ambiente portuario y ofrece 3 opciones de acción numeradas."
  }
};

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
  if (!historialesPorServidor.has(guildId)) historialesPorServidor.set(guildId, []);
  return historialesPorServidor.get(guildId);
}

function agregarAlHistorial(guildId, role, text) {
  const historial = obtenerHistorial(guildId);
  historial.push({ role, parts: [{ text }] });
  if (historial.length > 40) historialesPorServidor.set(guildId, historial.slice(-40));
}

// ═══════════════════════════════════════════════════════
//  BASE DE DATOS (MongoDB)
// ═══════════════════════════════════════════════════════
const PersonajeSchema = new mongoose.Schema({
  discordId:       { type: String, required: true },
  guildId:         { type: String, required: true },
  nombre:          { type: String, required: true },
  clase:           { type: String, required: true },
  hp:              { type: Number, required: true },
  hpMax:           { type: Number, required: true },
  oro:             { type: Number, default: 50 },
  inventario:      { type: [String], default: ["Ropas comunes"] },
  aventuraActual:  { type: Number, default: null }
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
//  CLASES DISPONIBLES
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
  try { return await promesa; } finally { clearInterval(intervalo); }
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
    }).startChat({ history: obtenerHistorial(guildId).slice(0, -1) });

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
//  MENSAJES DE AYUDA Y LISTAS
// ═══════════════════════════════════════════════════════
function mensajeAyuda() {
  const listaClases = Object.entries(CLASES)
    .map(([nombre, d]) => `  ${d.emoji} **${nombre}** — ${d.descripcion} (HP: ${d.hp})`)
    .join("\n");
  return (
    `# ⚔️ Dungeon Master Bot — Guía Rápida\n\n` +
    `## 🚀 ¿Cómo empezar?\n` +
    `Escribe \`!jugar\` y el bot te guiará paso a paso.\n\n` +
    `## 📋 Comandos\n` +
    `\`!jugar\`      — Crea tu personaje y elige una aventura\n` +
    `\`!aventuras\`  — Lista todas las aventuras disponibles\n` +
    `\`!yo\`         — Muestra tu ficha de personaje\n` +
    `\`!reiniciar\`  — Borra tu personaje e historia\n` +
    `\`!ayuda\`      — Muestra este mensaje\n\n` +
    `## 🧙 Clases disponibles\n${listaClases}\n\n` +
    `## 💬 ¿Cómo jugar?\n` +
    `Una vez creado tu personaje, **escribe libremente** lo que quieres hacer.\n` +
    `El DM responderá y te dará **3 opciones** para continuar.\n\n` +
    `*Ejemplo:* \`Entro al bosque con cuidado y observo mis alrededores\``
  );
}

function listaAventuras() {
  const lista = Object.entries(AVENTURAS)
    .map(([num, a]) => `**${num}.** ${a.tipo} — **${a.nombre}**\n    _${a.descripcion}_`)
    .join("\n\n");
  return `# 🗺️ Aventuras Disponibles\n\n${lista}\n\n*Escribe \`!jugar\` para elegir una al crear tu personaje.*`;
}

// ═══════════════════════════════════════════════════════
//  FLUJO DE CREACIÓN DE PERSONAJE PASO A PASO
//  Estado: { paso, nombre?, clase? }
// ═══════════════════════════════════════════════════════
const creacionEnCurso = new Map();

async function manejarCreacion(message) {
  const userId  = message.author.id;
  const guildId = message.guild.id;
  const estado  = creacionEnCurso.get(userId);
  const texto   = message.content.trim();

  // PASO 1 — Pedir nombre
  if (estado.paso === 1) {
    if (texto.length < 2 || texto.length > 20)
      return message.reply("✏️ El nombre debe tener entre 2 y 20 caracteres. ¿Cómo se llama tu personaje?");

    creacionEnCurso.set(userId, { paso: 2, nombre: texto });
    const listaClases = Object.entries(CLASES)
      .map(([n, d], i) => `**${i + 1}.** ${d.emoji} ${n} — ${d.descripcion} (HP: ${d.hp})`)
      .join("\n");
    return message.reply(`✅ ¡Perfecto, **${texto}**!\n\nAhora elige tu clase escribiendo el **número** o el **nombre**:\n\n${listaClases}`);
  }

  // PASO 2 — Elegir clase
  if (estado.paso === 2) {
    const nombresClases = Object.keys(CLASES);
    let claseElegida = null;
    const num = parseInt(texto);
    if (!isNaN(num) && num >= 1 && num <= nombresClases.length) claseElegida = nombresClases[num - 1];
    else if (CLASES[texto.toLowerCase()]) claseElegida = texto.toLowerCase();

    if (!claseElegida)
      return message.reply(`❌ Clase no reconocida. Escribe el número o nombre:\n` + Object.keys(CLASES).map((c, i) => `**${i + 1}.** ${c}`).join(" | "));

    creacionEnCurso.set(userId, { paso: 3, nombre: estado.nombre, clase: claseElegida });

    const listaAv = Object.entries(AVENTURAS)
      .map(([n, a]) => `**${n}.** ${a.tipo} — **${a.nombre}**\n    _${a.descripcion}_`)
      .join("\n\n");
    return message.reply(`${CLASES[claseElegida].emoji} ¡Perfecto! Ahora elige tu **aventura** escribiendo su número:\n\n${listaAv}`);
  }

  // PASO 3 — Elegir aventura
  if (estado.paso === 3) {
    const numAv = parseInt(texto);
    if (!AVENTURAS[numAv])
      return message.reply(`❌ Escribe un número del 1 al ${Object.keys(AVENTURAS).length} para elegir la aventura.`);

    const { nombre, clase } = estado;
    const datos    = CLASES[clase];
    const aventura = AVENTURAS[numAv];
    creacionEnCurso.delete(userId);

    const p = await Personaje.findOneAndUpdate(
      { discordId: userId, guildId },
      { nombre, clase, hp: datos.hp, hpMax: datos.hp, oro: 50, inventario: ["Ropas comunes"], aventuraActual: numAv },
      { upsert: true, new: true }
    );

    historialesPorServidor.delete(guildId);
    await message.channel.sendTyping();

    const textoInicial =
      `El personaje se llama ${nombre} y es un ${clase}. ` + aventura.prompt;

    const intro = await mantenerTyping(message.channel, narrarEscena(textoInicial, p, guildId));

    return message.reply(
      `${datos.emoji} **${nombre} el ${clase}** — ${aventura.tipo}: **${aventura.nombre}**\n` +
      `HP: ${p.hp}/${p.hpMax} ❤️ | Oro: ${p.oro} 🪙\n` +
      `─────────────────────────────\n${intro}`
    );
  }
}

// ═══════════════════════════════════════════════════════
//  EVENTOS DEL BOT
// ═══════════════════════════════════════════════════════
client.once(Events.ClientReady, async (c) => {
  console.log(`⚔️  DM Master v9.0 (con aventuras) listo: ${c.user.tag}`);
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

  const content = message.content.trim();
  if (!content) return;

  const userId  = message.author.id;
  const guildId = message.guild.id;
  const comando = content.split(/\s+/)[0].toLowerCase();

  // Si está en proceso de creación
  if (creacionEnCurso.has(userId)) {
    if (content.startsWith("!")) {
      creacionEnCurso.delete(userId);
      await message.reply("⚠️ Creación cancelada.");
    } else {
      return manejarCreacion(message);
    }
  }

  if (comando === "!ayuda" || comando === "!help") return message.reply(mensajeAyuda());

  if (comando === "!aventuras") return message.reply(listaAventuras());

  if (comando === "!jugar") {
    const existente = await Personaje.findOne({ discordId: userId, guildId });
    if (existente) {
      const av = AVENTURAS[existente.aventuraActual];
      return message.reply(
        `⚠️ Ya tienes un personaje: **${existente.nombre} el ${existente.clase}**\n` +
        `Aventura actual: ${av ? av.nombre : "libre"}\n\n` +
        `Escribe \`!reiniciar\` para empezar desde cero o sigue escribiendo tu acción.`
      );
    }
    creacionEnCurso.set(userId, { paso: 1 });
    return message.reply(`🎲 **¡Vamos a crear tu personaje!**\n\n✏️ ¿Cómo se llama tu personaje?`);
  }

  if (comando === "!yo") {
    const p = await Personaje.findOne({ discordId: userId, guildId });
    if (!p) return message.reply("⚠️ No tienes personaje. Escribe `!jugar` para crear uno.");
    const datos = CLASES[p.clase.toLowerCase()] || { emoji: "🧙" };
    const av    = AVENTURAS[p.aventuraActual];
    return message.reply(
      `${datos.emoji} **Ficha de ${p.nombre}**\n` +
      `Clase: ${p.clase}\n` +
      `HP: ${p.hp}/${p.hpMax} ❤️\n` +
      `Oro: ${p.oro} 🪙\n` +
      `Inventario: ${p.inventario.join(", ")}\n` +
      `Aventura: ${av ? `${av.tipo} — ${av.nombre}` : "Libre"}`
    );
  }

  if (comando === "!reiniciar") {
    await Personaje.deleteOne({ discordId: userId, guildId });
    historialesPorServidor.delete(guildId);
    return message.reply(`🔄 **Personaje eliminado e historial borrado.**\nEscribe \`!jugar\` para comenzar de nuevo.`);
  }

  if (content.startsWith("!"))
    return message.reply("❓ Comando no reconocido. Escribe `!ayuda` para ver los comandos disponibles.");

  // Narración libre
  try {
    const p = await Personaje.findOne({ discordId: userId, guildId });
    if (!p) return message.reply("⚠️ Necesitas un personaje. Escribe `!jugar` para crear uno.");
    const respuesta = await mantenerTyping(message.channel, narrarEscena(content, p, guildId));
    return message.reply(respuesta);
  } catch (e) {
    console.error("❌ Error en narración:", e);
    return message.reply("❌ Ocurrió un error inesperado. Intenta de nuevo.");
  }
});

process.on("unhandledRejection", (err) => console.error("❌ Error no manejado:", err));

client.login(DISCORD_TOKEN);
