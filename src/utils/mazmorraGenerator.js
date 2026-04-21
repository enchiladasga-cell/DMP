const { rollDice, roll } = require('./dice');

// ═══════════════════════════════════════════════════════
//  GENERADOR DE MAZMORRAS ALEATORIAS
// ═══════════════════════════════════════════════════════

const TEMAS = ['cripta', 'cueva', 'ruinas', 'fortaleza', 'bosque', 'pantano'];
const ENEMIGOS_POR_TEMA = {
  cripta:     [['Esqueleto', 13, 13, 4, '1d6'], ['Zombi', 22, 22, 8, '1d8'], ['Vampiro Menor', 40, 40, 13, '2d6+2']],
  cueva:      [['Goblin', 7, 7, 13, '1d6'], ['Orco', 30, 30, 13, '1d8+2'], ['Troll', 55, 55, 15, '2d8+3']],
  ruinas:     [['Rata Gigante', 5, 5, 10, '1d4'], ['Bandido', 18, 18, 12, '1d8'], ['Capitan Bandido', 45, 45, 14, '2d6+3']],
  fortaleza:  [['Guardia Corrupto', 15, 15, 14, '1d8'], ['Caballero Oscuro', 40, 40, 16, '1d10+2'], ['General Oscuro', 65, 65, 17, '2d8+4']],
  bosque:     [['Lobo', 11, 11, 13, '1d8'], ['Oso Pardo', 35, 35, 11, '2d6+3'], ['Worg Gigante', 58, 58, 13, '2d8+3']],
  pantano:    [['Serpiente Venenosa', 9, 9, 13, '1d6+veneno'], ['Hidra Joven', 45, 45, 15, '2d8+2'], ['Taumaturgo Pantano', 60, 60, 14, '3d6']],
};

const SALAS = [
  { tipo: 'trampa', textos: ['Una trampa de flechas cubre el pasillo.', 'El suelo tiene baldosas trampa.', 'Una red cae del techo.'] },
  { tipo: 'tesoro', textos: ['Un cofre oxidado en la esquina.', 'Monedas esparcidas en el suelo.', 'Una estatua con gemas incrustadas.'] },
  { tipo: 'misterio', textos: ['Un altar con simbolos desconocidos.', 'Un espejo que muestra otra realidad.', 'Un libro encadenado que susurra.'] },
  { tipo: 'descanso', textos: ['Una habitacion segura con fuego encendido.', 'Un manantial de agua cristalina.', 'Comida y mantas abandonadas.'] },
];

const JEFES_FINALES = [
  { name: 'Lich Menor',        hp: 80,  hpMax: 80,  ca: 16, ataque: 8,  danio: '3d8+4', xpReward: 600 },
  { name: 'Dragon Joven',      hp: 100, hpMax: 100, ca: 17, ataque: 9,  danio: '3d10+4', xpReward: 800 },
  { name: 'Demonio Encadenado',hp: 90,  hpMax: 90,  ca: 16, ataque: 9,  danio: '2d10+5', xpReward: 700 },
  { name: 'Golem de Obsidiana',hp: 110, hpMax: 110, ca: 18, ataque: 8,  danio: '2d12+4', xpReward: 750 },
  { name: 'Vampiro Antiguo',   hp: 95,  hpMax: 95,  ca: 15, ataque: 10, danio: '3d8+5', xpReward: 720 },
];

