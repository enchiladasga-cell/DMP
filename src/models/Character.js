const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  rarity: { type: String, default: 'comun' },
  bonus: { type: Number, default: 0 },
  description: { type: String, default: '' },
  equipped: { type: Boolean, default: false },
}, { _id: false });

const characterSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  name: { type: String, required: true },
  class: { type: String, required: true },
  level: { type: Number, default: 1 },
  xp: { type: Number, default: 0 },
  xpToNext: { type: Number, default: 300 },
  stats: {
    fuerza:       { type: Number, default: 10 },
    destreza:     { type: Number, default: 10 },
    constitucion: { type: Number, default: 10 },
    inteligencia: { type: Number, default: 10 },
    sabiduria:    { type: Number, default: 10 },
    carisma:      { type: Number, default: 10 },
  },
  hpMax: { type: Number, default: 10 },
  hp:    { type: Number, default: 10 },
  ca:    { type: Number, default: 10 },
  bonificadorCompetencia: { type: Number, default: 2 },
  gold: { type: Number, default: 10 },
  inventory: { type: [itemSchema], default: [] },

  // NUEVO: recursos de clase
  resources: {
    rageTurns:     { type: Number, default: 0 },  // Barbaro
    spellSlots:    { type: Number, default: 3 },   // Mago
    healingUses:   { type: Number, default: 3 },   // Clerigo
    secondWind:    { type: Boolean, default: true },// Guerrero
    sneakReady:    { type: Boolean, default: true },// Picaro
  },

  // NUEVO: reputacion con facciones
  reputation: {
    gremio_aventureros: { type: Number, default: 0 },
    reino_norte:        { type: Number, default: 0 },
    orden_magica:       { type: Number, default: 0 },
    ladrones:           { type: Number, default: 0 },
    iglesia_luz:        { type: Number, default: 0 },
  },

  // NUEVO: estadisticas de arena
  arenaWins:   { type: Number, default: 0 },
  arenaLosses: { type: Number, default: 0 },

  // NUEVO: comercio pendiente
  tradeOffer: { type: mongoose.Schema.Types.Mixed, default: null },

  adventuresCompleted: { type: Number, default: 0 },
  totalKills:          { type: Number, default: 0 },
  createdAt:           { type: Date, default: Date.now },
});

module.exports = mongoose.model('Character', characterSchema);
