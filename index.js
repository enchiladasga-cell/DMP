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
  .then(() => console.log("âœ… MongoDB conectado"))
  .catch(err => console.error("âŒ Error MongoDB:", err));

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
  5: { xpNecesario: 2100, bonusHP: 20, descripcion: "HÃ©roe legendario" },
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
      return `ðŸ’¨ **Segundo Aire** activado. Recuperas **${player.hp - anterior} HP** (${player.hp}/${player.hpMax}).`;
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
      return `ðŸ”® **Conjuro Arcano** lanzado. Generas **${dano} de daÃ±o mÃ¡gico**. El DM narrarÃ¡ el resultado.`;
    }
  },
  PÃ­caro: {
    dadoGolpe: 8,
    stats: { fue: 10, des: 16, con: 12, int: 12, sab: 10, car: 14 },
    descripcion: "Ãgil y sigiloso. Dado de golpe: d8.",
    habilidad: "Ataque furtivo (daÃ±o extra desde las sombras)",
    habilidadNombre: "Ataque Furtivo",
    habilidadUsos: 1,
    usarHabilidad: (player) => {
      const dano = Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1 + getMod(CLASES[player.clase].stats.des);
      return `ðŸ—¡ï¸ **Ataque Furtivo** desde las sombras. Infliges **${dano} de daÃ±o extra**. El DM narrarÃ¡ si conecta.`;
    }
  },
  ClÃ©rigo: {
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
      return `âœ¨ **Curar Heridas** lanzado. Recuperas **${player.hp - anterior} HP** (${player.hp}/${player.hpMax}).`;
    }
  },
  BÃ¡rbaro: {
    dadoGolpe: 12,
    stats: { fue: 17, des: 13, con: 16, int: 8, sab: 10, car: 8 },
    descripcion: "Guerrero salvaje con furia imparable. Dado de golpe: d12.",
    habilidad: "Rabia (ventaja en ataques de FUE, resistencia al daÃ±o)",
    habilidadNombre: "Rabia",
    habilidadUsos: 2,
    usarHabilidad: (player) => {
      player.enRabia = true;
      return `ðŸ˜¡ **Â¡RABIA ACTIVADA!**
âš”ï¸ Ventaja en ataques de FUE
ðŸ›¡ï¸ Resistencia al daÃ±o fÃ­sico`;
    }
  },
  Bardo: {
    dadoGolpe: 8,
    stats: { fue: 8, des: 14, con: 12, int: 12, sab: 10, car: 16 },
    descripcion: "MÃºsico mÃ¡gico y muy versÃ¡til. Dado de golpe: d8.",
    habilidad: "InspiraciÃ³n bÃ¡rdica (da ventaja a un aliado)",
    habilidadNombre: "InspiraciÃ³n BÃ¡rdica",
    habilidadUsos: 3,
    usarHabilidad: (player) => {
      return `ðŸŽµ **InspiraciÃ³n BÃ¡rdica** â€” Un aliado tira **2d20 y toma el mayor** en su prÃ³xima acciÃ³n.`;
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
  "Mazmorra misteriosa": { nombre: "Krath el No-Muerto", descripcion: "Un guerrero esquelÃ©tico con armadura oxidada y ojos llameantes.", personalidad: "MelancÃ³lico", hp: 45, ca: 14, dano: "1d10+4", xp: 500, oro: 50 },
  "Bosque encantado": { nombre: "Sylvara la Corrompida", descripcion: "Una drÃ­ade con raÃ­ces negras que le atraviesan el cuerpo.", personalidad: "Sufre al combatir", hp: 38, ca: 13, dano: "1d8+3", xp: 500, oro: 40 },
  "Ciudad corrupta": { nombre: "El Comisario Vrell", descripcion: "Un oficial corrupto con capa negra y daga envenenada.", personalidad: "Arrogante", hp: 40, ca: 15, dano: "1d6+3", xp: 500, oro: 80 },
  "Viaje en barco": { nombre: "CapitÃ¡n Mara Huesos", descripcion: "Una pirata no-muerta con garfio de plata y loro esquelÃ©tico.", personalidad: "Jovial y brutal", hp: 42, ca: 14, dano: "1d8+4", xp: 500, oro: 100 },
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

const SYSTEM_PROMPT = `Eres un Dungeon Master experto en D&D 5e, adaptado para PRINCIPIANTES ABSOLUTOS. Narras aventuras en espaÃ±ol usando las reglas oficiales de D&D 5e simplificadas.
REGLAS D&D 5e:
- Todas las acciones importantes requieren un d20.
- Se suman modificadores de estadÃ­stica y bonificador de competencia.
- Natural 20 = Ã©xito crÃ­tico. Natural 1 = pifia crÃ­tica.
- Explica siempre quÃ© dado tirar y quÃ© modificador sumar.
- Ofrece 3-4 opciones al final de cada escena.
- Usa emojis.
- Cuando el HP cambie usa [HP:Nombre:XX].
- Cuando otorgues oro usa [ORO:Nombre:cantidad].
- Cuando otorgues objetos usa [ITEM:Nombre:objeto].
- Cuando otorgues XP usa [XP:Nombre:cantidad].
- MÃ¡ximo 5 pÃ¡rrafos por respuesta.`;

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
          cleanReply += `ðŸŽ‰ **${name}** subiÃ³ al **NIVEL ${nivel}**! ${NIVELES[nivel].descripcion}
`;
          cleanReply += `â¤ï¸ HP mÃ¡ximo aumentado. HP totalmente recuperado!
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
      return message.reply(`EncontrÃ© tu personaje guardado: **${personajeGuardado.nombre}** (${personajeGuardado.clase}, Nv${personajeGuardado.nivel}, HP ${personajeGuardado.hp}/${personajeGuardado.hpMax}, XP ${personajeGuardado.xp}, Oro ${personajeGuardado.oro || 0}mo).

Â¿Quieres continuar con este personaje?
1) SÃ­
2) No, crear uno nuevo`);
    }
    q.tempName = content;
    q.step = "clase";
    return message.reply(`Hola **${content}**. Elige tu clase:
1) Guerrero â€” Maestro del combate
2) Mago â€” Conjuros devastadores
3) PÃ­caro â€” Sigilo y ataques furtivos
4) ClÃ©rigo â€” SanaciÃ³n y magia divina
5) BÃ¡rbaro â€” Furia salvaje
6) Bardo â€” Magia versÃ¡til

Escribe el nÃºmero o el nombre.`);
  }

  if (q.step === "confirmar_personaje") {
    if (content === "1" || lower === "si" || lower === "sÃ­" || lower === "s") {
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
      return message.reply(`âœ… **${pg.nombre}** (${pg.clase} Nv${pg.nivel}) listo. Espera a que el anfitriÃ³n escriba **!empezar**.`);
    }
    q.step = "clase";
    return message.reply(`Perfecto. Â¿QuÃ© clase quieres?
1) Guerrero
2) Mago
3) PÃ­caro
4) ClÃ©rigo
5) BÃ¡rbaro
6) Bardo`);
  }

  if (q.step === "clase") {
    const claseMap = {
      "1": "Guerrero", guerrero: "Guerrero",
      "2": "Mago", mago: "Mago",
      "3": "PÃ­caro", picaro: "PÃ­caro", pÃ­caro: "PÃ­caro",
      "4": "ClÃ©rigo", clerigo: "ClÃ©rigo", clÃ©rigo: "ClÃ©rigo",
      "5": "BÃ¡rbaro", barbaro: "BÃ¡rbaro", bÃ¡rbaro: "BÃ¡rbaro",
      "6": "Bardo", bardo: "Bardo",
    };
    const clase = claseMap[lower];
    if (!clase) return message.reply("Clase no reconocida. Escribe el nÃºmero 1-6 o el nombre.");
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
    return message.reply(`ðŸ‘¤ **${nombre}** ${message.author.username}