function generateMazmorra(nivel = 1, zona = 'cueva') {
  const tema = TEMAS.includes(zona) ? zona : TEMAS[Math.floor(Math.random() * TEMAS.length)];
  const enemigos = ENEMIGOS_POR_TEMA[tema] || ENEMIGOS_POR_TEMA.cueva;
  const numSalas = 3 + Math.floor(nivel / 2); // 3-7 salas segun nivel
  const jefe = JEFES_FINALES[Math.floor(Math.random() * JEFES_FINALES.length)];

  // Escalar jefe al nivel
  jefe.hp = Math.floor(jefe.hp * (1 + nivel * 0.15));
  jefe.hpMax = jefe.hp;
  jefe.ataque = jefe.ataque + Math.floor(nivel / 2);
  jefe.xpReward = Math.floor(jefe.xpReward * (1 + nivel * 0.1));

  const nodes = {};
  const nombreMazmorra = generarNombre(tema);

  // Sala inicial
  nodes['inicio'] = {
    type: 'historia',
    text: `🗺️ **${nombreMazmorra}**\n\nOs adentráis en ${describeTema(tema)}. El aire es denso y cada paso resuena.\n\nAntes vosotros hay dos caminos: **izquierda** y **derecha**.`,
    options: [
      { id: 'izq', label: 'Ir a la izquierda', next: 'sala_1' },
      { id: 'der', label: 'Ir a la derecha', next: 'sala_2' },
    ],
  };

  // Generar salas intermedias
  for (let i = 1; i <= numSalas; i++) {
    const roll = Math.random();
    if (roll < 0.4) {
      // Combate
      const enemyTier = Math.min(Math.floor(nivel / 2), 2);
      const enemData = enemigos[enemyTier] || enemigos[0];
      const numEnemies = 1 + Math.floor(Math.random() * 2);
      const enemies = Array(numEnemies).fill(null).map(() => ({
        name: enemData[0],
        hp: enemData[1], hpMax: enemData[2],
        ca: enemData[3], ataque: 3 + Math.floor(nivel / 2),
        danio: enemData[4],
        xpReward: 50 + nivel * 20,
      }));
      nodes[`sala_${i}`] = {
        type: 'combate',
        text: `⚔️ ¡${numEnemies > 1 ? `${numEnemies} ${enemData[0]}s atacan` : `Un ${enemData[0]} bloquea el paso`}!`,
        enemies,
        nextOnWin: i < numSalas ? `sala_${i + 1}` : 'sala_jefe',
        nextOnLoss: 'derrota',
      };
    } else if (roll < 0.55) {
      // Trampa
      const sala = SALAS[0];
      const texto = sala.textos[Math.floor(Math.random() * sala.textos.length)];
      nodes[`sala_${i}`] = {
        type: 'tirada',
        text: `⚠️ ${texto}\n\n🎲 **Tirada de PERCEPCION (SAB) DC ${12 + nivel}** para evitar el daño.`,
        skill: 'sabiduria', dc: 12 + nivel,
        successNext: i < numSalas ? `sala_${i + 1}` : 'sala_jefe',
        failNext: i < numSalas ? `sala_${i + 1}` : 'sala_jefe',
        successText: '✅ Evitais la trampa sin problemas.',
        failText: `❌ La trampa se activa. ${1 + nivel}d4 daño a todo el grupo.`,
        damage: `${1 + nivel}d4`,
      };
    } else if (roll < 0.7) {
      // Tesoro
      const sala = SALAS[1];
      const texto = sala.textos[Math.floor(Math.random() * sala.textos.length)];
      const goldBonus = 10 + nivel * 15;
      nodes[`sala_${i}`] = {
        type: 'historia',
        text: `💰 ${texto}\n\nEl grupo encuentra **${goldBonus} monedas de oro**.`,
        bonusGold: goldBonus,
        options: [{ id: 'cont', label: 'Continuar avanzando', next: i < numSalas ? `sala_${i + 1}` : 'sala_jefe' }],
      };
    } else if (roll < 0.85) {
      // Descanso
      const sala = SALAS[3];
      const texto = sala.textos[Math.floor(Math.random() * sala.textos.length)];
      nodes[`sala_${i}`] = {
        type: 'historia',
        text: `🏕️ ${texto}\n\nEl grupo puede descansar brevemente. Todos recuperan **25% de su HP maximo**.`,
        healPercent: 25,
        options: [{ id: 'cont', label: 'Continuar tras descansar', next: i < numSalas ? `sala_${i + 1}` : 'sala_jefe' }],
      };
    } else {
      // Misterio
      const sala = SALAS[2];
      const texto = sala.textos[Math.floor(Math.random() * sala.textos.length)];
      nodes[`sala_${i}`] = {
        type: 'tirada',
        text: `🔮 ${texto}\n\n🎲 **Tirada de ARCANOS (INT) DC ${13 + nivel}** para entender su poder.`,
        skill: 'inteligencia', dc: 13 + nivel,
        successNext: i < numSalas ? `sala_${i + 1}` : 'sala_jefe',
        failNext: i < numSalas ? `sala_${i + 1}` : 'sala_jefe',
        successText: '✅ Comprendeis el artefacto. +50 XP a cada jugador.',
        failText: '❌ El artefacto explota en energia magica. 1d6 daño.',
        bonusXp: 50,
      };
    }
  }

  // Sala del jefe
  nodes['sala_2'] = nodes['sala_2'] || nodes['sala_1'];
  nodes['sala_jefe'] = {
    type: 'historia',
    text: `💀 Llegáis a la **Sala del Trono**. Ante vosotros, el guardián definitivo de esta mazmorra se levanta...\n\n**¡${jefe.name} os desafía!**`,
    options: [{ id: 'luchar', label: `⚔️ Luchar contra ${jefe.name}`, next: 'combate_jefe' }],
  };

  nodes['combate_jefe'] = {
    type: 'combate',
    text: `💀 **${jefe.name.toUpperCase()}** — El jefe final de esta mazmorra.`,
    enemies: [jefe],
    nextOnWin: 'victoria',
    nextOnLoss: 'derrota',
    isBoss: true,
  };

  nodes['victoria'] = {
    type: 'fin', success: true,
    text: `🏆 **${jefe.name}** cae derrotado. La mazmorra tiembla y el techo comienza a ceder.\n\n¡Corred hacia la salida con vuestro botin!\n\n✨ **MAZMORRA COMPLETADA**`,
    xpReward: 300 + nivel * 100,
    goldReward: { min: 50 + nivel * 20, max: 100 + nivel * 40 },
    lootRolls: 2,
    isBoss: true,
  };

  nodes['derrota'] = {
    type: 'fin', success: false,
    text: `💀 La oscuridad os consume. Despertais fuera de la mazmorra, sin recuerdos de lo ocurrido dentro.\n\n*La mazmorra sigue esperando.*`,
    xpReward: 50,
    goldReward: { min: 0, max: 20 },
  };

  return {
    id: 'mazmorra_aleatoria',
    title: `🎲 ${nombreMazmorra}`,
    duration: 'media',
    description: `Una mazmorra generada aleatoriamente. Nivel recomendado: ${nivel}+`,
    minPlayers: 2, maxPlayers: 6,
    recommendedLevel: nivel,
    tema,
    map: generarMapa(tema, numSalas),
    nodes,
  };
}

