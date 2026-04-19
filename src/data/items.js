// ─── TABLA DE LOOT ────────────────────────────────────────────────────────────
// dropWeight: peso relativo. Mayor = más probable.

const LOOT_TABLE = {
  // ── POCIONES ──
  pociones: [
    { name: 'Poción de Curación', type: 'pocion', rarity: 'comun', bonus: 0, dropWeight: 40,
      description: 'Recupera 2d4+2 PG al beberla. Acción bonus.' },
    { name: 'Poción de Curación Mayor', type: 'pocion', rarity: 'infrecuente', bonus: 0, dropWeight: 15,
      description: 'Recupera 4d4+4 PG al beberla.' },
    { name: 'Poción de Gigante', type: 'pocion', rarity: 'raro', bonus: 0, dropWeight: 5,
      description: '+4 FUE durante 1 hora.' },
  ],

  // ── ARMAS ──
  armas: [
    { name: 'Espada Corta +1', type: 'arma', rarity: 'infrecuente', bonus: 1, dropWeight: 18,
      description: '1d6+1 perforante. +1 a ataques y daño mágico.' },
    { name: 'Hacha de Batalla +1', type: 'arma', rarity: 'infrecuente', bonus: 1, dropWeight: 15,
      description: '1d8+1 cortante. Versátil (1d10+1).' },
    { name: 'Arco Largo +1', type: 'arma', rarity: 'infrecuente', bonus: 1, dropWeight: 15,
      description: '1d8+1 perforante a distancia.' },
    { name: 'Daga Venenosa', type: 'arma', rarity: 'raro', bonus: 1, dropWeight: 8,
      description: '1d4+1 perforante + 1d6 veneno en cada golpe.' },
    { name: 'Espada Larga +2', type: 'arma', rarity: 'raro', bonus: 2, dropWeight: 6,
      description: '1d8+2 cortante. Brilla tenuemente en presencia de no-muertos.' },
    { name: 'Báculo del Mago +1', type: 'arma', rarity: 'raro', bonus: 1, dropWeight: 6,
      description: '+1 a tiradas de ataque y CD de hechizos.' },
    { name: 'Ballesta Repetidora', type: 'arma', rarity: 'raro', bonus: 1, dropWeight: 5,
      description: '1d6+1. Puede disparar dos veces sin recargar.' },

    // ── LEGENDARIAS ──
    { name: '⚔️ Amanecer Eterno', type: 'arma', rarity: 'legendario', bonus: 3, dropWeight: 1,
      description: 'Espada +3. Irradia luz solar. +2d6 daño radiante a no-muertos y demonios. Una vez al día: lanza Rayo de Sol (8d6).' },
    { name: '🗡️ Sombra del Vacío', type: 'arma', rarity: 'legendario', bonus: 3, dropWeight: 1,
      description: 'Daga +3. En las sombras eres invisible. Al herir un objetivo, lo envuelve maldición: -2 a sus tiradas durante 3 turnos.' },
    { name: '🏹 Arco del Cazador Eterno', type: 'arma', rarity: 'legendario', bonus: 3, dropWeight: 1,
      description: 'Arco +3. Las flechas siguen al objetivo (sin penalización por cobertura). +1d8 daño perforante.' },
    { name: '🪓 Furia de Trueno', type: 'arma', rarity: 'legendario', bonus: 3, dropWeight: 1,
      description: 'Hacha +3. Al acertar: el objetivo debe superar CD 15 CON o ser aturdido 1 turno. 1/día: trueno de 6d6 en área.' },
    { name: '🔮 Báculo del Archimago', type: 'arma', rarity: 'legendario', bonus: 3, dropWeight: 1,
      description: 'Báculo +3. +2 a la CD de hechizos. Almacena hasta 10 cargas de hechizo. Recupera 1d6+4 cargas al amanecer.' },
  ],

  // ── ARMADURAS ──
  armaduras: [
    { name: 'Armadura de Cuero +1', type: 'armadura', rarity: 'infrecuente', bonus: 1, dropWeight: 18,
      description: 'CA 12 + DEX + 1.' },
    { name: 'Camisote de Mallas', type: 'armadura', rarity: 'infrecuente', bonus: 1, dropWeight: 15,
      description: 'CA 14 + 1. No requiere entrenamiento especial.' },
    { name: 'Escudo Encantado +1', type: 'armadura', rarity: 'raro', bonus: 1, dropWeight: 10,
      description: '+3 CA total (escudo +1). Reacción: +2 CA adicional contra un ataque.' },
    { name: 'Cota de Malla +2', type: 'armadura', rarity: 'raro', bonus: 2, dropWeight: 6,
      description: 'CA 18. Resistencia a daño cortante.' },
    { name: 'Manto del Pícaro', type: 'armadura', rarity: 'raro', bonus: 1, dropWeight: 6,
      description: 'CA 13 + DEX + 1. Ventaja en pruebas de Sigilo.' },

    // ── LEGENDARIAS ──
    { name: '🛡️ Égida del Dragón Carmesí', type: 'armadura', rarity: 'legendario', bonus: 3, dropWeight: 1,
      description: 'Armadura de placas +3. CA 21. Resistencia a daño de fuego. 1/día: escudo de llamas que devuelve 2d6 a quien te golpee.' },
    { name: '🌑 Manto de Estrellas', type: 'armadura', rarity: 'legendario', bonus: 2, dropWeight: 1,
      description: 'Manto ligero. CA 14 + DEX + 2. 3/día: Teletransportación de hasta 30 pies. Invisible bajo luz de estrellas.' },
    { name: '⛓️ Cadenas del Titán', type: 'armadura', rarity: 'legendario', bonus: 2, dropWeight: 1,
      description: 'Armadura de anillos +2. CA 17. Inmune a efectos de empuje. +4 STR para pruebas de forcejeo.' },
  ],

  // ── OBJETOS MÁGICOS ──
  misc: [
    { name: 'Piedra de Curación', type: 'misc', rarity: 'infrecuente', bonus: 0, dropWeight: 10,
      description: 'Toca a un aliado para curarle 1d6. Se usa 3 veces, luego se agota.' },
    { name: 'Botas de Velocidad', type: 'misc', rarity: 'raro', bonus: 0, dropWeight: 5,
      description: 'Velocidad +10ft. 1/día: Acción adicional de movimiento.' },
    { name: 'Anillo de Protección', type: 'misc', rarity: 'raro', bonus: 1, dropWeight: 5,
      description: '+1 CA y +1 a tiradas de salvación.' },
    { name: '💎 Ojo del Oráculo', type: 'misc', rarity: 'legendario', bonus: 0, dropWeight: 1,
      description: 'Gema legendaria. Ves a través de ilusiones. 1/día: Visión del futuro (ventaja en todas tus tiradas durante 1 turno).' },
  ],
};

