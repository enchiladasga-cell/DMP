const { Client, GatewayIntentBits } = require("discord.js");
const Anthropic = require("@anthropic-ai/sdk");
const mongoose = require("mongoose");

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MONGODB_URI = process.env.MONGODB_URI;
const DM_CHANNEL_NAME = "dungeon-master";

const PersonajeSchema = new mongoose.Schema({
  discordId: { type: String, required: true },
  discordUsername: { type: String, required: true },
  guildId: { type: String, required: true },
  nombre: { type: String, required: true },
  clase: { type: String, required: true },
  hp: { type: Number, required: true },
  hpMax: { type: Number, required: true },
  nivel: { type: Number, default: 1 },
  xp: { type: Number, default: 0 },
  oro: { type: Number, default: 0 },
  inventario: { type: [String], default: [] },
  habilidadUsada: { type: Number, default: 0 },
  enRabia: { type: Boolean, default: false },
  aventurasCompletadas: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now },
});

PersonajeSchema.index({ discordId: 1, guildId: 1 }, { unique: true });
const Personaje = mongoose.model("Personaje", PersonajeSchema);

mongoose.connect(MONGODB_URI)
  .then(() => console.log("✅ MongoDB conectado"))
  .catch(err => console.error("❌ Error MongoDB:", err));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

const NIVELES = {
  1: { xpNecesario: 0, bonusHP: 0, descripcion: "Aventurero novato" },
  2: { xpNecesario: 300, bonusHP: 5, descripcion: "Aventurero aprendiz" },
  3: { xpNecesario: 600, bonusHP: 10, descripcion: "Aventurero experimentado" },
  4: { xpNecesario: 1200, bonusHP: 15, descripcion: "Veterano de batalla" },
  5: { xpNecesario: 2100, bonusHP: 20, descripcion: "Héroe legendario" },
};

function xpParaSiguienteNivel(nivel) {
  return NIVELES[nivel + 1]?.xpNecesario || null;
}

function verificarSubidaNivel(personaje) {
  if (personaje.nivel >= 5) return null;
  const xpNecesario = NIVELES[personaje.nivel + 1]?.xpNecesario;
  if (xpNecesario && personaje.xp >= xpNecesario) {
    personaje.nivel += 1;
    const bonusHP = NIVELES[personaje.nivel].bonusHP;
    personaje.hpMax = calcularHPBase(personaje.clase) + bonusHP;
    personaje.hp = personaje.hpMax;
    return personaje.nivel;
  }
  return null;
}

const CLASES = {
  Guerrero: {
    dadoGolpe: 10,
    stats: { fue: 16, des: 12, con: 14, int: 8, sab: 10, car: 10 },
    descripcion: "Experto en combate. Dado de golpe: d10.",
    habilidad: "Segundo Aire (recupera HP una vez por combate)",
    habilidadNombre: "Segundo Aire",
    habilidadUsos: 1,
    usarHabilidad: (player) => {
      const recuperado = Math.floor(Math.random() * 10) + 1 + getMod(CLASES[player.clase].stats.con);
      const anterior = player.hp;
      player.hp = Math.min(player.hpMax, player.hp + recuperado);
      return `💨 **Segundo Aire** activado. Recuperas **${player.hp - anterior} HP** (${player.hp}/${player.hpMax}).`;
    }
  },
  Mago: {
    dadoGolpe: 6,
    stats: { fue: 8, des: 14, con: 10, int: 16, sab: 12, car: 10 },
    descripcion: "Poderoso lanzador de conjuros. Dado de golpe: d6.",
    habilidad: "Conjuro arcano (lanza un conjuro devastador)",
    habilidadNombre: "Conjuro Arcano",
    habilidadUsos: 3,
    usarHabilidad: (player) => {
      const dano = Math.floor(Math.random() * 8) + 1 + Math.floor(Math.random() * 8) + 1 + getMod(CLASES[player.clase].stats.int);
      return `🔮 **Conjuro Arcano** lanzado. Generas **${dano} de daño mágico**. El DM narrará el resultado.`;
    }
  },
  Pícaro: {
    dadoGolpe: 8,
    stats: { fue: 10, des: 16, con: 12, int: 12, sab: 10, car: 14 },
    descripcion: "Ágil y sigiloso. Dado de golpe: d8.",
    habilidad: "Ataque furtivo (daño extra desde las sombras)",
    habilidadNombre: "Ataque Furtivo",
    habilidadUsos: 1,
    usarHabilidad: (player) => {
      const dano = Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1 + getMod(CLASES[player.clase].stats.des);
      return `🗡️ **Ataque Furtivo** desde las sombras. Infliges **${dano} de daño extra**. El DM narrará si conecta.`;
    }
  },
  Clérigo: {
    dadoGolpe: 8,
    stats: { fue: 12, des: 10, con: 14, int: 10, sab: 16, car: 12 },
    descripcion: "Sanador con magia divina. Dado de golpe: d8.",
    habilidad: "Curar heridas (restaura HP a ti o un aliado)",
    habilidadNombre: "Curar Heridas",
    habilidadUsos: 3,
    usarHabilidad: (player) => {
      const curado = Math.floor(Math.random() * 8) + 1 + getMod(CLASES[player.clase].stats.sab);
      const anterior = player.hp;
      player.hp = Math.min(player.hpMax, player.hp + curado);
      return `✨ **Curar Heridas** lanzado. Recuperas **${player.hp - anterior} HP** (${player.hp}/${player.hpMax}).`;
    }
  },
  Bárbaro: {
    dadoGolpe: 12,
    stats: { fue: 17, des: 13, con: 16, int: 8, sab: 10, car: 8 },
    descripcion: "Guerrero salvaje con furia imparable. Dado de golpe: d12.",
    habilidad: "Rabia (ventaja en ataques de FUE, resistencia al daño)",
    habilidadNombre: "Rabia",
    habilidadUsos: 2,
    usarHabilidad: (player) => {
      player.enRabia = true;
      return `😡 **¡RABIA ACTIVADA!**
⚔️ Ventaja en ataques de FUE
🛡️ Resistencia al daño físico`;
    }
  },
  Bardo: {
    dadoGolpe: 8,
    stats: { fue: 8, des: 14, con: 12, int: 12, sab: 10, car: 16 },
    descripcion: "Músico mágico y muy versátil. Dado de golpe: d8.",
    habilidad: "Inspiración bárdica (da ventaja a un aliado)",
    habilidadNombre: "Inspiración Bárdica",
    habilidadUsos: 3,
    usarHabilidad: (player) => {
      return `🎵 **Inspiración Bárdica** — Un aliado tira **2d20 y toma el mayor** en su próxima acción.`;
    }
  },
};

