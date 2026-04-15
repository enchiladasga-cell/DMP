const {
  Client, GatewayIntentBits,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  EmbedBuilder,
} = require("discord.js");
const Anthropic = require("@anthropic-ai/sdk");
const mongoose = require("mongoose");

const DISCORD_TOKEN  = process.env.DISCORD_TOKEN;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MONGODB_URI    = process.env.MONGODB_URI;
const DM_CHANNEL_NAME = "dungeon-master";

// ============================================================
// MONGODB
// ============================================================
const PersonajeSchema = new mongoose.Schema({
  discordId:   { type: String, required: true },
  discordUsername: { type: String, required: true },
  guildId:     { type: String, required: true },
  nombre:      { type: String, required: true },
  clase:       { type: String, required: true },
  hp:          { type: Number, required: true },
  hpMax:       { type: Number, required: true },
  nivel:       { type: Number, default: 1 },
  xp:          { type: Number, default: 0 },
  oro:         { type: Number, default: 0 },
  inventario:  { type: [String], default: [] },
  itemsLegendarios: { type: [String], default: [] },
  habilidadUsada: { type: Number, default: 0 },
  enRabia:     { type: Boolean, default: false },
  aventurasCompletadas: { type: Number, default: 0 },
  updatedAt:   { type: Date, default: Date.now },
});
PersonajeSchema.index({ discordId: 1, guildId: 1 }, { unique: true });
const Personaje = mongoose.model("Personaje", PersonajeSchema);

mongoose.connect(MONGODB_URI)
  .then(() => console.log("✅ MongoDB conectado"))
  .catch(err => console.error("❌ MongoDB error:", err));

// ============================================================
// DISCORD CLIENT
// ============================================================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
});
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// ============================================================
// NIVELES
// ============================================================
const NIVELES = {
  1: { xpNecesario: 0,    bonusHP: 0,  titulo: "Aventurero novato" },
  2: { xpNecesario: 300,  bonusHP: 5,  titulo: "Aventurero aprendiz" },
  3: { xpNecesario: 600,  bonusHP: 10, titulo: "Aventurero experimentado" },
  4: { xpNecesario: 1200, bonusHP: 15, titulo: "Veterano de batalla" },
  5: { xpNecesario: 2100, bonusHP: 20, titulo: "Héroe legendario" },
};

function xpSiguienteNivel(nivel) { return NIVELES[nivel + 1]?.xpNecesario ?? null; }

function verificarNivel(p) {
  if (p.nivel >= 5) return null;
  const xpNext = NIVELES[p.nivel + 1]?.xpNecesario;
  if (xpNext && p.xp >= xpNext) {
    p.nivel += 1;
    p.hpMax = calcularHPBase(p.clase) + NIVELES[p.nivel].bonusHP;
    p.hp = p.hpMax;
    return p.nivel;
  }
  return null;
}

// ============================================================
// CLASES
// ============================================================
const CLASES = {
  Guerrero: {
    dadoGolpe: 10,
    stats: { fue: 16, des: 12, con: 14, int: 8, sab: 10, car: 10 },
    descripcion: "Experto en combate. Dado de golpe: d10.",
    habilidadNombre: "Segundo Aire",
    habilidadDesc: "Recupera HP en pleno combate.",
    habilidadUsos: 1,
    usarHabilidad: (p) => {
      const rec = Math.floor(Math.random() * 10) + 1 + getMod(CLASES[p.clase].stats.con);
      const ant = p.hp;
      p.hp = Math.min(p.hpMax, p.hp + rec);
      return `💨 **Segundo Aire** — Recuperas **${p.hp - ant} HP** (${p.hp}/${p.hpMax}).`;
    },
  },
  Mago: {
    dadoGolpe: 6,
    stats: { fue: 8, des: 14, con: 10, int: 16, sab: 12, car: 10 },
    descripcion: "Poderoso lanzador de conjuros. Dado de golpe: d6.",
    habilidadNombre: "Conjuro Arcano",
    habilidadDesc: "Lanza un conjuro devastador (2d8+INT).",
    habilidadUsos: 3,
    usarHabilidad: (p) => {
      const d = Math.floor(Math.random()*8)+1 + Math.floor(Math.random()*8)+1 + getMod(CLASES[p.clase].stats.int);
      return `🔮 **Conjuro Arcano** — **${d} de daño mágico**. El DM narra el resultado.`;
    },
  },
  Pícaro: {
    dadoGolpe: 8,
    stats: { fue: 10, des: 16, con: 12, int: 12, sab: 10, car: 14 },
    descripcion: "Ágil y sigiloso. Dado de golpe: d8.",
    habilidadNombre: "Ataque Furtivo",
    habilidadDesc: "Daño extra desde las sombras (2d6+DES).",
    habilidadUsos: 1,
    usarHabilidad: (p) => {
      const d = Math.floor(Math.random()*6)+1 + Math.floor(Math.random()*6)+1 + getMod(CLASES[p.clase].stats.des);
      return `🗡️ **Ataque Furtivo** — **${d} de daño extra**. El DM narra si conecta.`;
    },
  },
  Clérigo: {
    dadoGolpe: 8,
    stats: { fue: 12, des: 10, con: 14, int: 10, sab: 16, car: 12 },
    descripcion: "Sanador con magia divina. Dado de golpe: d8.",
    habilidadNombre: "Curar Heridas",
    habilidadDesc: "Restaura HP a ti o un aliado (d8+SAB).",
    habilidadUsos: 3,
    usarHabilidad: (p) => {
      const c = Math.floor(Math.random()*8)+1 + getMod(CLASES[p.clase].stats.sab);
      const ant = p.hp;
      p.hp = Math.min(p.hpMax, p.hp + c);
      return `✨ **Curar Heridas** — Recuperas **${p.hp - ant} HP** (${p.hp}/${p.hpMax}).`;
    },
  },
  Bárbaro: {
    dadoGolpe: 12,
    stats: { fue: 17, des: 13, con: 16, int: 8, sab: 10, car: 8 },
    descripcion: "Guerrero salvaje con furia imparable. Dado de golpe: d12.",
    habilidadNombre: "Rabia",
    habilidadDesc: "Ventaja en ataques FUE y resistencia al daño físico.",
    habilidadUsos: 2,
    usarHabilidad: (p) => {
      p.enRabia = true;
      return `😡 **¡RABIA ACTIVADA!**\n⚔️ Ventaja en FUE (tira 2d20, toma el mayor)\n🛡️ Resistencia al daño físico`;
    },
  },
  Bardo: {
    dadoGolpe: 8,
    stats: { fue: 8, des: 14, con: 12, int: 12, sab: 10, car: 16 },
    descripcion: "Músico mágico y versátil. Dado de golpe: d8.",
    habilidadNombre: "Inspiración Bárdica",
    habilidadDesc: "Da ventaja a un aliado en su próxima acción.",
    habilidadUsos: 3,
    usarHabilidad: (p) => {
      return `🎵 **Inspiración Bárdica** — Un aliado tira **2d20 y toma el mayor**.\n✨ Bonus: +${getMod(CLASES[p.clase].stats.car)+2}`;
    },
  },
};

