// data/classes.js — PARCHE v2.0
// Sistema de hechizos progresivos: cada clase aprende nuevos hechizos al subir de nivel

const CLASSES = {
  guerrero: {
    name: '⚔️ Guerrero',
    hitDie: 10,
    primaryStat: 'strength',
    description: 'Tanque y daño físico. Maestro de las armas.',
    spellsPerLevel: {
      1: [],
      2: [{ id: 'second_wind', name: '💨 Segundo Viento', desc: 'Recuperas 1d10 + nivel HP como acción bonus (1/combate).', cost: 0, type: 'heal', dice: '1d10' }],
      3: [{ id: 'action_surge', name: '⚡ Impulso de Acción', desc: 'Realiza un ataque adicional en tu turno (1/descanso corto).', cost: 0, type: 'attack_bonus', dice: null }],
      4: [{ id: 'indomitable', name: '🛡️ Indomable', desc: 'Repite una tirada de salvación fallida (1/descanso largo).', cost: 0, type: 'reroll', dice: null }],
      5: [{ id: 'extra_attack', name: '🗡️🗡️ Ataque Extra', desc: 'Atacas dos veces cuando usas la acción de atacar.', cost: 0, type: 'passive', dice: null }],
      6: [{ id: 'war_cry', name: '📣 Grito de Guerra', desc: 'Todos los aliados reciben +2 al ataque durante 1 ronda.', cost: 0, type: 'buff', dice: null }],
      8: [{ id: 'champion_crit', name: '💥 Golpe Crítico Ampliado', desc: 'Crítico con 19 o 20 en el dado.', cost: 0, type: 'passive', dice: null }],
      10: [{ id: 'unbreakable', name: '🏔️ Inquebrantable', desc: 'Cuando caes a 0 HP, una vez por día te quedas en 1 HP en su lugar.', cost: 0, type: 'passive', dice: null }],
    },
  },

  mago: {
    name: '🔮 Mago',
    hitDie: 6,
    primaryStat: 'intelligence',
    description: 'Daño mágico devastador. Aprende hechizos poderosos.',
    spellsPerLevel: {
      1: [
        { id: 'magic_missile', name: '✨ Dardo Mágico', desc: 'Lanza 3 dardos que hacen 1d4+1 daño forzado cada uno. Impacto automático.', cost: 1, type: 'damage', dice: '3d4+3' },
        { id: 'fire_bolt', name: '🔥 Rayo de Fuego', desc: 'Ataque mágico a distancia que hace 1d10 daño de fuego.', cost: 1, type: 'damage', dice: '1d10' },
      ],
      2: [{ id: 'burning_hands', name: '🔥🙌 Manos Ardientes', desc: 'Cono de fuego que hace 3d6 daño a todos los enemigos en 5ft.', cost: 2, type: 'aoe', dice: '3d6' }],
      3: [{ id: 'fireball', name: '💣 Bola de Fuego', desc: 'Explosión de 8d6 daño de fuego en un radio de 20ft.', cost: 3, type: 'aoe', dice: '8d6' }],
      4: [{ id: 'polymorph', name: '🐸 Polimorfismo', desc: 'Convierte a un enemigo en una rana inofensiva durante 1 minuto.', cost: 3, type: 'control', dice: null }],
      5: [{ id: 'cone_cold', name: '❄️ Cono de Frío', desc: '8d8 daño de frío en cono. Salvación CON para mitad.', cost: 4, type: 'aoe', dice: '8d8' }],
      6: [{ id: 'disintegrate', name: '💀 Desintegrar', desc: '10d6+40 daño de fuerza a un objetivo. Si muere, queda desintegrado.', cost: 5, type: 'damage', dice: '10d6+40' }],
      8: [{ id: 'power_word_stun', name: '😵 Palabra de Poder: Aturdir', desc: 'Si el objetivo tiene menos de 150 HP, queda aturdido.', cost: 5, type: 'control', dice: null }],
      10: [{ id: 'meteor_swarm', name: '☄️ Lluvia de Meteoros', desc: 'El hechizo definitivo. 20d6 daño de fuego y contundente a todos los enemigos.', cost: 6, type: 'aoe', dice: '20d6' }],
    },
  },

  picaro: {
    name: '🗡️ Pícaro',
    hitDie: 8,
    primaryStat: 'dexterity',
    description: 'Críticos y sigilo. Letal y evasivo.',
    spellsPerLevel: {
      1: [{ id: 'sneak_attack', name: '🎯 Ataque Furtivo', desc: 'Si tienes ventaja o aliado adyacente, +1d6 daño extra por nivel.', cost: 0, type: 'passive', dice: null }],
      2: [{ id: 'cunning_action', name: '🏃 Acción Astuta', desc: 'Puedes Esconderte, Desengancharte o Correr como acción bonus.', cost: 0, type: 'passive', dice: null }],
      3: [{ id: 'evasion', name: '💨 Evasión', desc: 'Si fallas una salvación de DEX tomas la mitad de daño; si la pasas, ninguno.', cost: 0, type: 'passive', dice: null }],
      4: [{ id: 'uncanny_dodge', name: '🛡️ Esquive Increíble', desc: 'Cuando un atacante te ve, usa reacción para reducir el daño a la mitad.', cost: 0, type: 'passive', dice: null }],
      5: [{ id: 'assassinate', name: '💀 Asesinar', desc: 'En el primer turno del combate, tiras con ventaja vs sorprendidos. Crítico automático.', cost: 0, type: 'passive', dice: null }],
      6: [{ id: 'poison_blade', name: '☠️ Filo Envenenado', desc: 'Tu próximo ataque envenena al objetivo: 2d6 daño de veneno por turno.', cost: 1, type: 'debuff', dice: '2d6' }],
      8: [{ id: 'shadowstep', name: '🌑 Paso de Sombra', desc: 'Teletranspórtate entre sombras hasta 60ft. Ventaja en el próximo ataque.', cost: 1, type: 'teleport', dice: null }],
      10: [{ id: 'death_strike', name: '⚰️ Golpe Mortal', desc: 'Si sorprendes al objetivo, hace una tirada de CON CD 15 o dobla el daño recibido.', cost: 0, type: 'passive', dice: null }],
    },
  },

  clerigo: {
    name: '✨ Clérigo',
    hitDie: 8,
    primaryStat: 'wisdom',
    description: 'Sanación y soporte. La columna de cualquier grupo.',
    spellsPerLevel: {
      1: [
        { id: 'cure_wounds', name: '💚 Curar Heridas', desc: 'Recuperas 1d8 + modificador SAB HP al tocado.', cost: 1, type: 'heal', dice: '1d8' },
        { id: 'sacred_flame', name: '🔥 Llama Sagrada', desc: 'Salvación DEX o recibe 1d8 daño radiante. Ignora cobertura.', cost: 1, type: 'damage', dice: '1d8' },
      ],
      2: [{ id: 'spiritual_weapon', name: '⚔️✨ Arma Espiritual', desc: 'Crea un arma flotante de 1d8+SAB daño que ataca como acción bonus.', cost: 2, type: 'summon', dice: '1d8' }],
      3: [
        { id: 'mass_heal', name: '💚💚 Curación en Masa', desc: 'Todos los aliados en 30ft recuperan 1d6+SAB HP.', cost: 2, type: 'aoe_heal', dice: '1d6' },
        { id: 'revivify', name: '💫 Revivir', desc: 'Revive a un aliado muerto hace menos de 1 minuto con 1 HP.', cost: 3, type: 'revive', dice: null },
      ],
      4: [{ id: 'banishment', name: '✝️ Destierro', desc: 'Un no-muerto o aberración falla CON CD 17 o es desterrado al final del turno.', cost: 3, type: 'control', dice: null }],
      5: [{ id: 'flame_strike', name: '🔥⬇️ Columna de Llamas', desc: '4d6 daño de fuego + 4d6 radiante en cilindro de 10ft.', cost: 4, type: 'aoe', dice: '8d6' }],
      6: [{ id: 'guardian_of_faith', name: '👼 Guardián de la Fe', desc: 'Un guardián celestial de 20 HP aparece y ataca a los enemigos que se acerquen.', cost: 4, type: 'summon', dice: null }],
      8: [{ id: 'divine_intervention', name: '🙏 Intervención Divina', desc: '10% de chance + nivel de recibir ayuda divina milagrosa (efectos variables).', cost: 0, type: 'special', dice: null }],
      10: [{ id: 'holy_aura', name: '✨🌟 Aura Sagrada', desc: 'Todos los aliados en 30ft tienen ventaja en salvaciones y los ataques contra ellos tienen desventaja.', cost: 5, type: 'aoe_buff', dice: null }],
    },
  },

  arquero: {
    name: '🏹 Arquero',
    hitDie: 8,
    primaryStat: 'dexterity',
    description: 'Daño a distancia preciso y letal.',
    spellsPerLevel: {
      1: [{ id: 'hunters_mark', name: '🎯 Marca del Cazador', desc: 'Marcas a un objetivo: +1d6 daño cuando lo atacas. Puedes moverla.', cost: 1, type: 'debuff', dice: '1d6' }],
      2: [{ id: 'colossus_slayer', name: '🐘 Matador de Colosos', desc: 'Si el objetivo tiene HP máximo reducido, +1d8 daño adicional por turno.', cost: 0, type: 'passive', dice: null }],
      3: [
        { id: 'volley', name: '🌧️ Lluvia de Flechas', desc: 'Disparas flechas en área de 10ft, afectando a todos en el radio con 1d8 daño.', cost: 2, type: 'aoe', dice: '1d8' },
        { id: 'hail_of_thorns', name: '🌹 Lluvia de Espinas', desc: 'Tu próximo proyectil explota en 5ft: 1d10 daño de perforación a todos.', cost: 1, type: 'aoe', dice: '1d10' },
      ],
      4: [{ id: 'uncanny_sight', name: '👁️ Vista Extraordinaria', desc: 'Ignoras penalizaciones de cobertura y niebla. Ves criaturas invisibles a 30ft.', cost: 0, type: 'passive', dice: null }],
      5: [{ id: 'multishot', name: '🏹🏹 Disparo Múltiple', desc: 'Disparas tres flechas a objetivos diferentes. Cada una hace 1d8+DEX.', cost: 2, type: 'multi_attack', dice: '3d8' }],
      6: [{ id: 'pinning_shot', name: '📌 Disparo Clavador', desc: 'El objetivo debe superar STR CD 15 o queda inmovilizado por 1 ronda.', cost: 1, type: 'control', dice: null }],
      8: [{ id: 'lightning_arrow', name: '⚡ Flecha de Relámpago', desc: 'Tu flecha se convierte en rayo: 4d8 daño eléctrico al objetivo y 2d8 a los adyacentes.', cost: 3, type: 'aoe', dice: '4d8' }],
      10: [{ id: 'arrow_of_slaying', name: '💀 Flecha de la Muerte', desc: 'Si el objetivo tiene menos de 100 HP, hace CON CD 17 o cae a 0 HP.', cost: 4, type: 'instakill', dice: null }],
    },
  },

  barbaro: {
    name: '🪓 Bárbaro',
    hitDie: 12,
    primaryStat: 'strength',
    description: 'Fuerza bruta imparable. Entra en furia devastadora.',
    spellsPerLevel: {
      1: [{ id: 'rage', name: '😡 Furia', desc: 'Entras en furia: +2 daño cuerpo a cuerpo, resistencia a daño físico, ventaja en STR. Dura 1 minuto.', cost: 1, type: 'buff', dice: null }],
      2: [{ id: 'reckless_attack', name: '💥 Ataque Temerario', desc: 'Ventaja en tus ataques este turno. Los ataques contra ti también tienen ventaja.', cost: 0, type: 'risky_buff', dice: null }],
      3: [{ id: 'danger_sense', name: '⚡ Sentido del Peligro', desc: 'Ventaja en salvaciones de DEX contra efectos que puedes ver.', cost: 0, type: 'passive', dice: null }],
      4: [{ id: 'primal_path', name: '🌋 Camino Primigenio', desc: 'Durante la furia, una vez por ronda haces 1d12 daño extra sin acción.', cost: 0, type: 'passive', dice: null }],
      5: [{ id: 'extra_attack_barb', name: '🪓🪓 Ataque Extra', desc: 'Atacas dos veces cuando usas la acción de atacar.', cost: 0, type: 'passive', dice: null }],
      6: [
        { id: 'bear_totem', name: '🐻 Tótem del Oso', desc: 'Durante la furia, resistencia a TODO el daño excepto psíquico.', cost: 0, type: 'passive', dice: null },
        { id: 'wolf_totem', name: '🐺 Tótem del Lobo', desc: 'Durante la furia, los aliados tienen ventaja contra los enemigos adyacentes a ti.', cost: 0, type: 'passive', dice: null },
      ],
      8: [{ id: 'relentless_rage', name: '💢 Furia Incansable', desc: 'Cuando caes a 0 HP en furia, haz CON CD 10. Si la superas, te quedas en 1 HP.', cost: 0, type: 'passive', dice: null }],
      10: [{ id: 'titan_grip', name: '🏋️ Agarre Titánico', desc: 'Puedes blandir armas de dos manos con una sola mano. +1d10 daño al atacar.', cost: 0, type: 'passive', dice: null }],
    },
  },
};