// ─── TIENDA ──────────────────────────────────────────────────────────────────
const SHOP_ITEMS = [
  { name: 'Poción de Curación', type: 'pocion', rarity: 'comun', bonus: 0, price: 50,
    description: 'Recupera 2d4+2 PG.' },
  { name: 'Poción de Curación Mayor', type: 'pocion', rarity: 'infrecuente', bonus: 0, price: 150,
    description: 'Recupera 4d4+4 PG.' },
  { name: 'Antídoto', type: 'misc', rarity: 'comun', bonus: 0, price: 50,
    description: 'Cura el estado Envenenado.' },
  { name: 'Daga', type: 'arma', rarity: 'comun', bonus: 0, price: 20,
    description: '1d4 perforante. Arrojadiza.' },
  { name: 'Espada Corta', type: 'arma', rarity: 'comun', bonus: 0, price: 40,
    description: '1d6 perforante.' },
  { name: 'Arco Corto + 20 flechas', type: 'arma', rarity: 'comun', bonus: 0, price: 35,
    description: '1d6 perforante a distancia.' },
  { name: 'Armadura de Cuero', type: 'armadura', rarity: 'comun', bonus: 0, price: 45,
    description: 'CA 11 + DEX.' },
  { name: 'Escudo de Madera', type: 'armadura', rarity: 'comun', bonus: 0, price: 30,
    description: '+2 CA.' },
  { name: 'Cota de Mallas', type: 'armadura', rarity: 'comun', bonus: 0, price: 120,
    description: 'CA 16.' },
  { name: 'Antorcha x5', type: 'misc', rarity: 'comun', bonus: 0, price: 5,
    description: 'Ilumina 20ft. Dura 1 hora.' },
  { name: 'Kit de Sanación', type: 'misc', rarity: 'comun', bonus: 0, price: 25,
    description: 'Estabiliza a un personaje moribundo. 10 usos.' },
];

function rollLoot(difficulty = 'normal', isBoss = false) {
  const results = [];
  const rand = () => Math.random();

  // Probabilidad base de loot por dificultad
  const lootChance = { facil: 0.4, normal: 0.6, dificil: 0.75, jefe: 1.0 };
  const chance = isBoss ? 1.0 : (lootChance[difficulty] || 0.6);

  if (rand() > chance) return results;

  // Número de objetos
  const numItems = isBoss ? Math.floor(rand() * 3) + 2 : (rand() < 0.3 ? 2 : 1);

  const allItems = [...LOOT_TABLE.pociones, ...LOOT_TABLE.armas, ...LOOT_TABLE.armaduras, ...LOOT_TABLE.misc];

  for (let i = 0; i < numItems; i++) {
    // Sistema de peso
    const totalWeight = allItems.reduce((sum, item) => sum + item.dropWeight, 0);
    let roll = rand() * totalWeight;
    for (const item of allItems) {
      roll -= item.dropWeight;
      if (roll <= 0) {
        results.push({ ...item });
        break;
      }
    }
  }

  return results;
}

module.exports = { LOOT_TABLE, SHOP_ITEMS, rollLoot };