const TIPOS_AVENTURA = {
  "1": "Mazmorra misteriosa",
  "2": "Bosque encantado",
  "3": "Ciudad corrupta",
  "4": "Viaje en barco",
};

const MINIJEFES = {
  "Mazmorra misteriosa": { nombre: "Krath el No-Muerto", descripcion: "Guerrero esquelético con armadura oxidada y ojos llameantes.", personalidad: "Melancólico. Habla del pasado. Dice 'Yo también fui como vosotros...'", hp: 45, ca: 14, dano: "1d10+4", xp: 500, oro: 50 },
  "Bosque encantado":    { nombre: "Sylvara la Corrompida", descripcion: "Dríade con raíces negras atravesándola. Llora al atacar.", personalidad: "Sufre al combatir. Pide ayuda. 'Algo oscuro me controla...'", hp: 38, ca: 13, dano: "1d8+3", xp: 500, oro: 40 },
  "Ciudad corrupta":     { nombre: "El Comisario Vrell", descripcion: "Oficial corrupto con capa negra y daga envenenada.", personalidad: "Arrogante. Amenaza con contactos. Ofrece sobornos al perder.", hp: 40, ca: 15, dano: "1d6+3", xp: 500, oro: 80 },
  "Viaje en barco":      { nombre: "Capitán Mara Huesos", descripcion: "Pirata no-muerta con garfio de plata y loro esquelético.", personalidad: "Jovial y brutal. Hace chistes macabros. Ofrece riquezas para unirse.", hp: 42, ca: 14, dano: "1d8+4", xp: 500, oro: 100 },
};

function getMod(s) { return Math.floor((s - 10) / 2); }
function getModStr(s) { const m = getMod(s); return m >= 0 ? `+${m}` : `${m}`; }
function calcularHPBase(clase) { return CLASES[clase].dadoGolpe + getMod(CLASES[clase].stats.con); }

function estadoHP(hp, hpMax) {
  const pct = hp / hpMax;
  if (hp <= 0)     return "💀 Inconsciente";
  if (pct <= 0.30) return "🔴 En peligro";
  if (pct <= 0.60) return "🟡 Herido";
  return "🟢 Normal";
}

// ============================================================
// BOTONES DE DADOS
// ============================================================
function crearBotonesDados() {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("dado_d4").setLabel("d4").setStyle(ButtonStyle.Secondary).setEmoji("🎲"),
    new ButtonBuilder().setCustomId("dado_d6").setLabel("d6").setStyle(ButtonStyle.Secondary).setEmoji("🎲"),
    new ButtonBuilder().setCustomId("dado_d8").setLabel("d8").setStyle(ButtonStyle.Secondary).setEmoji("🎲"),
    new ButtonBuilder().setCustomId("dado_d10").setLabel("d10").setStyle(ButtonStyle.Secondary).setEmoji("🎲"),
    new ButtonBuilder().setCustomId("dado_d12").setLabel("d12").setStyle(ButtonStyle.Secondary).setEmoji("🎲"),
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("dado_d20").setLabel("d20").setStyle(ButtonStyle.Primary).setEmoji("🎲"),
    new ButtonBuilder().setCustomId("dado_d100").setLabel("d100").setStyle(ButtonStyle.Secondary).setEmoji("🎲"),
  );
  return [row1, row2];
}

// ============================================================
// SESSIONS
// ============================================================
const sessions = new Map();