const TIPOS_AVENTURA = {
  "1": "Mazmorra misteriosa",
  "2": "Bosque encantado",
  "3": "Ciudad corrupta",
  "4": "Viaje en barco"
};

const MINIJEFES = {
  "Mazmorra misteriosa": { nombre: "Krath el No-Muerto", descripcion: "Un guerrero esquelético con armadura oxidada y ojos llameantes.", personalidad: "Melancólico", hp: 45, ca: 14, dano: "1d10+4", xp: 500, oro: 50 },
  "Bosque encantado": { nombre: "Sylvara la Corrompida", descripcion: "Una dríade con raíces negras que le atraviesan el cuerpo.", personalidad: "Sufre al combatir", hp: 38, ca: 13, dano: "1d8+3", xp: 500, oro: 40 },
  "Ciudad corrupta": { nombre: "El Comisario Vrell", descripcion: "Un oficial corrupto con capa negra y daga envenenada.", personalidad: "Arrogante", hp: 40, ca: 15, dano: "1d6+3", xp: 500, oro: 80 },
  "Viaje en barco": { nombre: "Capitán Mara Huesos", descripcion: "Una pirata no-muerta con garfio de plata y loro esquelético.", personalidad: "Jovial y brutal", hp: 42, ca: 14, dano: "1d8+4", xp: 500, oro: 100 },
};

function getMod(stat) {
  return Math.floor((stat - 10) / 2);
}

function getModStr(stat) {
  const m = getMod(stat);
  return m >= 0 ? `+${m}` : `${m}`;
}

function calcularHPBase(clase) {
  return CLASES[clase].dadoGolpe + getMod(CLASES[clase].stats.con);
}

const sessions = new Map();

function getSession(guildId) {
  if (!sessions.has(guildId)) {
    sessions.set(guildId, {
      history: [],
      players: {},
      userMap: {},
      fase: "esperando",
      hostId: null,
      adventureType: null,
      joinQueue: {},
      minijefeDerrotado: false,
      minijefe: null,
      guildId
    });
  }
  return sessions.get(guildId);
}

function getPlayerNameByDiscordId(session, discordId) {
  return session.userMap[discordId] || null;
}