${clase} Nv1 HP ${hpMax}/${hpMax} Competencia 2 Oro 0mo
FUE${getModStr(s.fue)} DES${getModStr(s.des)} CON${getModStr(s.con)} INT${getModStr(s.int)} SAB${getModStr(s.sab)} CAR${getModStr(s.car)}
${CLASES[clase].habilidad}

âœ… Listo. Espera a que el anfitriÃ³n escriba **!empezar**.`);
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
    if (sides < 2 || sides > 100) return message.reply("âš ï¸ Dado entre 2 y 100 caras.");
    const r = Math.floor(Math.random() * sides) + 1;
    const emoji = r === sides ? "ðŸŒŸ" : r === 1 ? "ðŸ’€" : "ðŸŽ²";
    const extra = r === sides ? " **Â¡CRÃTICO!**" : r === 1 ? " **Â¡PIFIA!**" : "";
    return message.reply(`${emoji} **${message.author.username}** tirÃ³ d${sides}: **${r}**${extra}`);
  }

  if (lower === "!clases") {
    let msg = "ðŸ“– **Clases D&D 5e disponibles:**

";
    for (const [n, d] of Object.entries(CLASES)) msg += `**${n}** â€” ${d.descripcion}
âš¡ ${d.habilidad}

`;
    return message.reply(msg);
  }

  if (lower === "!ayuda" || lower === "!help") {
    return message.reply(`ðŸ“œ **Comandos principales**
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
âš”ï¸ !inicio â€” Abre una sala (solo anfitriÃ³n)
ðŸ™‹ !unirse â€” Crear o cargar personaje
â–¶ï¸ !empezar â€” Iniciar aventura (solo anfitriÃ³n)
ðŸ‘¹ !minijefe â€” Invocar minijefe (solo anfitriÃ³n)

ðŸŽ² **Comandos de juego**
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
ðŸŽ² !tirar / !tirar 8 â€” Tirar dados
ðŸ“‹ !resumen â€” Estado del grupo
ðŸ§¾ !perfil â€” Tu ficha personal
ðŸŽ’ !inventario â€” Ver objetos y oro
ðŸ’° !oro â€” Ver tu oro
âš¡ !habilidad â€” Usar habilidad de clase
ðŸ§ª !usar <objeto> â€” Usar un objeto
ðŸ˜´ !descanso â€” Descanso largo

â„¹ï¸ **Comandos Ãºtiles**
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
ðŸ“– !clases â€” Ver clases disponibles
ðŸ”„ !reiniciar â€” Reiniciar sesiÃ³n (anfitriÃ³n)
â“ !ayuda â€” Ver este mensaje`);
  }

  if (lower === "!perfil") {
    const nombre = getPlayerNameByDiscordId(session, userId);
    if (!nombre) return message.reply("âš ï¸ No tienes personaje en esta partida.");
    const data = session.players[nombre];
    const stats = CLASES[data.clase].stats;
    const xpNext = xpParaSiguienteNivel(data.nivel) || "MAX";
    const items = data.inventario?.length ? data.inventario.join(", ") : "VacÃ­o";
    const usosMax = CLASES[data.clase].habilidadUsos;
    const usosRestantes = Math.max(0, usosMax - (data.habilidadUsada || 0));
    return message.reply(`ðŸ§¾ **Ficha de personaje**
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
ðŸ‘¤ ${nombre}
Clase: ${data.clase}
Nivel: ${data.nivel}

â¤ï¸ HP: ${data.hp}/${data.hpMax}
âœ¨ XP: ${data.xp}/${xpNext}
ðŸ’° Oro: ${data.oro || 0}

ðŸŽ’ Inventario: ${items}

