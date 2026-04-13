const { Client, GatewayIntentBits } = require("discord.js");
const Anthropic = require("@anthropic-ai/sdk");

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const DM_CHANNEL_NAME = "dungeon-master";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// ============================================================
// CLASES D&D 5e
// ============================================================
const CLASES = {
  Guerrero: {
    dadoGolpe: 10,
    stats: { fue: 16, des: 12, con: 14, int: 8, sab: 10, car: 10 },
    descripcion: "Experto en combate. Dado de golpe: d10.",
    habilidad: "Segundo Aire (recupera HP una vez por combate)"
  },
  Mago: {
    dadoGolpe: 6,
    stats: { fue: 8, des: 14, con: 10, int: 16, sab: 12, car: 10 },
    descripcion: "Poderoso lanzador de conjuros. Dado de golpe: d6.",
    habilidad: "Conjuros arcanos devastadores"
  },
  Pícaro: {
    dadoGolpe: 8,
    stats: { fue: 10, des: 16, con: 12, int: 12, sab: 10, car: 14 },
    descripcion: "Ágil y sigiloso. Dado de golpe: d8.",
    habilidad: "Ataque furtivo (daño extra desde las sombras)"
  },
  Clérigo: {
    dadoGolpe: 8,
    stats: { fue: 12, des: 10, con: 14, int: 10, sab: 16, car: 12 },
    descripcion: "Sanador con magia divina. Dado de golpe: d8.",
    habilidad: "Curar heridas (1d8+SAB HP restaurados)"
  },
  Bárbaro: {
    dadoGolpe: 12,
    stats: { fue: 17, des: 13, con: 16, int: 8, sab: 10, car: 8 },
    descripcion: "Guerrero salvaje con furia imparable. Dado de golpe: d12.",
    habilidad: "Rabia (ventaja en ataques de FUE, resistencia al daño)"
  },
  Bardo: {
    dadoGolpe: 8,
    stats: { fue: 8, des: 14, con: 12, int: 12, sab: 10, car: 16 },
    descripcion: "Músico mágico y muy versátil. Dado de golpe: d8.",
    habilidad: "Inspiración bárdica (da ventaja a un aliado)"
  }
};

const TIPOS_AVENTURA = {
  "1": "Mazmorra misteriosa",
  "2": "Bosque encantado",
  "3": "Ciudad corrupta",
  "4": "Viaje en barco"
};

function getMod(stat) { return Math.floor((stat - 10) / 2); }
function getModStr(stat) { const m = getMod(stat); return m >= 0 ? `+${m}` : `${m}`; }
function calcularHP(clase) { return CLASES[clase].dadoGolpe + getMod(CLASES[clase].stats.con); }

// ============================================================
// SESIONES
// ============================================================
const sessions = new Map();

function getSession(guildId) {
  if (!sessions.has(guildId)) {
    sessions.set(guildId, {
      history: [],
      players: {},
      setupStep: null,
      totalPlayers: 0,
      currentPlayerSetup: 0,
      tempName: null,
      adventureType: null,
    });
  }
  return sessions.get(guildId);
}

