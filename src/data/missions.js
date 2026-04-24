// data/missions.js — PARCHE v2.0
// Tablón de misiones pequeñas: solos o en grupo, por nivel y dificultad
// Cada misión tiene recompensas de XP, oro y loot opcional

const MISSIONS = [
  // ─── NIVEL 1 — Fácil (1 persona) ─────────────────────────────────────────
  {
    id: 'M001',
    name: '🐀 La rata del granero',
    description: 'Un granjero necesita que alguien elimine a una rata gigante que ha infestado su granero.',
    difficulty: 'fácil',
    minLevel: 1,
    minPlayers: 1,
    maxPlayers: 2,
    xpReward: 50,
    goldReward: 20,
    loot: null,
    steps: [
      { text: 'Entras al granero oscuro. Hueles algo desagradable. La rata puede estar en cualquier rincón...', choices: [
        { label: '🔦 Buscar rastros', next: 1 },
        { label: '⚔️ Atacar a lo loco', next: 2 },
      ]},
      { text: 'Encuentras huellas que llevan al fondo del granero. Te preparas para el ataque.', combat: { name: 'Rata Gigante', hp: 10, ac: 10, attackBonus: 1, damageDice: '1d4', xp: 50, gold: 20 }},
      { text: 'Atacas sin ver bien y la rata te muerde antes de que puedas reaccionar.', combat: { name: 'Rata Gigante (ventaja)', hp: 10, ac: 10, attackBonus: 3, damageDice: '1d6', xp: 50, gold: 20 }},
    ],
  },

  {
    id: 'M002',
    name: '📜 El mensaje urgente',
    description: 'Un comerciante necesita entregar un mensaje al otro lado del bosque antes del anochecer.',
    difficulty: 'fácil',
    minLevel: 1,
    minPlayers: 1,
    maxPlayers: 1,
    xpReward: 40,
    goldReward: 15,
    loot: null,
    steps: [
      { text: 'Tomas el mensaje y te adentras en el bosque. El camino está despejado, pero ves una figura sospechosa.', choices: [
        { label: '🏃 Correr y esquivarla', next: 1 },
        { label: '💬 Hablar con ella', next: 2 },
      ]},
      { text: '¡Llegas a tiempo! El destinatario te da una moneda extra por tu rapidez.', isEnd: true, xpReward: 40, goldReward: 20 },
      { text: 'Era un viajero inofensivo que te da un atajo. Llegas más rápido de lo esperado.', isEnd: true, xpReward: 55, goldReward: 15 },
    ],
  },

  // ─── NIVEL 1-2 — Normal (1-3 personas) ────────────────────────────────────
  {
    id: 'M003',
    name: '🐺 Los lobos del camino',
    description: 'Una manada de lobos ataca a los viajeros cerca del puente del río. Necesitan ser ahuyentados.',
    difficulty: 'normal',
    minLevel: 1,
    minPlayers: 1,
    maxPlayers: 3,
    xpReward: 100,
    goldReward: 40,
    loot: { chance: 0.15, itemId: 'lobo_piel', name: '🐺 Piel de lobo', bonus: 'Capa +1 AC' },
    steps: [
      { text: 'Llegas al puente y ves tres lobos acechando a una caravana. Debes actuar rápido.', choices: [
        { label: '🔥 Encender antorchas para asustarlos', next: 1 },
        { label: '⚔️ Atacar al alfa', next: 2 },
        { label: '🎵 Usar música/hechizo de encantamiento', next: 3 },
      ]},
      { text: 'Las llamas asustan a los lobos menores, solo queda el alfa furioso.', combat: { name: 'Lobo Alfa', hp: 18, ac: 12, attackBonus: 4, damageDice: '1d8+2', xp: 100, gold: 40 }},
      { text: 'El alfa acepta el reto. Una pelea decisiva.', combat: { name: 'Manada (x3)', hp: 24, ac: 11, attackBonus: 3, damageDice: '1d6', xp: 100, gold: 40 }},
      { text: 'Los lobos se calman y se retiran. La caravana te paga generosamente.', isEnd: true, xpReward: 120, goldReward: 55 },
    ],
  },

  {
    id: 'M004',
    name: '💎 El cristal robado',
    description: 'Un orbe mágico fue robado del templo local. Sospechosos hay varios.',
    difficulty: 'normal',
    minLevel: 2,
    minPlayers: 1,
    maxPlayers: 2,
    xpReward: 120,
    goldReward: 50,
    loot: null,
    steps: [
      { text: 'El sacerdote describe al ladrón: capucha oscura, salió por la ventana trasera. ¿Por dónde empiezas?', choices: [
        { label: '🏠 Interrogar a los vecinos', next: 1 },
        { label: '🔍 Buscar pistas en la ventana', next: 2 },
      ]},
      { text: 'Un vecino vio a alguien entrar a la posada "El Jabalí Rojo". Vas allí.', combat: { name: 'Ladrón de Gremio', hp: 14, ac: 13, attackBonus: 3, damageDice: '1d6+1', xp: 120, gold: 50 }},
      { text: 'Encuentras fibras de una capa negra y monedas de otro reino. Sigues la pista al mercado.', combat: { name: 'Ladrón de Gremio', hp: 14, ac: 13, attackBonus: 3, damageDice: '1d6+1', xp: 120, gold: 50 }},
    ],
  },

  // ─── NIVEL 2-3 — Difícil (2+ personas) ────────────────────────────────────
  {
    id: 'M005',
    name: '🕷️ El nido de arañas',
    description: 'Las arañas gigantes del bosque sur se han multiplicado y bloquean el camino comercial.',
    difficulty: 'difícil',
    minLevel: 2,
    minPlayers: 2,
    maxPlayers: 4,
    xpReward: 200,
    goldReward: 80,
    loot: { chance: 0.25, itemId: 'veneno_araña', name: '🕷️ Veneno de Araña', bonus: 'Arma envenenada por 3 combates' },
    steps: [
      { text: 'El nido es enorme. Hay huevos en todos lados y al menos dos adultas guardianas.', choices: [
        { label: '🔥 Quemar el nido', next: 1 },
        { label: '⚔️ Eliminar a las guardianas primero', next: 2 },
      ]},
      { text: 'El fuego funciona pero atrae a la reina.', combat: { name: 'Reina Araña', hp: 35, ac: 14, attackBonus: 5, damageDice: '1d10+3', xp: 200, gold: 80 }},
      { text: 'Sin guardianas, la reina sale furiosa del centro del nido.', combat: { name: 'Reina Araña (enojada)', hp: 40, ac: 14, attackBonus: 6, damageDice: '1d10+4', xp: 200, gold: 80 }},
    ],
  },

  {
    id: 'M006',
    name: '⛵ El barco fantasma',
    description: 'Un barco sin tripulación llega al puerto. Los marineros se niegan a acercarse.',
    difficulty: 'difícil',
    minLevel: 3,
    minPlayers: 2,
    maxPlayers: 4,
    xpReward: 250,
    goldReward: 100,
    loot: { chance: 0.3, itemId: 'brujula_maldita', name: '🧭 Brújula Maldita', bonus: 'Siempre apunta al objeto más valioso cercano' },
    steps: [
      { text: 'Abordáis el barco. Las velas están desgarradas y hay marcas de garras en la madera. Un frío antinatural os envuelve.', choices: [
        { label: '🔍 Explorar la bodega', next: 1 },
        { label: '🛖 Ir al camarote del capitán', next: 2 },
      ]},
      { text: 'En la bodega encuentran cadenas y un espectro furioso.', combat: { name: 'Espectro del Marinero', hp: 28, ac: 13, attackBonus: 4, damageDice: '1d8+2', xp: 250, gold: 100 }},
      { text: 'El diario del capitán revela que vendió su alma. El espectro aparece desde el espejo.', combat: { name: 'Espectro del Capitán', hp: 32, ac: 14, attackBonus: 5, damageDice: '1d10+2', xp: 250, gold: 100 }},
    ],
  },

  // ─── NIVEL 4+ — Épico (3-5 personas) ──────────────────────────────────────
  {
    id: 'M007',
    name: '🐉 El dragón joven de las colinas',
    description: 'Un dragón joven ha elegido las colinas al este como su guarida. Ya atacó dos aldeas.',
    difficulty: 'épico',
    minLevel: 4,
    minPlayers: 3,
    maxPlayers: 5,
    xpReward: 500,
    goldReward: 300,
    loot: { chance: 0.5, itemId: 'escama_dragon', name: '🐉 Escama de Dragón', bonus: 'Armadura +2 AC, resistencia a fuego' },
    steps: [
      { text: 'La guarida es una cueva en lo alto de la colina. El olor a azufre es intenso. Podéis ver huesos de ganado en la entrada.', choices: [
        { label: '🤝 Intentar negociar con el dragón', next: 1 },
        { label: '⚔️ Ataque sorpresa mientras duerme', next: 2 },
        { label: '🎯 Preparar una emboscada en la entrada', next: 3 },
      ]},
      { text: 'El dragón escucha pero exige un tributo enorme. Negocias a la baja... y se enfurece.', combat: { name: 'Dragón Joven (negociación fallida)', hp: 80, ac: 17, attackBonus: 7, damageDice: '2d10+5', xp: 500, gold: 300 }},
      { text: '¡El dragón no estaba dormido del todo! Se despierta furioso con ventaja en el ataque.', combat: { name: 'Dragón Joven (despierto)', hp: 90, ac: 17, attackBonus: 9, damageDice: '2d10+6', xp: 500, gold: 300 }},
      { text: 'La emboscada funciona a la perfección. El dragón emerge en vuestra posición ideal.', combat: { name: 'Dragón Joven (emboscado)', hp: 70, ac: 16, attackBonus: 6, damageDice: '2d10+4', xp: 500, gold: 300 }},
    ],
  },

  {
    id: 'M008',
    name: '💀 El culto de la oscuridad',
    description: 'Un culto intenta abrir un portal a otro plano en las catacumbas bajo la ciudad.',
    difficulty: 'épico',
    minLevel: 5,
    minPlayers: 3,
    maxPlayers: 5,
    xpReward: 600,
    goldReward: 250,
    loot: { chance: 0.4, itemId: 'amuleto_anticulto', name: '☀️ Amuleto de Luz Sagrada', bonus: '+2d6 daño radiante contra no-muertos y aberraciones' },
    steps: [
      { text: 'Las catacumbas están llenas de cultistas encapuchados. El ritual ya ha comenzado. Un portal verde pulsa en el altar.', choices: [
        { label: '🔮 Interrumpir el ritual mágicamente', next: 1 },
        { label: '⚔️ Atacar al sacerdote líder', next: 2 },
        { label: '💣 Destruir el altar', next: 3 },
      ]},
      { text: 'El sacerdote lanza un hechizo de represalia masivo.', combat: { name: 'Sumo Sacerdote Oscuro', hp: 60, ac: 15, attackBonus: 7, damageDice: '2d8+4', xp: 600, gold: 250 }},
      { text: 'El sacerdote invoca a un demonio menor antes de morir.', combat: { name: 'Demonio Menor', hp: 75, ac: 16, attackBonus: 8, damageDice: '2d8+5', xp: 600, gold: 250 }},
      { text: 'El altar explota con energía oscura hiriendo a todos, pero el portal colapsa. Solo queda el guardián.', combat: { name: 'Guardián del Portal', hp: 65, ac: 17, attackBonus: 8, damageDice: '2d6+5', xp: 600, gold: 250 }},
    ],
  },
];