âš”ï¸ **EstadÃ­sticas**
FUE ${getModStr(stats.fue)} | DES ${getModStr(stats.des)} | CON ${getModStr(stats.con)}
INT ${getModStr(stats.int)} | SAB ${getModStr(stats.sab)} | CAR ${getModStr(stats.car)}

Habilidad: ${CLASES[data.clase].habilidadNombre}
Usos restantes: ${usosRestantes}/${usosMax}
Estado especial: ${data.enRabia ? "Rabia activa" : "Ninguno"}`);
  }

  if (lower === "!resumen") {
    if (Object.keys(session.players).length === 0) return message.reply("âš ï¸ No hay aventura activa.");
    let r = `ðŸ“‹ **Estado del grupo**
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
ðŸ—ºï¸ Aventura: ${session.adventureType || "Partida en curso"}

`;
    for (const [name, data] of Object.entries(session.players)) {
      const pct = Math.round((data.hp / data.hpMax) * 100);
      const estado = pct <= 0 ? "ðŸ’€ CaÃ­do" : pct < 30 ? "ðŸ©¸ CrÃ­tico" : pct < 60 ? "âš ï¸ Herido" : "âœ… Normal";
      const s = CLASES[data.clase].stats;
      const xpNext = xpParaSiguienteNivel(data.nivel) || "MAX";
      r += `ðŸ‘¤ **${name}** â€” ${data.clase} Nv${data.nivel}
`;
      r += `â¤ï¸ HP: ${data.hp}/${data.hpMax} | ðŸ’° Oro: ${data.oro || 0} | âœ¨ XP: ${data.xp}/${xpNext}
`;
      r += `âš”ï¸ FUE ${getModStr(s.fue)} DES ${getModStr(s.des)} CON ${getModStr(s.con)}
`;
      r += `Estado: ${estado}

`;
    }
    if (session.minijefe && !session.minijefeDerrotado) {
      r += `ðŸ‘¹ **Minijefe:** ${session.minijefe.nombre}