function getSession(guildId) {
  if (!sessions.has(guildId)) {
    sessions.set(guildId, {
      history: [], players: {}, userMap: {},
      fase: "esperando", hostId: null,
      adventureType: null, joinQueue: {},
      minijefe: null, minijefeDerrotado: false,
      guildId,
    });
  }
  return sessions.get(guildId);
}

function getNombreByDiscordId(session, id) { return session.userMap[id] || null; }

async function guardarPersonaje(guildId, nombre, data) {
  try {
    await Personaje.findOneAndUpdate(
      { discordId: data.discordId, guildId },
      { ...data, nombre, guildId, updatedAt: new Date() },
      { upsert: true, new: true }
    );
  } catch (e) { console.error("Error guardando:", e); }
}

async function guardarSesion(session) {
  for (const [nombre, data] of Object.entries(session.players))
    await guardarPersonaje(session.guildId, nombre, data);
}

// ============================================================
// SYSTEM PROMPT
// ============================================================
const SYSTEM_PROMPT = `Eres un Dungeon Master experto en D&D 5ª Edición para PRINCIPIANTES.
Narras aventuras épicas en español. Tono: cinematográfico, divertido y paciente.

=== MECÁNICAS ===
- Tiradas d20 + modificador vs CD (Fácil 10, Medio 15, Difícil 20)
- Natural 20 = éxito épico | Natural 1 = pifia desastrosa
- Competencia: Nv1-2: +2, Nv3-4: +3, Nv5: +4

COMBATE: Iniciativa d20+DES → Ataque d20+mod+competencia vs CA → Daño
CA enemigos: débil 10-12, normal 13-15, fuerte 16+, minijefe 17+

=== ETIQUETAS (al final del mensaje) ===
[HP:Nombre:valor]          → actualiza HP
[ORO:Nombre:cantidad]      → da oro (o [ORO:todos:cantidad])
[XP:Nombre:cantidad]       → da experiencia (o [XP:todos:cantidad])
[ITEM:Nombre:objeto]       → da objeto normal
[LEGENDARIO:Nombre:Nombre del Arma|descripción corta|efecto de juego]
  Ejemplo: [LEGENDARIO:Aiko:Espada del Crepúsculo|Hoja oscura que brilla en la noche|+2 ataque, ignora resistencias]

=== DROPS LEGENDARIOS ===
- Otorga armas/objetos legendarios en momentos épicos: derrotar minijefes, hazañas heroicas, sacrificios
- Deben tener nombre propio, descripción narrativa y efecto de juego concreto
- Son únicos, no se repiten en la misma aventura
- Máximo 1 legendario por sesión

=== ECONOMÍA Y XP ===
- Enemigos sueltan oro según dificultad (5-20mo normales, 50-100mo minijefe)
- XP: combate fácil 50, normal 100, difícil 200, minijefe 500, puzzle 75, misión 300

=== MINIJEFE ===
- Tiene personalidad única y recuerda los eventos de la aventura
- Hace referencias específicas a lo que los jugadores hicieron
- Al morir otorga [XP:todos:500] [ORO:todos:oro_segun_tipo] y un objeto legendario

=== NARRACIÓN ===
- Siempre indica qué dado tirar y qué modificador sumar
- 3-4 opciones al final de cada escena
- ⚠️ HP bajo 30% | 💀 a 0 HP | 🌟 crítico | 💥 pifia
- Máximo 5 párrafos por respuesta
- Emojis: ⚔️🎲🗡️🧙💰✨👹`;

