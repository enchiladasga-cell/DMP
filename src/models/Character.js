const mongoose = require('mongoose');

const characterSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  name: { type: String, required: true },
  class: { type: String, required: true },
  level: { type: Number, default: 1 },
  xp: { type: Number, default: 0 },
  xpToNext: { type: Number, default: 300 },

  // Stats base (5e simplificado)
  stats: {
    fuerza:      { type: Number, default: 10 },
    destreza:    { type: Number, default: 10 },
    constitucion:{ type: Number, default: 10 },
    inteligencia:{ type: Number, default: 10 },
    sabiduria:   { type: Number, default: 10 },
    carisma:     { type: Number, default: 10 },
  },

  // Combate
  hpMax: { type: Number, default: 10 },
  hp: { type: Number, default: 10 },
  ca: { type: Number, default: 10 }, // Clase de armadura
  bonificadorCompetencia: { type: Number, default: 2 },

  // Recursos
  gold: { type: Number, default: 10 },
  inventory: [{ 
    name: String, 
    type: String, // arma, armadura, pocion, misc
    rarity: String, // comun, infrecuente, raro, epico, legendario
    bonus: Number, 
    description: String,
    equipped: { type: Boolean, default: false }
  }],

  // Progresión
  adventuresCompleted: { type: Number, default: 0 },
  totalKills: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

characterSchema.virtual('modifier').get(function() {
  // Retorna modificadores de stats
  const mods = {};
  for (const [stat, val] of Object.entries(this.stats)) {
    mods[stat] = Math.floor((val - 10) / 2);
  }
  return mods;
});

module.exports = mongoose.model('Character', characterSchema);