â¤ï¸ HP: ${session.minijefe.hpActual}/${session.minijefe.hp} | ðŸ›¡ï¸ CA: ${session.minijefe.ca}
`;
    }
    return message.reply(r);
  }

  if (lower === "!unirse") {
    if (session.fase === "aventura_activa") return message.reply("âš ï¸ La aventura ya comenzÃ³.");
    if (session.fase === "esperando") return message.reply("âš ï¸ No hay sala abierta. Alguien debe escribir `!inicio`.");
    if (session.userMap[userId]) return message.reply(`âš ï¸ Ya tienes personaje: **${session.userMap[userId]}**. Usa \`!resumen\`.`);
    session.joinQueue[userId] = { step: "nombre", tempName: null };
    return message.reply(`ðŸŽ² **Â¡Bienvenido a D&D 5e!**

Â¿CuÃ¡l serÃ¡ el nombre de tu personaje?`);
  }

  if (lower === "!inicio") {
    if (session.fase === "aventura_activa") return message.reply("âš ï¸ Ya hay una aventura activa. Usa `!reiniciar` primero.");
    sessions.delete(message.guild.id);
    const ns = getSession(message.guild.id);
    ns.fase = "unirse";
    ns.hostId = userId;
    ns.guildId = message.guild.id;
    return message.reply(`âš”ï¸ **Â¡Sala de D&D 5e abierta por ${message.author.username}!**

ðŸ§™ Soy vuestro Dungeon Master.
**Cada jugador escribe \`!unirse\` para crear o cargar su personaje.**
Cuando todos estÃ©n listos, ${message.author.username} escribe \`!empezar\`.`);
  }

  if (lower === "!empezar") {
    if (session.hostId !== userId) return message.reply("âš ï¸ Solo el anfitriÃ³n puede iniciar.");
    if (session.fase !== "unirse") return message.reply("âš ï¸ Primero abre una sala con `!inicio`.");
    if (Object.keys(session.players).length === 0) return message.reply("âš ï¸ NingÃºn jugador se ha unido aÃºn.");
    session.fase = "eligiendo_aventura";
    const jugadores = Object.entries(session.players).map(([n, d]) => `**${n}** (${d.clase} Nv${d.nivel})`).join(", ");
    return message.reply(`ðŸ—ºï¸ **Jugadores:** ${jugadores}

Â¿QuÃ© aventura querÃ©is vivir?

1ï¸âƒ£ **Mazmorra misteriosa**
2ï¸âƒ£ **Bosque encantado**
3ï¸âƒ£ **Ciudad corrupta**
4ï¸âƒ£ **Viaje en barco**

Escribe el nÃºmero.`);
  }

  if (session.fase === "eligiendo_aventura") {
    if (session.hostId !== userId) return;
    const aventura = TIPOS_AVENTURA[content];
    if (!aventura) return message.reply("âš ï¸ Escribe un nÃºmero del 1 al 4.");
    session.adventureType = aventura;
    session.fase = "aventura_activa";
    session.minijefe = { ...MINIJEFES[aventura], hpActual: MINIJEFES[aventura].hp };
    let lista = "Personajes:
";
    for (const [name, data] of Object.entries(session.players)) lista += `- ${name} (@${data.discordUsername}, ${data.clase} Nv${data.nivel}, ${data.hp} HP, ${data.oro}mo)
`;
    await message.channel.send(`âš”ï¸ **Â¡La aventura "${aventura}" estÃ¡ a punto de comenzar!** ðŸŽ²`);
    try {
      await message.channel.sendTyping();
      const intro = await askDM(message.guild.id, `Inicia la aventura: ${aventura}. ${lista} PresÃ©ntate como DM, haz una introducciÃ³n Ã©pica, presenta a cada personaje, explica brevemente las reglas (d20, CD, crÃ­ticos, oro y XP) y termina con la primera escena y 3-4 opciones. El minijefe final serÃ¡ ${session.minijefe.nombre}: "${session.minijefe.descripcion}". No lo menciones todavÃ­a.`, "Sistema");
      await sendLong(message.channel, intro);
    } catch (e) {
      console.error(e);
      message.channel.send("âš ï¸ Error al iniciar. Intenta de nuevo.");
    }
    return;
  }

  if (lower === "!minijefe") {
    if (session.hostId !== userId) return message.reply("âš ï¸ Solo el anfitriÃ³n puede invocar al minijefe.");
    if (session.fase !== "aventura_activa") return message.reply("âš ï¸ No hay aventura activa.");
    if (session.minijefeDerrotado) return message.reply("âš ï¸ El minijefe ya fue derrotado.");
    const mj = session.minijefe;
    await message.channel.send(`ðŸ’€ **Â¡APARECE EL MINIJEFE!**

ðŸ‘¹ **${mj.nombre}**
${mj.descripcion}
â¤ï¸ HP: ${mj.hpActual}/${mj.hp} | ðŸ›¡ï¸ CA: ${mj.ca} | âš”ï¸ DaÃ±o: ${mj.dano}`);
    try {
      await message.channel.sendTyping();
      const dmReply = await askDM(message.guild.id, `Â¡Ha aparecido el minijefe final! PresÃ©ntalo dramÃ¡ticamente. Su nombre es ${mj.nombre}. DescripciÃ³n: ${mj.descripcion}. Personalidad: ${mj.personalidad}. Recuerda los eventos de la aventura para que el minijefe haga referencia a ellos. Inicia el combate con iniciativa.`, "Sistema");
      await sendLong(message.channel, dmReply);
    } catch (e) {
      console.error(e);
    }
    return;
  }

  if (lower === "!reiniciar" || lower === "!reset") {
    if (session.hostId && session.hostId !== userId) return message.reply("âš ï¸ Solo el anfitriÃ³n puede reiniciar.");
    sessions.delete(message.guild.id);
    return message.reply("ðŸ”„ SesiÃ³n reiniciada. Los personajes siguen guardados. Escribe `!inicio` para empezar.");
  }

  const esFaseActiva = session.fase === "aventura_activa";

  if (lower === "!oro") {
    const nombre = getPlayerNameByDiscordId(session, userId);
    if (!nombre) return message.reply("âš ï¸ No tienes personaje activo.");
    const data = session.players[nombre];
    return message.reply(`ðŸ’° **${nombre}** tiene **${data.oro || 0} monedas de oro**.`);
  }

  if (lower === "!habilidad") {
    if (!esFaseActiva) return message.reply("âš ï¸ No hay aventura activa.");
    const nombre = getPlayerNameByDiscordId(session, userId);
    if (!nombre) return message.reply("âš ï¸ No tienes personaje. Ãšnete con `!unirse`.");
    const data = session.players[nombre];
    const claseInfo = CLASES[data.clase];
    const usosMax = claseInfo.habilidadUsos;
    if ((data.habilidadUsada || 0) >= usosMax) return message.reply(`âš ï¸ Sin usos de **${claseInfo.habilidadNombre}**. Usa \`!descanso\`.`);
    data.habilidadUsada = (data.habilidadUsada || 0) + 1;
    const resultado = claseInfo.usarHabilidad(data);
    await guardarPersonaje(message.guild.id, nombre, data);
    await message.reply(`${resultado}
Usos restantes: ${usosMax - data.habilidadUsada}/${usosMax}`);
    try {
      await message.channel.sendTyping();
      const dmReply = await askDM(message.guild.id, `${nombre} usÃ³ ${claseInfo.habilidadNombre}. Narra el efecto dramÃ¡ticamente en la escena.`, nombre);
      await sendLong(message.channel, dmReply);
    } catch (e) { console.error(e); }
    return;
  }

  if (lower.startsWith("!usar")) {
    if (!esFaseActiva) return message.reply("âš ï¸ No hay aventura activa.");
    const nombre = getPlayerNameByDiscordId(session, userId);
    if (!nombre) return message.reply("âš ï¸ No tienes personaje.");
    const data = session.players[nombre];
    const objetoBuscado = content.slice(6).trim().toLowerCase();
    const item = data.inventario?.find(i => i.toLowerCase().includes(objetoBuscado));
    if (!item) return message.reply(`âš ï¸ No tienes **${objetoBuscado}**. Usa \`!inventario\`.`);
    if (item.toLowerCase().includes("pociÃ³n") || item.toLowerCase().includes("pocion")) {
      const curado = Math.floor(Math.random() * 4) + 1 + Math.floor(Math.random() * 4) + 1 + 2;
      const anterior = data.hp;
      data.hp = Math.min(data.hpMax, data.hp + curado);
      data.inventario = data.inventario.filter(i => i !== item);
      await guardarPersonaje(message.guild.id, nombre, data);
      return message.reply(`ðŸ§ª **${nombre}** usa **${item}**. Recupera **${data.hp - anterior} HP** (${data.hp}/${data.hpMax}).`);
    }
    await message.reply(`ðŸ§ª **${nombre}** usa **${item}**. El DM narrarÃ¡ el efecto.`);
    try {
      await message.channel.sendTyping();
      const dmReply = await askDM(message.guild.id, `${nombre} usÃ³ ${item}. Narra el efecto.`, nombre);
      await sendLong(message.channel, dmReply);
    } catch (e) { console.error(e); }
    return;
  }

  if (lower === "!descanso") {
    if (!esFaseActiva) return message.reply("âš ï¸ No hay aventura activa.");
    let msg = "ðŸ˜´ **Descanso largo** â€” todos recuperan HP y habilidades.

";
    for (const [name, data] of Object.entries(session.players)) {
      data.hp = data.hpMax;
      data.habilidadUsada = 0;
      data.enRabia = false;
      await guardarPersonaje(message.guild.id, name, data);
      msg += `âœ… ${name}: HP ${data.hpMax}/${data.hpMax}, habilidades recargadas.
`;
    }
    await message.reply(msg);
    try {
      await message.channel.sendTyping();
      const dmReply = await askDM(message.guild.id, "El grupo descansa una noche completa. Narra el descanso y aÃ±ade algo interesante que ocurre mientras duermen.", "Sistema");
      await sendLong(message.channel, dmReply);
    } catch (e) { console.error(e); }
    return;
  }

  if (lower === "!resumen") {
    if (Object.keys(session.players).length === 0) return message.reply("âš ï¸ No hay aventura activa.");
    let r = `ðŸ“‹ **Estado del grupo**
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
ðŸ—ºï¸ Aventura: ${session.adventureType || "Partida en curso"}

`;
    for (const [name, data] of Object.entries(session.players)) {
      const pct = Math.round((data.hp / data.hpMax) * 100);
      const estado = pct <= 0 ? "ðŸ’€ CaÃ­do" : pct < 30 ? "ðŸ©¸ CrÃ­tico" : pct < 60 ? "âš ï¸ Herido" : "âœ… Normal";
      const s = CLASES[data.clase].stats;
      const xpNext = xpParaSiguienteNivel(data.nivel) || "MAX";
      r += `ðŸ‘¤ **${name}** â€” ${data.clase} Nv${data.nivel}
`;
      r += `â¤ï¸ HP: ${data.hp}/${data.hpMax} | ðŸ’° Oro: ${data.oro || 0} | âœ¨ XP: ${data.xp}/${xpNext}
`;
      r += `âš”ï¸ FUE ${getModStr(s.fue)} DES ${getModStr(s.des)} CON ${getModStr(s.con)}
`;
      r += `Estado: ${estado}

`;
    }
    if (session.minijefe && !session.minijefeDerrotado) {
      r += `ðŸ‘¹ **Minijefe:** ${session.minijefe.nombre}
â¤ï¸ HP: ${session.minijefe.hpActual}/${session.minijefe.hp} | ðŸ›¡ï¸ CA: ${session.minijefe.ca}
`;
    }
    return message.reply(r);
  }

  if (lower === "!inventario") {
    if (Object.keys(session.players).length === 0) return message.reply("âš ï¸ No hay aventura activa.");
    let msg = "ðŸŽ’ **Inventarios**
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”

";
    for (const [name, data] of Object.entries(session.players)) {
      const items = data.inventario?.length ? data.inventario.join(", ") : "VacÃ­o";
      const usos = CLASES[data.clase].habilidadUsos;
      const usosRestantes = usos - (data.habilidadUsada || 0);
      msg += `ðŸ‘¤ **${name}** (@${data.discordUsername})
`;
      msg += `ðŸ’° Oro: ${data.oro || 0}
`;
      msg += `ðŸŽ’ ${items}
`;
      msg += `âš¡ ${CLASES[data.clase].habilidadNombre}: ${usosRestantes}/${usos} usos

`;
    }
    return message.reply(msg);
  }

  if (esFaseActiva) {
    const nombre = getPlayerNameByDiscordId(session, userId);
    if (!nombre) return message.reply("âš ï¸ No tienes personaje en esta partida. Ãšnete en la prÃ³xima con `!unirse`.");
    try {
      await message.channel.sendTyping();
      const reply = await askDM(message.guild.id, content, nombre);
      await sendLong(message.channel, reply);
    } catch (e) {
      console.error(e);
      message.reply("âš ï¸ El orÃ¡culo se ha oscurecido... Algo saliÃ³ mal. Intenta de nuevo.");
    }
  }
});

client.login(DISCORD_TOKEN);