// ============================================================
// ASK DM
// ============================================================
async function askDM(guildId, userMessage, userName) {
  const session = getSession(guildId);

  let ctx = "";
  if (Object.keys(session.players).length > 0) {
    ctx = "\n=== JUGADORES ===\n";
    for (const [name, d] of Object.entries(session.players)) {
      const s = CLASES[d.clase].stats;
      ctx += `${name} (@${d.discordUsername}, ${d.clase} Nv${d.nivel}): HP ${d.hp}/${d.hpMax} | XP ${d.xp} | ${d.oro}mo\n`;
      ctx += `FUE${getModStr(s.fue)} DES${getModStr(s.des)} CON${getModStr(s.con)} INT${getModStr(s.int)} SAB${getModStr(s.sab)} CAR${getModStr(s.car)}\n`;
      if (d.inventario?.length)        ctx += `Items: ${d.inventario.join(", ")}\n`;
      if (d.itemsLegendarios?.length)  ctx += `⭐ Legendarios: ${d.itemsLegendarios.join(", ")}\n`;
      if (d.enRabia) ctx += `⚡ EN RABIA\n`;
    }
    if (session.adventureType) ctx += `Aventura: ${session.adventureType}\n`;
    if (session.minijefe && !session.minijefeDerrotado)
      ctx += `Minijefe: ${session.minijefe.nombre} HP ${session.minijefe.hpActual}/${session.minijefe.hp} CA ${session.minijefe.ca}\nPersonalidad: ${session.minijefe.personalidad}\n`;
  }

  session.history.push({ role: "user", content: `${ctx}[${userName}]: ${userMessage}` });
  if (session.history.length > 40) session.history.splice(0, session.history.length - 40);

  for (let i = 0; i < 3; i++) {
    try {
      const res = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: session.history,
      });
      const reply = res.content[0].text;
      session.history.push({ role: "assistant", content: reply });

      // HP
      for (const m of reply.matchAll(/\[HP:([^:]+):(\d+)\]/g)) {
        const p = session.players[m[1].trim()];
        if (p) p.hp = parseInt(m[2]);
      }
      // ORO
      for (const m of reply.matchAll(/\[ORO:([^:]+):(\d+)\]/g)) {
        const amt = parseInt(m[2]);
        if (m[1].trim() === "todos") { for (const p of Object.values(session.players)) p.oro = (p.oro||0) + amt; }
        else { const p = session.players[m[1].trim()]; if (p) p.oro = (p.oro||0) + amt; }
      }
      // XP + subida nivel
      const subidasNivel = [];
      for (const m of reply.matchAll(/\[XP:([^:]+):(\d+)\]/g)) {
        const amt = parseInt(m[2]);
        const targets = m[1].trim() === "todos" ? Object.entries(session.players) : [[m[1].trim(), session.players[m[1].trim()]]];
        for (const [name, p] of targets) {
          if (!p) continue;
          p.xp = (p.xp||0) + amt;
          const nuevoNv = verificarNivel(p);
          if (nuevoNv) subidasNivel.push({ name, nivel: nuevoNv });
        }
      }
      // ITEM normal
      for (const m of reply.matchAll(/\[ITEM:([^:]+):([^\]]+)\]/g)) {
        const p = session.players[m[1].trim()];
        if (p) {
          if (!p.inventario) p.inventario = [];
          const item = m[2].trim();
          if (!p.inventario.includes(item)) p.inventario.push(item);
        }
      }
      // ITEM LEGENDARIO
      const legendariosMsgs = [];
      for (const m of reply.matchAll(/\[LEGENDARIO:([^:]+):([^\]]+)\]/g)) {
        const p = session.players[m[1].trim()];
        if (p) {
          const partes = m[2].split("|");
          const nombreItem = partes[0]?.trim();
          const desc = partes[1]?.trim() || "";
          const efecto = partes[2]?.trim() || "";
          if (!p.itemsLegendarios) p.itemsLegendarios = [];
          if (nombreItem && !p.itemsLegendarios.includes(nombreItem)) {
            p.itemsLegendarios.push(nombreItem);
            legendariosMsgs.push({ player: m[1].trim(), nombre: nombreItem, desc, efecto });
          }
        }
      }

      await guardarSesion(session);

      let clean = reply
        .replace(/\[HP:[^\]]+\]/g, "")
        .replace(/\[ORO:[^\]]+\]/g, "")
        .replace(/\[XP:[^\]]+\]/g, "")
        .replace(/\[ITEM:[^\]]+\]/g, "")
        .replace(/\[LEGENDARIO:[^\]]+\]/g, "")
        .trim();

      // Notificaciones subida de nivel
      if (subidasNivel.length) {
        clean += "\n\n" + subidasNivel.map(({ name, nivel }) =>
          `🌟 **¡${name} subió al NIVEL ${nivel}!** — ${NIVELES[nivel].titulo}\n❤️ HP máximo aumentado y totalmente recuperado.`
        ).join("\n");
      }

      // Notificaciones legendarios
      if (legendariosMsgs.length) {
        clean += "\n\n" + legendariosMsgs.map(l =>
          `⭐ **¡OBJETO LEGENDARIO!** **${l.player}** obtuvo **${l.nombre}**\n*${l.desc}*\n🔮 Efecto: ${l.efecto}`
        ).join("\n\n");
      }

      return clean;
    } catch (err) {
      if (err.status === 529 && i < 2) { await new Promise(r => setTimeout(r, 5000)); continue; }
      throw err;
    }
  }
}

async function sendLong(channel, text, components) {
  const chunks = text.match(/[\s\S]{1,1900}/g) || [text];
  for (let i = 0; i < chunks.length; i++) {
    const isLast = i === chunks.length - 1;
    await channel.send({ content: chunks[i], ...(isLast && components ? { components } : {}) });
  }
}

// ============================================================
// HELPERS UI
// ============================================================
function separador() { return "━━━━━━━━━━━━━━━━━━"; }

function textoAyuda() {
  return [
    `📜 **Comandos principales**`,
    separador(),
    `⚔️ \`!inicio\` — Abre una sala *(solo anfitrión)*`,
    `🙋 \`!unirse\` — Crear o cargar personaje`,
    `▶️ \`!empezar\` — Iniciar aventura *(solo anfitrión)*`,
    `👹 \`!minijefe\` — Invocar minijefe *(solo anfitrión)*`,
    ``,
    `🎲 **Comandos de juego**`,
    separador(),
    `🎲 \`!tirar\` / \`!tirar 8\` — Tirar dados`,
    `📋 \`!resumen\` — Estado del grupo`,
    `🧾 \`!perfil\` — Tu ficha personal`,
    `🎒 \`!inventario\` — Ver objetos y oro`,
    `💰 \`!oro\` — Ver tu oro`,
    `⚡ \`!habilidad\` — Usar habilidad de clase`,
    `🧪 \`!usar <objeto>\` — Usar un objeto`,
    `😴 \`!descanso\` — Descanso largo`,
    ``,
    `ℹ️ **Comandos útiles**`,
    separador(),
    `📖 \`!clases\` — Ver clases disponibles`,
    `🔄 \`!reiniciar\` — Reiniciar sesión *(anfitrión)*`,
    `❓ \`!ayuda\` — Ver este mensaje`,
  ].join("\n");
}