async function guardarPersonaje(guildId, nombre, data) {
  try {
    await Personaje.findOneAndUpdate(
      { discordId: data.discordId, guildId },
      {
        discordId: data.discordId,
        discordUsername: data.discordUsername,
        guildId,
        nombre,
        clase: data.clase,
        hp: data.hp,
        hpMax: data.hpMax,
        nivel: data.nivel || 1,
        xp: data.xp || 0,
        oro: data.oro || 0,
        inventario: data.inventario || [],
        habilidadUsada: data.habilidadUsada || 0,
        enRabia: data.enRabia || false,
        aventurasCompletadas: data.aventurasCompletadas || 0,
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );
  } catch (e) {
    console.error("Error guardando personaje:", e);
  }
}

async function guardarSesion(guildId, session) {
  for (const [nombre, data] of Object.entries(session.players)) {
    await guardarPersonaje(guildId, nombre, data);
  }
}

async function cargarPersonaje(discordId, guildId) {
  try {
    return await Personaje.findOne({ discordId, guildId });
  } catch (e) {
    console.error("Error cargando personaje:", e);
    return null;
  }
}

const SYSTEM_PROMPT = `Eres un Dungeon Master experto en D&D 5e, adaptado para PRINCIPIANTES ABSOLUTOS. Narras aventuras en español usando las reglas oficiales de D&D 5e simplificadas.
REGLAS D&D 5e:
- Todas las acciones importantes requieren un d20.
- Se suman modificadores de estadística y bonificador de competencia.
- Natural 20 = éxito crítico. Natural 1 = pifia crítica.
- Explica siempre qué dado tirar y qué modificador sumar.
- Ofrece 3-4 opciones al final de cada escena.
- Usa emojis.
- Cuando el HP cambie usa [HP:Nombre:XX].
- Cuando otorgues oro usa [ORO:Nombre:cantidad].
- Cuando otorgues objetos usa [ITEM:Nombre:objeto].
- Cuando otorgues XP usa [XP:Nombre:cantidad].
- Máximo 5 párrafos por respuesta.`;

async function askDM(guildId, userMessage, userName) {
  const session = getSession(guildId);
  let playerContext = "";
  if (Object.keys(session.players).length > 0) {
    playerContext = "
=== ESTADO JUGADORES ===
";
    for (const [name, data] of Object.entries(session.players)) {
      const stats = CLASES[data.clase].stats;
      playerContext += `${name} (@${data.discordUsername}, ${data.clase} Nv${data.nivel}): HP ${data.hp}/${data.hpMax} | XP ${data.xp} | Oro ${data.oro || 0}mo
`;
      playerContext += `FUE${getModStr(stats.fue)} DES${getModStr(stats.des)} CON${getModStr(stats.con)} INT${getModStr(stats.int)} SAB${getModStr(stats.sab)} CAR${getModStr(stats.car)}
`;
      if (data.inventario?.length > 0) playerContext += `Inventario: ${data.inventario.join(", ")}
`;
      if (data.enRabia) playerContext += `EN RABIA
`;
    }
    if (session.adventureType) playerContext += `Aventura: ${session.adventureType}
`;
    if (session.minijefe) {
      playerContext += `MINIJEFE: ${session.minijefe.nombre} HP ${session.minijefe.hpActual}/${session.minijefe.hp}, CA ${session.minijefe.ca}
`;
      playerContext += `Personalidad: ${session.minijefe.personalidad}
`;
    }
  }

  session.history.push({ role: "user", content: `${playerContext}
${userName}: ${userMessage}` });
  if (session.history.length > 40) session.history.splice(0, session.history.length - 40);

  let attempts = 0;
  while (attempts < 3) {
    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: session.history,
      });
      const reply = response.content[0].text;
      session.history.push({ role: "assistant", content: reply });

      for (const match of reply.matchAll(/\[HP:([^:]+):(\d+)\]/g)) {
        const p = session.players[match[1].trim()]; if (p) p.hp = parseInt(match[2]);
      }
      for (const match of reply.matchAll(/\[ITEM:([^:]+):([^\]]+)\]/g)) {
        const p = session.players[match[1].trim()];
        if (p) {
          if (!p.inventario) p.inventario = [];
          const item = match[2].trim();
          if (!p.inventario.includes(item)) p.inventario.push(item);
        }
      }
      for (const match of reply.matchAll(/\[ORO:([^:]+):(\d+)\]/g)) {
        const target = match[1].trim(); const cantidad = parseInt(match[2]);
        if (target.toLowerCase() === "todos") {
          for (const p of Object.values(session.players)) p.oro = (p.oro || 0) + cantidad;
        } else {
          const p = session.players[target]; if (p) p.oro = (p.oro || 0) + cantidad;
        }
      }
      const subidasNivel = [];
      for (const match of reply.matchAll(/\[XP:([^:]+):(\d+)\]/g)) {
        const target = match[1].trim(); const cantidad = parseInt(match[2]);
        const targets = target.toLowerCase() === "todos" ? Object.entries(session.players) : [[target, session.players[target]]];
        for (const [name, p] of targets) {
          if (!p) continue;
          p.xp = (p.xp || 0) + cantidad;
          const nuevoNivel = verificarSubidaNivel(p);
          if (nuevoNivel) subidasNivel.push({ name, nivel: nuevoNivel });
        }
      }

      await guardarSesion(session.guildId, session);
      let cleanReply = reply.replace(/\[HP:[^\]]+\]/g, "").replace(/\[ITEM:[^\]]+\]/g, "").replace(/\[ORO:[^\]]+\]/g, "").replace(/\[XP:[^\]]+\]/g, "").trim();
      if (subidasNivel.length > 0) {
        cleanReply += "

";
        for (const { name, nivel } of subidasNivel) {
          cleanReply += `🎉 **${name}** subió al **NIVEL ${nivel}**! ${NIVELES[nivel].descripcion}
`;
          cleanReply += `❤️ HP máximo aumentado. HP totalmente recuperado!
`;
        }
      }
      return cleanReply;
    } catch (error) {
      attempts++;
      if (error.status === 529 && attempts < 3) await new Promise(r => setTimeout(r, 5000));
      else throw error;
    }
  }
}