// ============================================================
// SYSTEM PROMPT D&D 5e
// ============================================================
const SYSTEM_PROMPT = `Eres un Dungeon Master experto en D&D 5ª Edición, adaptado para PRINCIPIANTES ABSOLUTOS.
Narras aventuras en español usando las reglas oficiales de D&D 5e simplificadas.

=== REGLAS D&D 5e ===

TIRADAS DE D20:
- Todas las acciones importantes requieren tirar un d20 (dado de 20 caras)
- Se suman modificadores de estadística y bonificador de competencia (+2 a nivel 1)
- CD (Clase de Dificultad): Fácil=10, Medio=15, Difícil=20, Muy difícil=25
- Natural 20 = Éxito crítico ¡algo espectacular ocurre!
- Natural 1 = Pifia crítica ¡algo sale terriblemente mal!

ESTADÍSTICAS:
- FUE: ataques cuerpo a cuerpo, empujar, cargar
- DES: ataques a distancia, sigilo, acrobacias, iniciativa
- CON: HP, resistencia, concentración
- INT: magia arcana, investigación, historia, conocimiento
- SAB: percepción, intuición, supervivencia, magia divina
- CAR: persuasión, engaño, intimidación, actuación

COMBATE:
1. Iniciativa: todos tiran d20+DES, actúan de mayor a menor
2. Ataque: d20 + modificador + competencia (+2) vs CA enemigo
3. CA enemigos comunes: 10-12 (débil), 13-15 (normal), 16+ (fuerte)
4. Daño: espada d8+FUE, daga d4+DES, arco d6+DES, conjuro varía
5. Ventaja: tira 2d20 toma el mayor / Desventaja: toma el menor

HP Y CURACIÓN:
- A 0 HP: inconsciente, tiradas de salvación de muerte
- Tirada de salvación muerte: d20 cada turno, 3 éxitos=estable, 3 fallos=muerte
- Curar heridas: 1d8+SAB
- Descanso corto (1h): recupera dados de golpe
- Descanso largo (8h): recupera todo HP y conjuros

SALVACIONES:
- El DM pide tirada de salvación ante peligros (veneno, trampas, etc.)
- d20 + modificador del atributo relevante vs CD del peligro

=== CÓMO NARRAR ===
- Explica SIEMPRE qué dado tirar, qué modificador sumar y por qué
- Describe los resultados de forma emocionante y cinematográfica
- Ofrece 3-4 opciones claras al final de cada escena
- Usa emojis para hacer la narración más visual ⚔️🎲🗡️🧙
- Cuando el HP cambie usa [HP:NombreJugador:XX] al final del mensaje
- Avisa con ⚠️ cuando alguien baje del 30% HP
- 💀 si alguien llega a 0 HP e inicia tiradas de salvación de muerte
- Máximo 5 párrafos por respuesta
- Tono épico, divertido y paciente con los principiantes`;

// ============================================================
// CONSULTAR AL DM
// ============================================================
async function askDM(guildId, userMessage, userName) {
  const session = getSession(guildId);

  let playerContext = "";
  if (Object.keys(session.players).length > 0) {
    playerContext = "\n=== ESTADO JUGADORES ===\n";
    for (const [name, data] of Object.entries(session.players)) {
      const hpMax = calcularHP(data.clase);
      const stats = CLASES[data.clase].stats;
      playerContext += `${name} (${data.clase}): HP ${data.hp}/${hpMax} | `;
      playerContext += `FUE${getModStr(stats.fue)} DES${getModStr(stats.des)} CON${getModStr(stats.con)} INT${getModStr(stats.int)} SAB${getModStr(stats.sab)} CAR${getModStr(stats.car)} | Prof+2\n`;
    }
    if (session.adventureType) playerContext += `Aventura: ${session.adventureType}\n`;
  }

  session.history.push({ role: "user", content: `${playerContext}[${userName}]: ${userMessage}` });
  if (session.history.length > 30) session.history.splice(0, session.history.length - 30);

  let attempts = 0;
  while (attempts < 3) {
    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: session.history,
      });
      const reply = response.content[0].text;
      session.history.push({ role: "assistant", content: reply });

      // Actualizar HP
      for (const match of reply.matchAll(/\[HP:([^:]+):(\d+)\]/g)) {
        if (session.players[match[1]]) session.players[match[1]].hp = parseInt(match[2]);
      }

      return reply.replace(/\[HP:[^\]]+\]/g, "").trim();
    } catch (error) {
      if (error.status === 529 && attempts < 2) {
        attempts++;
        await new Promise(r => setTimeout(r, 5000));
      } else throw error;
    }
  }
}

async function sendLong(channel, text) {
  if (text.length <= 1900) return channel.send(text);
  for (const chunk of text.match(/[\s\S]{1,1900}/g)) await channel.send(chunk);
}