// ─── Funciones de acceso ──────────────────────────────────────────────────────

function getAll() {
  return MISSIONS;
}

function getById(id) {
  return MISSIONS.find(m => m.id === id) || null;
}

function getByLevel(level) {
  return MISSIONS.filter(m => m.minLevel <= level);
}

function getByDifficulty(difficulty) {
  return MISSIONS.filter(m => m.difficulty === difficulty);
}

function getForPlayer(level, players = 1) {
  return MISSIONS.filter(m => m.minLevel <= level && m.minPlayers <= players);
}

const DIFFICULTY_EMOJIS = {
  'fácil': '🟢',
  'normal': '🟡',
  'difícil': '🔴',
  'épico': '🟣',
};

function formatMissionList(missions) {
  return missions.map(m =>
    `${DIFFICULTY_EMOJIS[m.difficulty] || '⚪'} **${m.name}** (ID: \`${m.id}\`)\n` +
    `   Nivel ${m.minLevel}+ | ${m.minPlayers}-${m.maxPlayers} jugadores | ${m.xpReward} XP | ${m.goldReward}🪙\n` +
    `   _${m.description}_`
  ).join('\n\n');
}

module.exports = { getAll, getById, getByLevel, getByDifficulty, getForPlayer, formatMissionList, DIFFICULTY_EMOJIS };