function textoResumen(session) {
  const lines = [
    `📋 **Estado del grupo**`,
    separador(),
    `🗺️ Aventura: ${session.adventureType || "Sin iniciar"}`,
    ``,
  ];
  for (const [name, d] of Object.entries(session.players)) {
    const xpNext = xpSiguienteNivel(d.nivel);
    const s = CLASES[d.clase].stats;
    lines.push(
      `👤 **${name}** — ${d.clase} Nv${d.nivel}`,
      `❤️ HP: ${d.hp}/${d.hpMax}  |  💰 Oro: ${d.oro}  |  ✨ XP: ${d.xp}${xpNext ? `/${xpNext}` : " (máx)"}`,
      `⚔️ FUE ${getModStr(s.fue)}  DES ${getModStr(s.des)}  CON ${getModStr(s.con)}`,
      `Estado: ${estadoHP(d.hp, d.hpMax)}`,
      ``
    );
  }
  if (session.minijefe && !session.minijefeDerrotado) {
    lines.push(
      `👹 **Minijefe: ${session.minijefe.nombre}**`,
      `❤️ HP: ${session.minijefe.hpActual}/${session.minijefe.hp}  |  🛡️ CA: ${session.minijefe.ca}`
    );
  }
  return lines.join("\n");
}

function textoPerfil(nombre, d) {
  const s = CLASES[d.clase].stats;
  const xpNext = xpSiguienteNivel(d.nivel);
  const usos = CLASES[d.clase].habilidadUsos;
  const usosRestantes = usos - (d.habilidadUsada || 0);
  const items = d.inventario?.length ? d.inventario.join(", ") : "Vacío";
  const legends = d.itemsLegendarios?.length ? d.itemsLegendarios.join(", ") : "Ninguno";

  return [
    `🧾 **Ficha de personaje**`,
    separador(),
    `👤 Nombre: **${nombre}**`,
    `⚔️ Clase: **${d.clase}**  |  Nivel: **${d.nivel}** — ${NIVELES[d.nivel]?.titulo || ""}`,
    `❤️ HP: **${d.hp}/${d.hpMax}**`,
    `✨ XP: **${d.xp}**${xpNext ? `/${xpNext}` : " (nivel máximo)"}`,
    `💰 Oro: **${d.oro} mo**`,
    ``,
    `📊 **Estadísticas**`,
    `FUE ${getModStr(s.fue)} | DES ${getModStr(s.des)} | CON ${getModStr(s.con)} | INT ${getModStr(s.int)} | SAB ${getModStr(s.sab)} | CAR ${getModStr(s.car)}`,
    ``,
    `⚡ Habilidad: **${CLASES[d.clase].habilidadNombre}**`,
    `📝 ${CLASES[d.clase].habilidadDesc}`,
    `Usos restantes: **${usosRestantes}/${usos}**`,
    ``,
    `🎒 Inventario: ${items}`,
    `⭐ Legendarios: ${legends}`,
    `Estado: ${estadoHP(d.hp, d.hpMax)}${d.enRabia ? " | ⚡ EN RABIA" : ""}`,
  ].join("\n");
}

function textoInventario(session) {
  const lines = [`🎒 **Inventarios**`, separador(), ``];
  for (const [name, d] of Object.entries(session.players)) {
    const usos = CLASES[d.clase].habilidadUsos;
    const usosRestantes = usos - (d.habilidadUsada || 0);
    lines.push(`**${name}** (@${d.discordUsername}) — 💰 ${d.oro} mo`);
    if (d.inventario?.length) d.inventario.forEach(i => lines.push(`  • ${i}`));
    else lines.push(`  *(vacío)*`);
    if (d.itemsLegendarios?.length) {
      lines.push(`  ⭐ Legendarios:`);
      d.itemsLegendarios.forEach(i => lines.push(`  ⭐ ${i}`));
    }
    lines.push(`  ⚡ ${CLASES[d.clase].habilidadNombre}: ${usosRestantes}/${usos} usos`, ``);
  }
  return lines.join("\n");
}