// ─── Funciones ────────────────────────────────────────────────────────────────

function getClass(className) {
  return CLASSES[className.toLowerCase()] || null;
}

function getAllClasses() {
  return CLASSES;
}

/**
 * Devuelve todos los hechizos/habilidades desbloqueados para un nivel dado
 */
function getSpellsForLevel(className, level) {
  const cls = getClass(className);
  if (!cls) return [];
  const spells = [];
  for (let lvl = 1; lvl <= level; lvl++) {
    if (cls.spellsPerLevel[lvl]) {
      spells.push(...cls.spellsPerLevel[lvl]);
    }
  }
  return spells;
}

/**
 * Devuelve los hechizos NUEVOS que se aprenden exactamente al alcanzar ese nivel
 */
function getNewSpellsAtLevel(className, level) {
  const cls = getClass(className);
  if (!cls) return [];
  return cls.spellsPerLevel[level] || [];
}

/**
 * Formatea la lista de hechizos para mostrar en Discord
 */
function formatSpellList(spells) {
  if (!spells || spells.length === 0) return '_Sin hechizos/habilidades_';
  return spells.map(s =>
    `**${s.name}** ${s.cost > 0 ? `(${s.cost} ranuras)` : '(pasivo/acción)'}\n_${s.desc}_`
  ).join('\n');
}

module.exports = {
  CLASSES,
  getClass,
  getAllClasses,
  getSpellsForLevel,
  getNewSpellsAtLevel,
  formatSpellList,
};