async function sendLong(channel, text) {
  if (text.length <= 1900) return channel.send(text);
  for (const chunk of text.match(/.{1,1900}/g)) await channel.send(chunk);
}

async function handleJoinFlow(message, session) {
  const userId = message.author.id;
  const content = message.content.trim();
  const lower = content.toLowerCase();
  const q = session.joinQueue[userId];
  if (!q) return;

  if (q.step === "nombre") {
    const personajeGuardado = await cargarPersonaje(userId, message.guild.id);
    if (personajeGuardado) {
      q.tempName = content;
      q.personajeGuardado = personajeGuardado;
      q.step = "confirmar_personaje";
      return message.reply(`Encontré tu personaje guardado: **${personajeGuardado.nombre}** (${personajeGuardado.clase}, Nv${personajeGuardado.nivel}, HP ${personajeGuardado.hp}/${personajeGuardado.hpMax}, XP ${personajeGuardado.xp}, Oro ${personajeGuardado.oro || 0}mo).

¿Quieres continuar con este personaje?
1) Sí
2) No, crear uno nuevo`);
    }
    q.tempName = content;
    q.step = "clase";
    return message.reply(`Hola **${content}**. Elige tu clase:
1) Guerrero — Maestro del combate
2) Mago — Conjuros devastadores
3) Pícaro — Sigilo y ataques furtivos
4) Clérigo — Sanación y magia divina
5) Bárbaro — Furia salvaje
6) Bardo — Magia versátil

Escribe el número o el nombre.`);
  }

  if (q.step === "confirmar_personaje") {
    if (content === "1" || lower === "si" || lower === "sí" || lower === "s") {
      const pg = q.personajeGuardado;
      session.players[pg.nombre] = {
        clase: pg.clase,
        hp: pg.hp,
        hpMax: pg.hpMax,
        nivel: pg.nivel,
        xp: pg.xp,
        oro: pg.oro,
        inventario: pg.inventario,
        habilidadUsada: 0,
        enRabia: false,
        discordId: userId,
        discordUsername: message.author.username,
        aventurasCompletadas: pg.aventurasCompletadas || 0,
      };
      session.userMap[userId] = pg.nombre;
      delete session.joinQueue[userId];
      return message.reply(`✅ **${pg.nombre}** (${pg.clase} Nv${pg.nivel}) listo. Espera a que el anfitrión escriba **!empezar**.`);
    }
    q.step = "clase";
    return message.reply(`Perfecto. ¿Qué clase quieres?
1) Guerrero
2) Mago
3) Pícaro
4) Clérigo
5) Bárbaro
6) Bardo`);
  }

  if (q.step === "clase") {
    const claseMap = {
      "1": "Guerrero", guerrero: "Guerrero",
      "2": "Mago", mago: "Mago",
      "3": "Pícaro", picaro: "Pícaro", pícaro: "Pícaro",
      "4": "Clérigo", clerigo: "Clérigo", clérigo: "Clérigo",
      "5": "Bárbaro", barbaro: "Bárbaro", bárbaro: "Bárbaro",
      "6": "Bardo", bardo: "Bardo",
    };
    const clase = claseMap[lower];
    if (!clase) return message.reply("Clase no reconocida. Escribe el número 1-6 o el nombre.");
    const nombre = q.tempName;
    const hpMax = calcularHPBase(clase);
    const s = CLASES[clase].stats;
    const playerData = {
      clase,
      hp: hpMax,
      hpMax,
      nivel: 1,
      xp: 0,
      oro: 0,
      inventario: [],
      habilidadUsada: 0,
      enRabia: false,
      discordId: userId,
      discordUsername: message.author.username,
      aventurasCompletadas: 0,
    };
    session.players[nombre] = playerData;
    session.userMap[userId] = nombre;
    await guardarPersonaje(message.guild.id, nombre, playerData);
    delete session.joinQueue[userId];
    return message.reply(`👤 **${nombre}** ${message.author.username}
${clase} Nv1 HP ${hpMax}/${hpMax} Competencia 2 Oro 0mo
FUE${getModStr(s.fue)} DES${getModStr(s.des)} CON${getModStr(s.con)} INT${getModStr(s.int)} SAB${getModStr(s.sab)} CAR${getModStr(s.car)}
${CLASES[clase].habilidad}

✅ Listo. Espera a que el anfitrión escriba **!empezar**.`);
  }
}

