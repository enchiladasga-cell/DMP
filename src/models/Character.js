// models/Character.js — PARCHE v2.0
// Añadido: checkLevelUp() con notificación de nuevos hechizos
// Los XP necesarios siguen la curva D&D 5e simplificada

const mongoose = require('mongoose');
const { getNewSpellsAtLevel } = require('../data/classes');

// XP necesario para llegar a cada nivel (acumulado)
const XP_THRESHOLDS = {
  1: 0,
  2: 300,
  3: 900,
  4: 2700,
  5: 6500,
  6: 14000,
  7: 23000,
  8: 34000,
  9: 48000,
  10: 64000,
};

const HIT_DICE = {
  guerrero: 10,
  mago: 6,
  picaro: 8,
  clerigo: 8,
  arquero: 8,
  barbaro: 12,
};

const CharacterSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  name: { type: String, required: true },
  class: { type: String, required: true },
  level: { type: Number, default: 1 },
  xp: { type: Number, default: 0 },
  hp: { type: Number, default: 10 },
  maxHp: { type: Number, default: 10 },
  ac: { type: Number, default: 10 },
  gold: { type: Number, default: 50 },
  attackBonus: { type: Number, default: 2 },
  damageDice: { type: String, default: '1d6' },
  inventory: [{ type: String }],
  equipment: {
    weapon: { type: String, default: null },
    armor: { type: String, default: null },
  },
  spellSlots: { type: Number, default: 0 },      // ranuras de hechizo disponibles
  maxSpellSlots: { type: Number, default: 0 },
  newSpells: [{ type: String }],                  // IDs de hechizos recién aprendidos (notificación)
  createdAt: { type: Date, default: Date.now },
});

// ─── Método: subir de nivel ───────────────────────────────────────────────────

CharacterSchema.methods.checkLevelUp = async function () {
  const leveledUp = [];

  while (true) {
    const nextLevel = this.level + 1;
    if (nextLevel > 10) break; // máximo nivel 10
    const xpNeeded = XP_THRESHOLDS[nextLevel];
    if (!xpNeeded || this.xp < xpNeeded) break;

    // Subir de nivel
    this.level = nextLevel;

    // Aumentar HP (dado de vida + CON mod simplificado = die/2 + 1)
    const hpGain = Math.floor(HIT_DICE[this.class] / 2) + 1;
    this.maxHp += hpGain;
    this.hp = Math.min(this.hp + hpGain, this.maxHp);

    // Aumentar bonificador de ataque cada 2 niveles
    if (nextLevel % 2 === 0) this.attackBonus += 1;

    // Aumentar ranuras de hechizo para clases mágicas
    if (['mago', 'clerigo'].includes(this.class)) {
      const slotGain = nextLevel <= 5 ? 1 : 2;
      this.maxSpellSlots += slotGain;
      this.spellSlots = this.maxSpellSlots;
    } else if (['picaro', 'arquero'].includes(this.class) && nextLevel >= 3) {
      // Pícaro/arquero consiguen ranuras limitadas para sus "trucos"
      this.maxSpellSlots = Math.floor(nextLevel / 3);
      this.spellSlots = this.maxSpellSlots;
    }

    // Nuevos hechizos al subir de nivel
    const newSpells = getNewSpellsAtLevel(this.class, nextLevel);
    if (newSpells.length > 0) {
      this.newSpells = [...(this.newSpells || []), ...newSpells.map(s => s.id)];
    }

    leveledUp.push({ level: nextLevel, hpGain, newSpells });
  }

  return leveledUp; // devuelve info de subidas para notificar en Discord
};

// ─── Método: restaurar tras descanso ─────────────────────────────────────────

CharacterSchema.methods.rest = function (type = 'long') {
  if (type === 'long') {
    this.hp = this.maxHp;
    this.spellSlots = this.maxSpellSlots;
  } else {
    // Descanso corto: recupera 1d6 HP
    const roll = Math.floor(Math.random() * 6) + 1;
    this.hp = Math.min(this.hp + roll, this.maxHp);
  }
};

// Índice único por usuario+servidor
CharacterSchema.index({ userId: 1, guildId: 1 }, { unique: true });

module.exports = mongoose.model('Character', CharacterSchema);