// ============================================================
// EVENTOS
// ============================================================
client.once("ready", () => {
  console.log(`✅ DM Bot conectado como: ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.channel.name !== DM_CHANNEL_NAME) return;

  const content = message.content.trim();
  const lower = content.toLowerCase();
  const session = getSession(message.guild.id);

  // TIRAR DADOS
  if (lower.startsWith("!tirar")) {
    const sides = parseInt(lower.split(/\s+/)[1]) || 20;
    if (sides < 2 || sides > 100) return message.reply("⚠️ Dado entre 2 y 100 caras.");
    const r = Math.floor(Math.random() * sides) + 1;
    const emoji = r === sides ? "🌟" : r === 1 ? "💀" : "🎲";
    const extra = r === sides ? " **¡CRÍTICO!**" : r === 1 ? " **¡PIFIA!**" : "";
    return message.reply(`${emoji} **${message.author.username}** tiró d${sides}: **${r}**${extra}`);
  }

  // REINICIAR
  if (lower === "!reiniciar" || lower === "!reset") {
    sessions.delete(message.guild.id);
    return message.reply("🔄 Sesión reiniciada. Escribe `!inicio` para empezar.");
  }

  // CLASES
  if (lower === "!clases") {
    let msg = "📖 **Clases D&D 5e disponibles:**\n\n";
    for (const [n, d] of Object.entries(CLASES)) {
      msg += `**${n}** — ${d.descripcion}\n⚡ ${d.habilidad}\n\n`;
    }
    return message.reply(msg);
  }

  // AYUDA
  if (lower === "!ayuda" || lower === "!help") {
    return message.reply(`📜 **Comandos:**
⚔️ \`!inicio\` — Nueva aventura con creación de personaje D&D 5e
🎲 \`!tirar\` — Tirar d20
🎲 \`!tirar 8\` — Tirar cualquier dado (d4,d6,d8,d10,d12,d20)
📋 \`!resumen\` — Estado de la partida y HP de todos
📖 \`!clases\` — Ver todas las clases disponibles
🔄 \`!reiniciar\` — Reiniciar sesión
❓ \`!ayuda\` — Este mensaje`);
  }

  // RESUMEN
  if (lower === "!resumen") {
    if (Object.keys(session.players).length === 0)
      return message.reply("⚠️ No hay aventura activa. Escribe `!inicio`.");
    let r = `📋 **Estado de la partida — D&D 5e**\n🗺️ **Aventura:** ${session.adventureType || "En progreso"}\n\n`;
    for (const [name, data] of Object.entries(session.players)) {
      const hpMax = calcularHP(data.clase);
      const pct = Math.round((data.hp / hpMax) * 100);
      const estado = pct > 60 ? "🟢 Saludable" : pct > 30 ? "🟡 Herido" : pct > 0 ? "🔴 En peligro" : "💀 Inconsciente";
      const s = CLASES[data.clase].stats;
      r += `**${name}** (${data.clase}) ${estado}\n`;
      r += `HP: ${data.hp}/${hpMax} | FUE${getModStr(s.fue)} DES${getModStr(s.des)} CON${getModStr(s.con)} INT${getModStr(s.int)} SAB${getModStr(s.sab)} CAR${getModStr(s.car)}\n\n`;
    }
    return message.reply(r);
  }

  // INICIO
  if (lower === "!inicio" || lower === "comenzar") {
    sessions.delete(message.guild.id);
    const ns = getSession(message.guild.id);
    ns.setupStep = "asking_players";
    return message.reply(`⚔️ **¡Bienvenidos a D&D 5ª Edición!**\n\n🧙 Soy vuestro Dungeon Master. Usaremos las reglas oficiales de D&D 5e adaptadas para principiantes.\n\n**¿Cuántos jugadores participarán? (1 a 6)**\nEscribe solo el número.`);
  }

  // SETUP: número de jugadores
  if (session.setupStep === "asking_players") {
    const num = parseInt(content);
    if (isNaN(num) || num < 1 || num > 6) return message.reply("⚠️ Escribe un número entre 1 y 6.");
    session.totalPlayers = num;
    session.currentPlayerSetup = 1;
    session.setupStep = "player_name";
    return message.reply(`¡Perfecto, **${num} aventurero${num > 1 ? "s" : ""}**! 🎉\n\n👤 **Jugador 1:** ¿Cuál es el nombre de tu personaje?`);
  }

  // SETUP: nombre
  if (session.setupStep === "player_name") {
    session.tempName = content;
    session.setupStep = "player_class";
    return message.reply(`¡Hola **${content}**! 🎭\n\nElige tu clase:\n\n1️⃣ **Guerrero** — Maestro del combate (HP alto)\n2️⃣ **Mago** — Conjuros devastadores (HP bajo)\n3️⃣ **Pícaro** — Sigilo y ataques furtivos (HP medio)\n4️⃣ **Clérigo** — Sanación y magia divina (HP medio)\n5️⃣ **Bárbaro** — Furia salvaje (HP muy alto)\n6️⃣ **Bardo** — Música mágica y muy versátil (HP medio)\n\nEscribe el número o el nombre. Usa \`!clases\` para más detalles.`);
  }

  // SETUP: clase
  if (session.setupStep === "player_class") {
    const claseMap = {
      "1": "Guerrero", "guerrero": "Guerrero",
      "2": "Mago", "mago": "Mago",
      "3": "Pícaro", "picaro": "Pícaro", "pícaro": "Pícaro",
      "4": "Clérigo", "clerigo": "Clérigo", "clérigo": "Clérigo",
      "5": "Bárbaro", "barbaro": "Bárbaro", "bárbaro": "Bárbaro",
      "6": "Bardo", "bardo": "Bardo",
    };
    const clase = claseMap[lower];
    if (!clase) return message.reply("⚠️ Clase no reconocida. Escribe el número (1-6) o el nombre.");

    const hp = calcularHP(clase);
    const s = CLASES[clase].stats;
    session.players[session.tempName] = { clase, hp };

    let confirm = `✅ **${session.tempName}** — ${clase}\n`;
    confirm += `❤️ HP: ${hp} | 🛡️ Competencia: +2\n`;
    confirm += `📊 FUE${getModStr(s.fue)} DES${getModStr(s.des)} CON${getModStr(s.con)} INT${getModStr(s.int)} SAB${getModStr(s.sab)} CAR${getModStr(s.car)}\n`;
    confirm += `⚡ ${CLASES[clase].habilidad}\n`;

    if (session.currentPlayerSetup < session.totalPlayers) {
      session.currentPlayerSetup++;
      session.setupStep = "player_name";
      await message.reply(confirm);
      return message.channel.send(`👤 **Jugador ${session.currentPlayerSetup}:** ¿Cuál es el nombre de tu personaje?`);
    } else {
      session.setupStep = "choosing_adventure";
      await message.reply(confirm);
      return message.channel.send(`🎉 **¡Todos los personajes listos!**\n\n¿Qué aventura queréis vivir?\n\n1️⃣ **Mazmorra misteriosa** — Ruinas llenas de trampas y monstruos\n2️⃣ **Bosque encantado** — Un bosque mágico con secretos oscuros\n3️⃣ **Ciudad corrupta** — Intriga, crimen y peligro\n4️⃣ **Viaje en barco** — Alta mar, piratas y tesoros\n\nEscribe el número.`);
    }
  }

  // SETUP: tipo de aventura
  if (session.setupStep === "choosing_adventure") {
    const aventura = TIPOS_AVENTURA[content];
    if (!aventura) return message.reply("⚠️ Escribe un número del 1 al 4.");
    session.adventureType = aventura;
    session.setupStep = null;

    let lista = "Personajes:\n";
    for (const [name, data] of Object.entries(session.players)) {
      lista += `- ${name} (${data.clase}, ${data.hp} HP)\n`;
    }

    await message.channel.send(`⚔️ **¡La aventura "${aventura}" está a punto de comenzar!** 🎲`);
    try {
      await message.channel.sendTyping();
      const intro = await askDM(
        message.guild.id,
        `Inicia la aventura en: ${aventura}. ${lista} Preséntate como DM, haz una introducción épica, presenta a cada personaje por nombre y clase, explica brevemente las reglas básicas de D&D 5e (tiradas d20, CD, críticos) y termina con la primera escena y 3-4 opciones de acción.`,
        "Sistema"
      );
      await sendLong(message.channel, intro);
    } catch (e) {
      console.error(e);
      message.channel.send("⚠️ Error al iniciar la aventura. Intenta de nuevo.");
    }
    return;
  }

  // RESPUESTA NORMAL DEL DM
  if (!session.setupStep) {
    if (Object.keys(session.players).length === 0)
      return message.reply("⚠️ No hay aventura activa. Escribe `!inicio` para comenzar.");
    try {
      await message.channel.sendTyping();
      const reply = await askDM(message.guild.id, content, message.author.username);
      await sendLong(message.channel, reply);
    } catch (e) {
      console.error(e);
      message.reply("⚠️ *(El oráculo se ha oscurecido... Algo salió mal. Intenta de nuevo.)*");
    }
  }
});

client.login(DISCORD_TOKEN);
