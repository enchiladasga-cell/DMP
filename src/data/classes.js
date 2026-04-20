const CLASSES = {
  guerrero: {
    name: 'Guerrero', emoji: '⚔️', hitDie: 10,
    description: 'Maestro del combate cuerpo a cuerpo. Tanque y daño físico.',
    primaryStat: 'fuerza', armorProficiency: 'pesada',
    stats: { fuerza: 16, destreza: 12, constitucion: 15, inteligencia: 8, sabiduria: 10, carisma: 10 },
    startingGold: 15,
    startingItems: [
      { name: 'Espada Larga', type: 'arma', rarity: 'comun', bonus: 0, description: '1d8 cortante. Versatil (1d10 a dos manos).', equipped: true },
      { name: 'Cota de Malla', type: 'armadura', rarity: 'comun', bonus: 0, description: 'CA 16. Desventaja en Sigilo.', equipped: true },
    ],
    abilities: ['Segundo Aliento (1/descanso): Recupera 1d10+nivel PG', 'Oleada de Accion (nivel 2): Accion extra una vez por descanso'],
    tutorial: '⚔️ Guerrero: Tienes el mayor HP y armadura. En combate tu tirada de ataque usa FUE (+3). Eres la primera linea.',
  },
  mago: {
    name: 'Mago', emoji: '🔮', hitDie: 6,
    description: 'Lanzador de hechizos poderosos. Fragil pero devastador.',
    primaryStat: 'inteligencia', armorProficiency: 'ninguna',
    stats: { fuerza: 8, destreza: 14, constitucion: 10, inteligencia: 17, sabiduria: 12, carisma: 11 },
    startingGold: 10,
    startingItems: [
      { name: 'Baculo Arcano', type: 'arma', rarity: 'comun', bonus: 0, description: '1d6 contundente. Foco arcano.', equipped: true },
      { name: 'Libro de Hechizos', type: 'misc', rarity: 'comun', bonus: 0, description: 'Contiene tus hechizos. No lo pierdas.', equipped: false },
    ],
    abilities: ['Bola de Fuego (3d6), Rayo (2d6), Misil Magico (3x1d4+1 automatico)', 'Recuperacion Arcana (nivel 2): Recupera ranuras en descanso corto'],
    tutorial: '🔮 Mago: Poco HP pero gran poder. Tus hechizos usan INT (+4). Misil Magico nunca falla. Mantente lejos del cuerpo a cuerpo.',
  },
  picaro: {
    name: 'Picaro', emoji: '🗡️', hitDie: 8,
    description: 'Especialista en sigilo y ataques criticos.',
    primaryStat: 'destreza', armorProficiency: 'ligera',
    stats: { fuerza: 10, destreza: 17, constitucion: 12, inteligencia: 13, sabiduria: 10, carisma: 13 },
    startingGold: 12,
    startingItems: [
      { name: 'Daga', type: 'arma', rarity: 'comun', bonus: 0, description: '1d4 perforante. Arrojadiza.', equipped: true },
      { name: 'Armadura de Cuero', type: 'armadura', rarity: 'comun', bonus: 0, description: 'CA 11 + mod DEX.', equipped: true },
    ],
    abilities: ['Ataque Furtivo: +2d6 dano si tienes ventaja o aliado adyacente', 'Accion Astuta: Accion adicional para Esconderse o Correr'],
    tutorial: '🗡️ Picaro: Tu Ataque Furtivo hace dano enorme. Para activarlo necesitas ventaja (flanquear con aliado).',
  },
  clerigo: {
    name: 'Clerigo', emoji: '✨', hitDie: 8,
    description: 'Sanador y protector del grupo.',
    primaryStat: 'sabiduria', armorProficiency: 'media',
    stats: { fuerza: 13, destreza: 10, constitucion: 14, inteligencia: 10, sabiduria: 17, carisma: 13 },
    startingGold: 10,
    startingItems: [
      { name: 'Maza', type: 'arma', rarity: 'comun', bonus: 0, description: '1d6 contundente.', equipped: true },
      { name: 'Cota de Escamas', type: 'armadura', rarity: 'comun', bonus: 0, description: 'CA 14 + mod DEX (max 2).', equipped: true },
    ],
    abilities: ['Curar Heridas: 1d8 + SAB de recuperacion de PG', 'Destierro de No-Muertos: Los no-muertos debiles huyen'],
    tutorial: '✨ Clerigo: Eres el corazon del grupo. Prioriza curar aliados bajo el 50% HP. Puedes atacar con SAB (+4).',
  },
  arquero: {
    name: 'Arquero', emoji: '🏹', hitDie: 8,
    description: 'Combatiente a distancia. Dano constante desde posicion segura.',
    primaryStat: 'destreza', armorProficiency: 'ligera',
    stats: { fuerza: 11, destreza: 17, constitucion: 13, inteligencia: 11, sabiduria: 14, carisma: 10 },
    startingGold: 12,
    startingItems: [
      { name: 'Arco Largo', type: 'arma', rarity: 'comun', bonus: 0, description: '1d8 perforante. Alcance 150/600 ft.', equipped: true },
      { name: 'Armadura de Cuero Tachonada', type: 'armadura', rarity: 'comun', bonus: 0, description: 'CA 12 + mod DEX.', equipped: true },
    ],
    abilities: ['Ataque Multiple (nivel 2): Dispara 2 flechas por accion', 'Ojo de Aguila: Ventaja en ataques a distancia a mas de 30ft'],
    tutorial: '🏹 Arquero: Mantente lejos de los enemigos. DEX (+4) potencia tus ataques. Nunca ataques a distancia con enemigos adyacentes.',
  },
  barbaro: {
    name: 'Barbaro', emoji: '🪓', hitDie: 12,
    description: 'Fuerza bruta y resistencia. El mayor HP del juego.',
    primaryStat: 'fuerza', armorProficiency: 'media',
    stats: { fuerza: 17, destreza: 13, constitucion: 17, inteligencia: 7, sabiduria: 11, carisma: 9 },
    startingGold: 8,
    startingItems: [
      { name: 'Hacha Grande', type: 'arma', rarity: 'comun', bonus: 0, description: '1d12 cortante. A dos manos.', equipped: true },
      { name: 'Armadura de Pieles', type: 'armadura', rarity: 'comun', bonus: 0, description: 'CA 13 + mod DEX (max 2).', equipped: true },
    ],
    abilities: ['Furia (2/descanso): +2 dano, resistencia a dano fisico, dura 1 minuto', 'Defensa sin Armadura: CA = 10 + DEX + CON'],
    tutorial: '🪓 Barbaro: Activa tu Furia en combates dificiles (recibes la mitad del dano fisico). Con d12 de HP eres el mas resistente.',
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
