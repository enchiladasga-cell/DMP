const CLASSES = {
  guerrero: {
    name: 'Guerrero',
    emoji: '⚔️',
    hitDie: 10,
    description: 'Maestro del combate cuerpo a cuerpo. Tanque y daño físico.',
    primaryStat: 'fuerza',
    armorProficiency: 'pesada',
    stats: { fuerza: 16, destreza: 12, constitucion: 15, inteligencia: 8, sabiduria: 10, carisma: 10 },
    startingGold: 15,
    startingItems: [
      { name: 'Espada Larga', type: 'arma', rarity: 'comun', bonus: 0, description: '1d8 cortante. Versátil (1d10 a dos manos).' },
      { name: 'Cota de Malla', type: 'armadura', rarity: 'comun', bonus: 0, description: 'CA 16. Desventaja en Sigilo.' },
    ],
    abilities: ['Segundo Aliento (1/descanso): Recupera 1d10+nivel PG', 'Oleada de Acción (nivel 2): Acción extra una vez por descanso'],
    tutorial: '⚔️ **Guerrero**: Tienes el mayor HP y armadura. En combate, tu tirada de ataque usa tu modificador de FUE (+3). ¡Eres la primera línea!',
  },

  mago: {
    name: 'Mago',
    emoji: '🔮',
    hitDie: 6,
    description: 'Lanzador de hechizos poderosos. Frágil pero devastador.',
    primaryStat: 'inteligencia',
    armorProficiency: 'ninguna',
    stats: { fuerza: 8, destreza: 14, constitucion: 10, inteligencia: 17, sabiduria: 12, carisma: 11 },
    startingGold: 10,
    startingItems: [
      { name: 'Báculo Arcano', type: 'arma', rarity: 'comun', bonus: 0, description: '1d6 contundente. Puede usarse como foco.' },
      { name: 'Libro de Hechizos', type: 'misc', rarity: 'comun', bonus: 0, description: 'Contiene tus hechizos. No lo pierdas.' },
    ],
    abilities: [
      'Lanzar Hechizo: Bola de Fuego (3d6), Rayo (2d6), Misil Mágico (3x1d4+1 automático)',
      'Recuperación Arcana (nivel 2): Recupera ranuras de hechizo en descanso corto',
    ],
    tutorial: '🔮 **Mago**: Poco HP pero gran poder. Tus hechizos usan INT (+4). Misil Mágico **nunca falla**. Mantente lejos del combate cuerpo a cuerpo.',
  },

  picaro: {
    name: 'Pícaro',
    emoji: '🗡️',
    hitDie: 8,
    description: 'Especialista en sigilo y ataques críticos. Daño explosivo.',
    primaryStat: 'destreza',
    armorProficiency: 'ligera',
    stats: { fuerza: 10, destreza: 17, constitucion: 12, inteligencia: 13, sabiduria: 10, carisma: 13 },
    startingGold: 12,
    startingItems: [
      { name: 'Daga x2', type: 'arma', rarity: 'comun', bonus: 0, description: '1d4 perforante. Arrojadiza (20/60 ft).' },
      { name: 'Armadura de Cuero', type: 'armadura', rarity: 'comun', bonus: 0, description: 'CA 11 + mod. DEX.' },
    ],
    abilities: [
      'Ataque Furtivo: +2d6 daño si tienes ventaja o un aliado adyacente al objetivo',
      'Acción Astuta: Acción adicional para Esconderse, Correr o Desengancharse',
    ],
    tutorial: '🗡️ **Pícaro**: Tu Ataque Furtivo hace un daño enorme. Para activarlo necesitas ventaja (flanquear con aliado). ¡Posiciónate bien!',
  },

  clerigo: {
    name: 'Clérigo',
    emoji: '✨',
    hitDie: 8,
    description: 'Sanador y protector del grupo. Indispensable en aventuras largas.',
    primaryStat: 'sabiduria',
    armorProficiency: 'media',
    stats: { fuerza: 13, destreza: 10, constitucion: 14, inteligencia: 10, sabiduria: 17, carisma: 13 },
    startingGold: 10,
    startingItems: [
      { name: 'Maza', type: 'arma', rarity: 'comun', bonus: 0, description: '1d6 contundente.' },
      { name: 'Cota de Escamas', type: 'armadura', rarity: 'comun', bonus: 0, description: 'CA 14 + mod DEX (máx 2).' },
    ],
    abilities: [
      'Curar Heridas: 1d8 + modificador SAB de recuperación de PG',
      'Palabra de Curación Masiva (nivel 2): Cura a todos los aliados visibles por 1d4+SAB',
      'Destierro de No-Muertos: Los no-muertos débiles huyen',
    ],
    tutorial: '✨ **Clérigo**: Eres el corazón del grupo. Prioriza curar a aliados que estén por debajo del 50% HP. También puedes atacar con SAB (+4).',
  },

  arquero: {
    name: 'Arquero',
    emoji: '🏹',
    hitDie: 8,
    description: 'Combatiente a distancia. Daño constante desde posición segura.',
    primaryStat: 'destreza',
    armorProficiency: 'ligera',
    stats: { fuerza: 11, destreza: 17, constitucion: 13, inteligencia: 11, sabiduria: 14, carisma: 10 },
    startingGold: 12,
    startingItems: [
      { name: 'Arco Largo + 20 Flechas', type: 'arma', rarity: 'comun', bonus: 0, description: '1d8 perforante. Alcance 150/600 ft.' },
      { name: 'Armadura de Cuero Tachonada', type: 'armadura', rarity: 'comun', bonus: 0, description: 'CA 12 + mod DEX.' },
    ],
    abilities: [
      'Ataque Múltiple (nivel 2): Dispara 2 flechas por acción',
      'Ojo de Águila: Ventaja en ataques a distancia contra objetivos a más de 30ft',
    ],
    tutorial: '🏹 **Arquero**: Mantente lejos de los enemigos. Tu DEX (+4) potencia tus ataques. Nunca hagas ataques a distancia si hay un enemigo adyacente (desventaja).',
  },

  barbaro: {
    name: 'Bárbaro',
    emoji: '🪓',
    hitDie: 12,
    description: 'Fuerza bruta y resistencia. El mayor HP del juego.',
    primaryStat: 'fuerza',
    armorProficiency: 'media',
    stats: { fuerza: 17, destreza: 13, constitucion: 17, inteligencia: 7, sabiduria: 11, carisma: 9 },
    startingGold: 8,
    startingItems: [
      { name: 'Hacha Grande', type: 'arma', rarity: 'comun', bonus: 0, description: '1d12 cortante. Pesada, A dos manos.' },
      { name: 'Armadura de Pieles', type: 'armadura', rarity: 'comun', bonus: 0, description: 'CA 13 + mod DEX (máx 2).' },
    ],
    abilities: [
      'Furia (2/descanso): +2 daño cuerpo a cuerpo, resistencia a daño físico, dura 1 minuto',
      'Defensa sin Armadura: CA = 10 + DEX + CON (sin armadura)',
    ],
    tutorial: '🪓 **Bárbaro**: Activa tu Furia en combates difíciles (recibes la mitad del daño físico). Con d12 de HP eres el más resistente. ¡Lánzate al frente!',
  },
};