// ============================================================
// JOIN FLOW
// ============================================================
async function handleJoinFlow(message, session) {
  const userId = message.author.id;
  const content = message.content.trim();
  const lower = content.toLowerCase();
  const q = session.joinQueue[userId];

  if (q.step === "nombre") {
    const pg = await Personaje.findOne({ discordId: userId, guildId: message.guild.id });
    if (pg) {
      q.personajeGuardado = pg;
      q.step = "confirmar";
      return message.reply(
        `💾 **Personaje guardado encontrado:**\n` +
        `👤 **${pg.nombre}** — ${pg.clase} Nv${pg.nivel}\n` +
        `❤️ HP: ${pg.hp}/${pg.hpMax}  |  💰 ${pg.oro}mo  |  ✨ XP: ${pg.xp}\n\n` +
        `¿Continuar con este personaje?\n**1** — Sí, usar guardado\n**2** — No, crear nuevo`
      );
    }
    q.tempName = content;
    q.step = "clase";
    return message.reply(elegirClaseMsg(content));
  }

  if (q.step === "confirmar") {
    if (content === "1" || lower === "si" || lower === "sí") {
      const pg = q.personajeGuardado;
      const playerData = {
        clase: pg.clase, hp: pg.hp, hpMax: pg.hpMax,
        nivel: pg.nivel, xp: pg.xp, oro: pg.oro,
        inventario: pg.inventario || [], itemsLegendarios: pg.itemsLegendarios || [],
        habilidadUsada: 0, enRabia: false,
        discordId: userId, discordUsername: message.author.username,
        aventurasCompletadas: pg.aventurasCompletadas || 0,
      };
      session.players[pg.nombre] = playerData;
      session.userMap[userId] = pg.nombre;
      delete session.joinQueue[userId];
      return message.reply(`✅ **${pg.nombre}** cargado.\n${textoPerfil(pg.nombre, playerData)}\n\nEspera a que el anfitrión escriba \`!empezar\`.`);
    }
    q.step = "nombre_nuevo";
    return message.reply(`🎭 ¿Cuál será el nombre de tu nuevo personaje?`);
  }

  if (q.step === "nombre_nuevo") {
    q.tempName = content;
    q.step = "clase";
    return message.reply(elegirClaseMsg(content));
  }

  if (q.step === "clase") {
    const claseMap = {
      "1": "Guerrero", "guerrero": "Guerrero",
      "2": "Mago", "mago": "Mago",
      "3": "Pícaro", "picaro": "Pícaro", "pícaro": "Pícaro",
      "4": "Clérigo", "clerigo": "Clérigo", "clérigo": "Clérigo",
      "5": "Bárbaro", "barbaro": "Bárbaro", "bárbaro": "Bárbaro",
      "6": "Bardo", "bardo": "Bardo",
    };
    const clase = claseMap[lower];
    if (!clase) return message.reply("⚠️ Escribe el número (1-6) o el nombre de la clase.");

    const nombre = q.tempName;
    const hpMax = calcularHPBase(clase);
    const playerData = {
      clase, hp: hpMax, hpMax, nivel: 1, xp: 0, oro: 0,
      inventario: [], itemsLegendarios: [],
      habilidadUsada: 0, enRabia: false,
      discordId: userId, discordUsername: message.author.username,
      aventurasCompletadas: 0,
    };
    session.players[nombre] = playerData;
    session.userMap[userId] = nombre;
    await guardarPersonaje(message.guild.id, nombre, playerData);
    delete session.joinQueue[userId];
    return message.reply(`✅ **Personaje creado:**\n${textoPerfil(nombre, playerData)}\n\nEspera a que el anfitrión escriba \`!empezar\`.`);
  }
}

function elegirClaseMsg(nombre) {
  return `🎭 **¡Hola ${nombre}!** Elige tu clase:\n\n` +
    `1️⃣ **Guerrero** — Maestro del combate (HP alto)\n` +
    `2️⃣ **Mago** — Conjuros devastadores (HP bajo)\n` +
    `3️⃣ **Pícaro** — Sigilo y ataques furtivos\n` +
    `4️⃣ **Clérigo** — Sanación y magia divina\n` +
    `5️⃣ **Bárbaro** — Furia salvaje (HP muy alto)\n` +
    `6️⃣ **Bardo** — Música mágica y versátil\n\n` +
    `Escribe el número o el nombre. Usa \`!clases\` para más detalles.`;
}

// ============================================================
// EVENTOS
// ============================================================
client.once("clientReady", () => console.log(`✅ DM Bot: ${client.user.tag}`));

