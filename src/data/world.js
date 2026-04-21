// ═══════════════════════════════════════════════════════
//  MAPA MUNDO PERSISTENTE
// ═══════════════════════════════════════════════════════

const WORLD_MAP = `
╔══════════════════════════════════════════════════════════╗
║              🗺️  MAPA DEL REINO DE VALDROS               ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║   🌲[BOSQUE OSCURO]    💀[TIERRAS MUERTAS]               ║
║        Nv.3+                 Nv.4+                       ║
║          │                     │                         ║
║   ⛏️[MINAS NORTE]    🏰[FORTALEZA CAIDA]                 ║
║        Nv.2+                 Nv.3+                       ║
║          │                     │                         ║
║   🏔️[MONTANAS]  ───  🏘️[PUEBLO VALDROS]  ───  🌊[COSTA] ║
║        Nv.2+           (HUB CENTRAL)           Nv.3+     ║
║                              │                           ║
║   🍺[TABERNA CAMINO] ── 🌾[VALLE INICIO] ── 🗡️[RUINAS]  ║
║        Nv.1+                Nv.1               Nv.2+     ║
║                              │                           ║
║              🏟️[ARENA GLADIADORES]                       ║
║                    (PvP - todos)                         ║
╚══════════════════════════════════════════════════════════╝`;

const ZONES = {
  valle_inicio: {
    id: 'valle_inicio',
    name: 'Valle de Inicio',
    emoji: '🌾',
    description: 'El lugar donde comienzan todos los aventureros. Seguro y tranquilo.',
    minLevel: 1,
    unlockRequirement: null,
    adventures: ['taberna_maldita'],
    shopBonus: null,
    reputationFaction: 'gremio_aventureros',
  },
  minas_norte: {
    id: 'minas_norte',
    name: 'Minas del Norte',
    emoji: '⛏️',
    description: 'Las antiguas minas donde los espectros acechan en la oscuridad.',
    minLevel: 2,
    unlockRequirement: { adventuresCompleted: 1 },
    adventures: ['mina_abandonada'],
    shopBonus: { type: 'arma', discount: 10 },
    reputationFaction: 'gremio_aventureros',
  },
  tierras_muertas: {
    id: 'tierras_muertas',
    name: 'Tierras Muertas',
    emoji: '💀',
    description: 'El dominio del Lich Malachar. Solo los mas valientes se atreven.',
    minLevel: 4,
    unlockRequirement: { adventuresCompleted: 3, worldLevel: 2 },
    adventures: ['torre_del_lich'],
    shopBonus: { type: 'pocion', discount: 15 },
    reputationFaction: 'orden_magica',
  },
  bosque_oscuro: {
    id: 'bosque_oscuro',
    name: 'Bosque Oscuro',
    emoji: '🌲',
    description: 'Un bosque maldito donde criaturas desconocidas acechan entre los arboles.',
    minLevel: 3,
    unlockRequirement: { adventuresCompleted: 2 },
    adventures: ['mazmorra_aleatoria'],
    shopBonus: { type: 'misc', discount: 10 },
    reputationFaction: 'ladrones',
  },
  pueblo_valdros: {
    id: 'pueblo_valdros',
    name: 'Pueblo de Valdros',
    emoji: '🏘️',
    description: 'El hub central del reino. Tienda mejorada, gremio y noticias del mundo.',
    minLevel: 2,
    unlockRequirement: { adventuresCompleted: 2 },
    adventures: [],
    shopBonus: { type: 'all', discount: 5 },
    reputationFaction: 'reino_norte',
  },
  fortaleza_caida: {
    id: 'fortaleza_caida',
    name: 'Fortaleza Caida',
    emoji: '🏰',
    description: 'Una antigua fortaleza tomada por no-muertos. Riquezas legendarias esperan.',
    minLevel: 3,
    unlockRequirement: { adventuresCompleted: 3, worldLevel: 2 },
    adventures: ['mazmorra_aleatoria'],
    shopBonus: { type: 'armadura', discount: 10 },
    reputationFaction: 'reino_norte',
  },
  costa: {
    id: 'costa',
    name: 'Costa Salvaje',
    emoji: '🌊',
    description: 'Piratas, sirenas y tesoros hundidos bajo las olas turbulentas.',
    minLevel: 3,
    unlockRequirement: { adventuresCompleted: 4, worldLevel: 3 },
    adventures: ['mazmorra_aleatoria'],
    shopBonus: { type: 'misc', discount: 20 },
    reputationFaction: 'ladrones',
  },
};

const FACTIONS = {
  gremio_aventureros: { name: 'Gremio de Aventureros', emoji: '⚔️',
    ranks: ['Novato', 'Aprendiz', 'Veterano', 'Maestro', 'Leyenda'],
    thresholds: [0, 100, 300, 600, 1000],
    perks: ['Descuento 5% tienda', 'Acceso a misiones especiales', 'Descuento 15%', 'Equipo exclusivo', 'Titulo Legendario'],
  },
  reino_norte: { name: 'Reino del Norte', emoji: '👑',
    ranks: ['Desconocido', 'Ciudadano', 'Soldado', 'Capitan', 'Heroe del Reino'],
    thresholds: [0, 50, 200, 500, 900],
    perks: ['—', 'Acceso a Pueblo Valdros', 'Guardias te ayudan', 'Mision real exclusiva', 'Titulo noble'],
  },
  orden_magica: { name: 'Orden Magica', emoji: '🔮',
    ranks: ['Ignorante', 'Iniciado', 'Hechicero', 'Archimago', 'Maestro Arcano'],
    thresholds: [0, 75, 250, 550, 950],
    perks: ['—', 'Hechizos extra en tienda', '+1 ranura hechizo', 'Hechizo legendario', 'Baculo unico'],
  },
  ladrones: { name: 'Gremio de Ladrones', emoji: '🗡️',
    ranks: ['Sospechoso', 'Contacto', 'Asociado', 'Especialista', 'Maestro Sombra'],
    thresholds: [0, 60, 200, 450, 800],
    perks: ['—', 'Info de tesoros ocultos', 'Descuento objetos raros', 'Mision de infiltracion', 'Daga unica legendaria'],
  },
  iglesia_luz: { name: 'Iglesia de la Luz', emoji: '✨',
    ranks: ['Pecador', 'Feligres', 'Devoto', 'Paladin', 'Santo'],
    thresholds: [0, 50, 200, 500, 950],
    perks: ['—', 'Curacion gratuita 1/dia', 'Bendicion antes de combate', 'Resurrecion 1/semana', 'Armadura sagrada unica'],
  },
};

function getReputationRank(faction, points) {
  const f = FACTIONS[faction];
  if (!f) return 'Desconocido';
  let rank = f.ranks[0];
  for (let i = 0; i < f.thresholds.length; i++) {
    if (points >= f.thresholds[i]) rank = f.ranks[i];
  }
  return rank;
}

function checkZoneUnlock(zone, guildData) {
  const req = zone.unlockRequirement;
  if (!req) return true;
  if (req.adventuresCompleted && guildData.world.totalAdventuresCompleted < req.adventuresCompleted) return false;
  if (req.worldLevel && guildData.world.worldLevel < req.worldLevel) return false;
  return true;
}

module.exports = { WORLD_MAP, ZONES, FACTIONS, getReputationRank, checkZoneUnlock };