const XP_TABLE = {
  1: 0, 2: 300, 3: 900, 4: 2700, 5: 6500,
  6: 14000, 7: 23000, 8: 34000, 9: 48000, 10: 64000,
};

const PROFICIENCY_BONUS = {
  1: 2, 2: 2, 3: 2, 4: 2, 5: 3,
  6: 3, 7: 3, 8: 3, 9: 4, 10: 4,
};

function getModifier(score) {
  return Math.floor((score - 10) / 2);
}

function checkLevelUp(character) {
  const nextLevel = character.level + 1;
  if (nextLevel > 10) return null;
  const xpNeeded = XP_TABLE[nextLevel];
  if (character.xp >= xpNeeded) return nextLevel;
  return null;
}

function applyLevelUp(character, classData) {
  const newLevel = character.level + 1;
  const hpGain = Math.ceil(classData.hitDie / 2) + getModifier(character.stats.constitucion);
  character.level = newLevel;
  character.hpMax += Math.max(1, hpGain);
  character.hp = character.hpMax;
  character.bonificadorCompetencia = PROFICIENCY_BONUS[newLevel];
  character.xpToNext = XP_TABLE[newLevel + 1] || 999999;
  return { newLevel, hpGain: Math.max(1, hpGain) };
}

module.exports = { CLASSES, XP_TABLE, PROFICIENCY_BONUS, getModifier, checkLevelUp, applyLevelUp };