function generarNombre(tema) {
  const prefijos = { cripta: ['Cripta de', 'Tumba de', 'Catacumba de'], cueva: ['Cueva de', 'Gruta de', 'Caverna de'], ruinas: ['Ruinas de', 'Restos de', 'Escombros de'], fortaleza: ['Fortaleza de', 'Castillo de', 'Torre de'], bosque: ['Bosque de', 'Arboleda de', 'Espesura de'], pantano: ['Pantano de', 'Marisma de', 'Ciénaga de'] };
  const sufijos = ['los Condenados', 'la Oscuridad Eterna', 'los Olvidados', 'la Muerte Antigua', 'el Terror Sin Nombre', 'las Almas Perdidas', 'la Sombra Viviente'];
  const pref = prefijos[tema] || prefijos.cueva;
  return `${pref[Math.floor(Math.random() * pref.length)]} ${sufijos[Math.floor(Math.random() * sufijos.length)]}`;
}

function describeTema(tema) {
  const desc = { cripta: 'una cripta antigua y húmeda', cueva: 'una cueva oscura y profunda', ruinas: 'unas ruinas cubiertas de musgo', fortaleza: 'una fortaleza en ruinas', bosque: 'un bosque denso y maldito', pantano: 'un pantano de aguas negras' };
  return desc[tema] || 'un lugar oscuro';
}

function generarMapa(tema, numSalas) {
  const emojis = { cripta: '💀', cueva: '🪨', ruinas: '🏚️', fortaleza: '🏰', bosque: '🌲', pantano: '🌿' };
  const e = emojis[tema] || '❓';
  return `
╔═══════════════════════╗
║  ${e} MAZMORRA ALEATORIA ${e}  ║
║  [ENTRADA]            ║
║    ├─[SALA 1]         ║
║    ├─[SALA 2]         ║
║   ...${numSalas} salas...    ║
║    └─[JEFE FINAL]     ║
╚═══════════════════════╝`;
}

module.exports = { generateMazmorra };