client.once("ready", () => console.log(`DM Bot conectado como ${client.user.tag}`));

client.on("messageCreate", async message => {
  if (message.author.bot) return;
  if (!message.guild) return;
  if (message.channel.name !== DM_CHANNEL_NAME) return;

  const content = message.content.trim();
  const lower = content.toLowerCase();
  const session = getSession(message.guild.id);
  session.guildId = message.guild.id;
  const userId = message.author.id;

  if (session.joinQueue[userId]) return handleJoinFlow(message, session);

  if (lower.startsWith("!tirar")) {
    const sides = parseInt(lower.split(/\s+/)[1]) || 20;
    if (sides < 2 || sides > 100) return message.reply("⚠️ Dado entre 2 y 100 caras.");
    const r = Math.floor(Math.random() * sides) + 1;
    const emoji = r === sides ? "🌟" : r === 1 ? "💀" : "🎲";
    const extra = r === sides ? " **¡CRÍTICO!**" : r === 1 ? " **¡PIFIA!**" : "";
    return message.reply(`${emoji} **${message.author.username}** tiró d${sides}: **${r}**${extra}`);
  }

  if (lower === "!clases") {
    let msg = "📖 **Clases D&D 5e disponibles:**

";
    for (const [n, d] of Object.entries(CLASES)) msg += `**${n}** — ${d.descripcion}
⚡ ${d.habilidad}

`;
    return message.reply(msg);
  }

  if (lower === "!ayuda" || lower === "!help") {
    return message.reply(`📜 **Comandos principales**
━━━━━━━━━━━━━━━━━━
⚔️ !inicio — Abre una sala (solo anfitrión)
🙋 !unirse — Crear o cargar personaje
▶️ !empezar — Iniciar aventura (solo anfitrión)
👹 !minijefe — Invocar minijefe (solo anfitrión)

🎲 **Comandos de juego**
━━━━━━━━━━━━━━━━━━
🎲 !tirar / !tirar 8 — Tirar dados
📋 !resumen — Estado del grupo
🧾 !perfil — Tu ficha personal
🎒 !inventario — Ver objetos y oro
💰 !oro — Ver tu oro
⚡ !habilidad — Usar habilidad de clase
🧪 !usar <objeto> — Usar un objeto
😴 !descanso — Descanso largo

ℹ️ **Comandos útiles**
━━━━━━━━━━━━━━━━━━
📖 !clases — Ver clases disponibles
🔄 !reiniciar — Reiniciar sesión (anfitrión)
❓ !ayuda — Ver este mensaje`);
  }

  if (lower === "!perfil") {
    const nombre = getPlayerNameByDiscordId(session, userId);
    if (!nombre) return message.reply("⚠️ No tienes personaje en esta partida.");
    const data = session.players[nombre];
    const stats = CLASES[data.clase].stats;
    const xpNext = xpParaSiguienteNivel(data.nivel) || "MAX";
    const items = data.inventario?.length ? data.inventario.join(", ") : "Vacío";
    const usosMax = CLASES[data.clase].habilidadUsos;
    const usosRestantes = Math.max(0, usosMax - (data.habilidadUsada || 0));
    return message.reply(`🧾 **Ficha de personaje**
━━━━━━━━━━━━━━━━━━
👤 ${nombre}
Clase: ${data.clase}
Nivel: ${data.nivel}

❤️ HP: ${data.hp}/${data.hpMax}
✨ XP: ${data.xp}/${xpNext}
💰 Oro: ${data.oro || 0}

🎒 Inventario: ${items}

⚔️ **Estadísticas**
FUE ${getModStr(stats.fue)} | DES ${getModStr(stats.des)} | CON ${getModStr(stats.con)}
INT ${getModStr(stats.int)} | SAB ${getModStr(stats.sab)} | CAR ${getModStr(stats.car)}

Habilidad: ${CLASES[data.clase].habilidadNombre}
Usos restantes: ${usosRestantes}/${usosMax}
Estado especial: ${data.enRabia ? "Rabia activa" : "Ninguno"}`);
  }

  if (lower === "!resumen") {
    if (Object.keys(session.players).length === 0) return message.reply("⚠️ No hay aventura activa.");
    let r = `📋 **Estado del grupo**
━━━━━━━━━━━━━━━━━━
🗺️ Aventura: ${session.adventureType || "Partida en curso"}

`;
    for (const [name, data] of Object.entries(session.players)) {
      const pct = Math.round((data.hp / data.hpMax) * 100);
      const estado = pct <= 0 ? "💀 Caído" : pct < 30 ? "🩸 Crítico" : pct < 60 ? "⚠️ Herido" : "✅ Normal";
      const s = CLASES[data.clase].stats;
      const xpNext = xpParaSiguienteNivel(data.nivel) || "MAX";
      r += `👤 **${name}** — ${data.clase} Nv${data.nivel}
`;
      r += `❤️ HP: ${data.hp}/${data.hpMax} | 💰 Oro: ${data.oro || 0} | ✨ XP: ${data.xp}/${xpNext}
`;
      r += `⚔️ FUE ${getModStr(s.fue)} DES ${getModStr(s.des)} CON ${getModStr(s.con)}
`;
      r += `Estado: ${estado}

`;
    }
    if (session.minijefe && !session.minijefeDerrotado) {
      r += `👹 **Minijefe:** ${session.minijefe.nombre}
❤️ HP: ${session.minijefe.hpActual}/${session.minijefe.hp} | 🛡️ CA: ${session.minijefe.ca}
`;
    }
    return message.reply(r);
  }

  if (lower === "!unirse") {
    if (session.fase === "aventura_activa") return message.reply("⚠️ La aventura ya comenzó.");
    if (session.fase === "esperando") return message.reply("⚠️ No hay sala abierta. Alguien debe escribir `!inicio`.");
    if (session.userMap[userId]) return message.reply(`⚠️ Ya tienes personaje: **${session.userMap[userId]}**. Usa \`!resumen\`.`);
    session.joinQueue[userId] = { step: "nombre", tempName: null };
    return message.reply(`🎲 **¡Bienvenido a D&D 5e!**

¿Cuál será el nombre de tu personaje?`);
  }

  if (lower === "!inicio") {
    if (session.fase === "aventura_activa") return message.reply("⚠️ Ya hay una aventura activa. Usa `!reiniciar` primero.");
    sessions.delete(message.guild.id);
    const ns = getSession(message.guild.id);
    ns.fase = "unirse";
    ns.hostId = userId;
    ns.guildId = message.guild.id;
    return message.reply(`⚔️ **¡Sala de D&D 5e abierta por ${message.author.username}!**

🧙 Soy vuestro Dungeon Master.
**Cada jugador escribe \`!unirse\` para crear o cargar su personaje.**
Cuando todos estén listos, ${message.author.username} escribe \`!empezar\`.`);
  }

  if (lower === "!empezar") {
    if (session.hostId !== userId) return message.reply("⚠️ Solo el anfitrión puede iniciar.");
    if (session.fase !== "unirse") return message.reply("⚠️ Primero abre una sala con `!inicio`.");
    if (Object.keys(session.players).length === 0) return message.reply("⚠️ Ningún jugador se ha unido aún.");
    session.fase = "eligiendo_aventura";
    const jugadores = Object.entries(session.players).map(([n, d]) => `**${n}** (${d.clase} Nv${d.nivel})`).join(", ");
    return message.reply(`🗺️ **Jugadores:** ${jugadores}

¿Qué aventura queréis vivir?

1️⃣ **Mazmorra misteriosa**
2️⃣ **Bosque encantado**
3️⃣ **Ciudad corrupta**
4️⃣ **Viaje en barco**

Escribe el número.`);
  }

  if (session.fase === "eligiendo_aventura") {
    if (session.hostId !== userId) return;
    const aventura = TIPOS_AVENTURA[content];
    if (!aventura) return message.reply("⚠️ Escribe un número del 1 al 4.");
    session.adventureType = aventura;
    session.fase = "aventura_activa";
    session.minijefe = { ...MINIJEFES[aventura], hpActual: MINIJEFES[aventura].hp };
    let lista = "Personajes:
";
    for (const [name, data] of Object.entries(session.players)) lista += `- ${name} (@${data.discordUsername}, ${data.clase} Nv${data.nivel}, ${data.hp} HP, ${data.oro}mo)
`;
    await message.channel.send(`⚔️ **¡La aventura "${aventura}" está a punto de comenzar!** 🎲`);
    try {
      await message.channel.sendTyping();
      const intro = await askDM(message.guild.id, `Inicia la aventura: ${aventura}. ${lista} Preséntate como DM, haz una introducción épica, presenta a cada personaje, explica brevemente las reglas (d20, CD, críticos, oro y XP) y termina con la primera escena y 3-4 opciones. El minijefe final será ${session.minijefe.nombre}: "${session.minijefe.descripcion}". No lo menciones todavía.`, "Sistema");
      await sendLong(message.channel, intro);
    } catch (e) {
      console.error(e);
      message.channel.send("⚠️ Error al iniciar. Intenta de nuevo.");
    }
    return;
  }

  if (lower === "!minijefe") {
    if (session.hostId !== userId) return message.reply("⚠️ Solo el anfitrión puede invocar al minijefe.");
    if (session.fase !== "aventura_activa") return message.reply("⚠️ No hay aventura activa.");
    if (session.minijefeDerrotado) return message.reply("⚠️ El minijefe ya fue derrotado.");
    const mj = session.minijefe;
    await message.channel.send(`💀 **¡APARECE EL MINIJEFE!**

👹 **${mj.nombre}**
${mj.descripcion}
❤️ HP: ${mj.hpActual}/${mj.hp} | 🛡️ CA: ${mj.ca} | ⚔️ Daño: ${mj.dano}`);
    try {
      await message.channel.sendTyping();
      const dmReply = await askDM(message.guild.id, `¡Ha aparecido el minijefe final! Preséntalo dramáticamente. Su nombre es ${mj.nombre}. Descripción: ${mj.descripcion}. Personalidad: ${mj.personalidad}. Recuerda los eventos de la aventura para que el minijefe haga referencia a ellos. Inicia el combate con iniciativa.`, "Sistema");
      await sendLong(message.channel, dmReply);
    } catch (e) {
      console.error(e);
    }
    return;
  }

  if (lower === "!reiniciar" || lower === "!reset") {
    if (session.hostId && session.hostId !== userId) return message.reply("⚠️ Solo el anfitrión puede reiniciar.");
    sessions.delete(message.guild.id);
    return message.reply("🔄 Sesión reiniciada. Los personajes siguen guardados. Escribe `!inicio` para empezar.");
  }

  const esFaseActiva = session.fase === "aventura_activa";

  if (lower === "!oro") {
    const nombre = getPlayerNameByDiscordId(session, userId);
    if (!nombre) return message.reply("⚠️ No tienes personaje activo.");
    const data = session.players[nombre];
    return message.reply(`💰 **${nombre}** tiene **${data.oro || 0} monedas de oro**.`);
  }

  if (lower === "!habilidad") {
    if (!esFaseActiva) return message.reply("⚠️ No hay aventura activa.");
    const nombre = getPlayerNameByDiscordId(session, userId);
    if (!nombre) return message.reply("⚠️ No tienes personaje. Únete con `!unirse`.");
    const data = session.players[nombre];
    const claseInfo = CLASES[data.clase];
    const usosMax = claseInfo.habilidadUsos;
    if ((data.habilidadUsada || 0) >= usosMax) return message.reply(`⚠️ Sin usos de **${claseInfo.habilidadNombre}**. Usa \`!descanso\`.`);
    data.habilidadUsada = (data.habilidadUsada || 0) + 1;
    const resultado = claseInfo.usarHabilidad(data);
    await guardarPersonaje(message.guild.id, nombre, data);
    await message.reply(`${resultado}
Usos restantes: ${usosMax - data.habilidadUsada}/${usosMax}`);
    try {
      await message.channel.sendTyping();
      const dmReply = await askDM(message.guild.id, `${nombre} usó ${claseInfo.habilidadNombre}. Narra el efecto dramáticamente en la escena.`, nombre);
      await sendLong(message.channel, dmReply);
    } catch (e) { console.error(e); }
    return;
  }

  if (lower.startsWith("!usar")) {
    if (!esFaseActiva) return message.reply("⚠️ No hay aventura activa.");
    const nombre = getPlayerNameByDiscordId(session, userId);
    if (!nombre) return message.reply("⚠️ No tienes personaje.");
    const data = session.players[nombre];
    const objetoBuscado = content.slice(6).trim().toLowerCase();
    const item = data.inventario?.find(i => i.toLowerCase().includes(objetoBuscado));
    if (!item) return message.reply(`⚠️ No tienes **${objetoBuscado}**. Usa \`!inventario\`.`);
    if (item.toLowerCase().includes("poción") || item.toLowerCase().includes("pocion")) {
      const curado = Math.floor(Math.random() * 4) + 1 + Math.floor(Math.random() * 4) + 1 + 2;
      const anterior = data.hp;
      data.hp = Math.min(data.hpMax, data.hp + curado);
      data.inventario = data.inventario.filter(i => i !== item);
      await guardarPersonaje(message.guild.id, nombre, data);
      return message.reply(`🧪 **${nombre}** usa **${item}**. Recupera **${data.hp - anterior} HP** (${data.hp}/${data.hpMax}).`);
    }
    await message.reply(`🧪 **${nombre}** usa **${item}**. El DM narrará el efecto.`);
    try {
      await message.channel.sendTyping();
      const dmReply = await askDM(message.guild.id, `${nombre} usó ${item}. Narra el efecto.`, nombre);
      await sendLong(message.channel, dmReply);
    } catch (e) { console.error(e); }
    return;
  }

  if (lower === "!descanso") {
    if (!esFaseActiva) return message.reply("⚠️ No hay aventura activa.");
    let msg = "😴 **Descanso largo** — todos recuperan HP y habilidades.

";
    for (const [name, data] of Object.entries(session.players)) {
      data.hp = data.hpMax;
      data.habilidadUsada = 0;
      data.enRabia = false;
      await guardarPersonaje(message.guild.id, name, data);
      msg += `✅ ${name}: HP ${data.hpMax}/${data.hpMax}, habilidades recargadas.
`;
    }
    await message.reply(msg);
    try {
      await message.channel.sendTyping();
      const dmReply = await askDM(message.guild.id, "El grupo descansa una noche completa. Narra el descanso y añade algo interesante que ocurre mientras duermen.", "Sistema");
      await sendLong(message.channel, dmReply);
    } catch (e) { console.error(e); }
    return;
  }

  if (lower === "!resumen") {
    if (Object.keys(session.players).length === 0) return message.reply("⚠️ No hay aventura activa.");
    let r = `📋 **Estado del grupo**
━━━━━━━━━━━━━━━━━━
🗺️ Aventura: ${session.adventureType || "Partida en curso"}

`;
    for (const [name, data] of Object.entries(session.players)) {
      const pct = Math.round((data.hp / data.hpMax) * 100);
      const estado = pct <= 0 ? "💀 Caído" : pct < 30 ? "🩸 Crítico" : pct < 60 ? "⚠️ Herido" : "✅ Normal";
      const s = CLASES[data.clase].stats;
      const xpNext = xpParaSiguienteNivel(data.nivel) || "MAX";
      r += `👤 **${name}** — ${data.clase} Nv${data.nivel}
`;
      r += `❤️ HP: ${data.hp}/${data.hpMax} | 💰 Oro: ${data.oro || 0} | ✨ XP: ${data.xp}/${xpNext}
`;
      r += `⚔️ FUE ${getModStr(s.fue)} DES ${getModStr(s.des)} CON ${getModStr(s.con)}
`;
      r += `Estado: ${estado}

`;
    }
    if (session.minijefe && !session.minijefeDerrotado) {
      r += `👹 **Minijefe:** ${session.minijefe.nombre}
❤️ HP: ${session.minijefe.hpActual}/${session.minijefe.hp} | 🛡️ CA: ${session.minijefe.ca}
`;
    }
    return message.reply(r);
  }

  if (lower === "!inventario") {
    if (Object.keys(session.players).length === 0) return message.reply("⚠️ No hay aventura activa.");
    let msg = "🎒 **Inventarios**
━━━━━━━━━━━━━━━━━━

";
    for (const [name, data] of Object.entries(session.players)) {
      const items = data.inventario?.length ? data.inventario.join(", ") : "Vacío";
      const usos = CLASES[data.clase].habilidadUsos;
      const usosRestantes = usos - (data.habilidadUsada || 0);
      msg += `👤 **${name}** (@${data.discordUsername})
`;
      msg += `💰 Oro: ${data.oro || 0}
`;
      msg += `🎒 ${items}
`;
      msg += `⚡ ${CLASES[data.clase].habilidadNombre}: ${usosRestantes}/${usos} usos

`;
    }
    return message.reply(msg);
  }

  if (esFaseActiva) {
    const nombre = getPlayerNameByDiscordId(session, userId);
    if (!nombre) return message.reply("⚠️ No tienes personaje en esta partida. Únete en la próxima con `!unirse`.");
    try {
      await message.channel.sendTyping();
      const reply = await askDM(message.guild.id, content, nombre);
      await sendLong(message.channel, reply);
    } catch (e) {
      console.error(e);
      message.reply("⚠️ El oráculo se ha oscurecido... Algo salió mal. Intenta de nuevo.");
    }
  }
});

client.login(DISCORD_TOKEN);