// Botones de dados
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;
  if (!interaction.customId.startsWith("dado_")) return;

  const sides = parseInt(interaction.customId.split("_")[1].replace("d", ""));
  const r = Math.floor(Math.random() * sides) + 1;
  const emoji = r === sides ? "🌟" : r === 1 ? "💀" : "🎲";
  const extra = r === sides ? " **¡CRÍTICO!**" : r === 1 ? " **¡PIFIA!**" : "";
  await interaction.reply(`${emoji} **${interaction.user.username}** tiró **d${sides}**: **${r}**${extra}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.channel.name !== DM_CHANNEL_NAME) return;

  const content = message.content.trim();
  const lower = content.toLowerCase();
  const session = getSession(message.guild.id);
  session.guildId = message.guild.id;
  const userId = message.author.id;

  // ── GLOBALES ─────────────────────────────────────────────

  if (lower.startsWith("!tirar")) {
    const sides = parseInt(lower.split(/\s+/)[1]) || 20;
    if (sides < 2 || sides > 100) return message.reply("⚠️ Dado entre 2 y 100 caras.");
    const r = Math.floor(Math.random() * sides) + 1;
    const emoji = r === sides ? "🌟" : r === 1 ? "💀" : "🎲";
    const extra = r === sides ? " **¡CRÍTICO!**" : r === 1 ? " **¡PIFIA!**" : "";
    return message.reply(`${emoji} **${message.author.username}** tiró d${sides}: **${r}**${extra}`);
  }

  if (lower === "!ayuda" || lower === "!help") return message.reply(textoAyuda());

  if (lower === "!clases") {
    let msg = `📖 **Clases disponibles**\n${separador()}\n\n`;
    for (const [n, d] of Object.entries(CLASES))
      msg += `**${n}** — ${d.descripcion}\n⚡ ${d.habilidadNombre}: ${d.habilidadDesc}\n\n`;
    return message.reply(msg);
  }

  // ── JOIN FLOW ─────────────────────────────────────────────

  if (session.joinQueue[userId]) return handleJoinFlow(message, session);

  if (lower === "!unirse") {
    if (session.fase === "aventura_activa") return message.reply("⚠️ La aventura ya comenzó.");
    if (session.fase === "esperando")       return message.reply("⚠️ No hay sala abierta. Alguien debe escribir `!inicio`.");
    if (session.userMap[userId])            return message.reply(`⚠️ Ya tienes personaje: **${session.userMap[userId]}**. Usa \`!perfil\`.`);
    session.joinQueue[userId] = { step: "nombre" };
    return message.reply(`🎲 **¡Bienvenido a D&D 5e!**\n\n¿Cuál será el nombre de tu personaje?`);
  }

  // ── ANFITRIÓN ─────────────────────────────────────────────

  if (lower === "!inicio") {
    if (session.fase === "aventura_activa") return message.reply("⚠️ Hay aventura activa. Usa `!reiniciar` primero.");
    sessions.delete(message.guild.id);
    const ns = getSession(message.guild.id);
    ns.fase = "unirse"; ns.hostId = userId; ns.guildId = message.guild.id;
    return message.reply(
      `⚔️ **¡Sala abierta por ${message.author.username}!**\n${separador()}\n\n` +
      `🧙 Soy vuestro Dungeon Master.\n**Cada jugador escribe \`!unirse\` para crear o cargar su personaje.**\n` +
      `Cuando todos estén listos, ${message.author.username} escribe \`!empezar\`.`
    );
  }

  if (lower === "!empezar") {
    if (session.hostId !== userId) return message.reply("⚠️ Solo el anfitrión puede iniciar.");
    if (session.fase !== "unirse") return message.reply("⚠️ Primero abre sala con `!inicio`.");
    if (!Object.keys(session.players).length) return message.reply("⚠️ Ningún jugador se ha unido aún.");
    session.fase = "eligiendo_aventura";
    const jugs = Object.entries(session.players).map(([n, d]) => `**${n}** (${d.clase} Nv${d.nivel})`).join(", ");
    return message.reply(
      `🗺️ **Jugadores listos:** ${jugs}\n\n¿Qué aventura queréis vivir?\n${separador()}\n` +
      `1️⃣ **Mazmorra misteriosa**\n2️⃣ **Bosque encantado**\n3️⃣ **Ciudad corrupta**\n4️⃣ **Viaje en barco**\n\nEscribe el número.`
    );
  }

  if (session.fase === "eligiendo_aventura") {
    if (session.hostId !== userId) return;
    const av = TIPOS_AVENTURA[content];
    if (!av) return message.reply("⚠️ Escribe un número del 1 al 4.");
    session.adventureType = av;
    session.fase = "aventura_activa";
    session.minijefe = { ...MINIJEFES[av], hpActual: MINIJEFES[av].hp };

    let lista = "Personajes:\n";
    for (const [n, d] of Object.entries(session.players))
      lista += `- ${n} (@${d.discordUsername}, ${d.clase} Nv${d.nivel}, ${d.hp}HP, ${d.oro}mo)\n`;

    await message.channel.send(`⚔️ **¡La aventura "${av}" comienza!** 🎲`);
    try {
      await message.channel.sendTyping();
      const intro = await askDM(message.guild.id,
        `Inicia la aventura: ${av}. ${lista} Preséntate como DM, introducción épica, presenta personajes, explica reglas básicas (d20, CD, oro, XP, objetos legendarios) y primera escena con 3-4 opciones. Minijefe final: ${session.minijefe.nombre} — no lo menciones todavía.`,
        "Sistema"
      );
      await sendLong(message.channel, intro, crearBotonesDados());
    } catch (e) {
      console.error(e);
      message.channel.send("⚠️ Error al iniciar. Intenta de nuevo.");
    }
    return;
  }

  if (lower === "!minijefe") {
    if (session.hostId !== userId) return message.reply("⚠️ Solo el anfitrión.");
    if (session.fase !== "aventura_activa") return message.reply("⚠️ No hay aventura activa.");
    if (session.minijefeDerrotado) return message.reply("⚠️ El minijefe ya fue derrotado.");
    const mj = session.minijefe;
    await message.channel.send(
      `💀 **¡APARECE EL MINIJEFE!**\n${separador()}\n\n` +
      `👹 **${mj.nombre}**\n${mj.descripcion}\n` +
      `❤️ HP: ${mj.hpActual}/${mj.hp}  |  🛡️ CA: ${mj.ca}  |  ⚔️ Daño: ${mj.dano}`
    );
    try {
      await message.channel.sendTyping();
      const r = await askDM(message.guild.id,
        `¡Aparece el minijefe! Nombre: ${mj.nombre}. Descripción: ${mj.descripcion}. Personalidad: ${mj.personalidad}. Recuerda los eventos de la aventura para que haga referencias específicas. Inicia el combate dramáticamente con tirada de iniciativa.`,
        "Sistema"
      );
      await sendLong(message.channel, r, crearBotonesDados());
    } catch (e) { console.error(e); }
    return;
  }

  if (lower === "!reiniciar" || lower === "!reset") {
    if (session.hostId && session.hostId !== userId) return message.reply("⚠️ Solo el anfitrión puede reiniciar.");
    sessions.delete(message.guild.id);
    return message.reply("🔄 Sesión reiniciada. Los personajes siguen guardados en la base de datos.\nEscribe `!inicio` para empezar.");
  }

  // ── JUGADOR ───────────────────────────────────────────────

  const activa = session.fase === "aventura_activa";
  const hayJugadores = Object.keys(session.players).length > 0;

  if (lower === "!resumen") {
    if (!hayJugadores) return message.reply("⚠️ No hay aventura activa.");
    return message.reply(textoResumen(session));
  }

  if (lower === "!perfil") {
    const nombre = getNombreByDiscordId(session, userId);
    if (!nombre) return message.reply("⚠️ No tienes personaje activo. Usa `!unirse`.");
    return message.reply(textoPerfil(nombre, session.players[nombre]));
  }

  if (lower === "!inventario") {
    if (!hayJugadores) return message.reply("⚠️ No hay aventura activa.");
    return message.reply(textoInventario(session));
  }

  if (lower === "!oro") {
    const nombre = getNombreByDiscordId(session, userId);
    if (!nombre) return message.reply("⚠️ No tienes personaje activo.");
    return message.reply(`💰 **${nombre}** tiene **${session.players[nombre].oro} monedas de oro**.`);
  }

  if (lower === "!habilidad") {
    if (!activa) return message.reply("⚠️ No hay aventura activa.");
    const nombre = getNombreByDiscordId(session, userId);
    if (!nombre) return message.reply("⚠️ No tienes personaje. Únete con `!unirse` en la próxima partida.");
    const data = session.players[nombre];
    const ci = CLASES[data.clase];
    if ((data.habilidadUsada || 0) >= ci.habilidadUsos)
      return message.reply(`⚠️ Sin usos de **${ci.habilidadNombre}** (0/${ci.habilidadUsos}). Usa \`!descanso\`.`);
    data.habilidadUsada = (data.habilidadUsada || 0) + 1;
    const res = ci.usarHabilidad(data);
    await guardarPersonaje(message.guild.id, nombre, data);
    await message.reply(`${res}\n\n📊 Usos: **${ci.habilidadUsos - data.habilidadUsada}/${ci.habilidadUsos}**`);
    try {
      await message.channel.sendTyping();
      const dr = await askDM(message.guild.id, `${nombre} usó "${ci.habilidadNombre}". Narra el efecto dramáticamente en la escena actual.`, nombre);
      await sendLong(message.channel, dr);
    } catch (e) { console.error(e); }
    return;
  }

  if (lower.startsWith("!usar ")) {
    if (!activa) return message.reply("⚠️ No hay aventura activa.");
    const nombre = getNombreByDiscordId(session, userId);
    if (!nombre) return message.reply("⚠️ No tienes personaje.");
    const data = session.players[nombre];
    const busqueda = content.slice(6).trim().toLowerCase();
    const item = data.inventario?.find(i => i.toLowerCase().includes(busqueda))
               || data.itemsLegendarios?.find(i => i.toLowerCase().includes(busqueda));
    if (!item) return message.reply(`⚠️ No tienes "${busqueda}". Usa \`!inventario\`.`);

    if (item.toLowerCase().includes("poción") || item.toLowerCase().includes("pocion")) {
      const c = Math.floor(Math.random()*4)+1 + Math.floor(Math.random()*4)+1 + 2;
      const ant = data.hp;
      data.hp = Math.min(data.hpMax, data.hp + c);
      data.inventario = data.inventario.filter(i => i !== item);
      await guardarPersonaje(message.guild.id, nombre, data);
      await message.reply(`🧪 **${nombre}** usó **${item}**.\n❤️ +${data.hp - ant} HP → ${data.hp}/${data.hpMax}\n*(Consumido)*`);
    } else {
      await message.reply(`🎒 **${nombre}** usa **${item}**. El DM narrará el efecto...`);
    }
    try {
      await message.channel.sendTyping();
      const dr = await askDM(message.guild.id, `${nombre} usó "${item}". Narra el efecto en la escena.`, nombre);
      await sendLong(message.channel, dr);
    } catch (e) { console.error(e); }
    return;
  }

  if (lower === "!descanso") {
    if (!activa) return message.reply("⚠️ No hay aventura activa.");
    let msg = `😴 **Descanso largo**\n${separador()}\n\n`;
    for (const [name, data] of Object.entries(session.players)) {
      data.hp = data.hpMax; data.habilidadUsada = 0; data.enRabia = false;
      await guardarPersonaje(message.guild.id, name, data);
      msg += `✅ **${name}**: ${data.hpMax}/${data.hpMax} HP, habilidades recargadas.\n`;
    }
    await message.reply(msg);
    try {
      await message.channel.sendTyping();
      const dr = await askDM(message.guild.id, "El grupo descansa una noche completa. Narra el descanso y añade algo interesante o inquietante que ocurre mientras duermen.", "Sistema");
      await sendLong(message.channel, dr);
    } catch (e) { console.error(e); }
    return;
  }

  // ── RESPUESTA LIBRE ───────────────────────────────────────
  if (activa) {
    const nombre = getNombreByDiscordId(session, userId);
    if (!nombre) return message.reply("⚠️ No tienes personaje en esta partida. Únete en la próxima con `!unirse`.");
    try {
      await message.channel.sendTyping();
      const reply = await askDM(message.guild.id, content, nombre);
      await sendLong(message.channel, reply, crearBotonesDados());
    } catch (e) {
      console.error(e);
      message.reply("⚠️ *(El oráculo se ha oscurecido... Algo salió mal. Intenta de nuevo.)*");
    }
  }
});

client.login(DISCORD_TOKEN);
