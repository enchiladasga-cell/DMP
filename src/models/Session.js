const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  guildId:     { type: String, required: true },
  channelId:   { type: String, required: true },
  adventureId: { type: String, required: true },
  status: {
    type: String,
    enum: ['esperando_jugadores', 'activa', 'combate', 'pausada', 'completada', 'fallida'],
    default: 'esperando_jugadores',
  },
  players: [{
    userId:       String,
    characterId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Character' },
    hp:           Number,
    tempEffects:  [String],
    hasActed:     { type: Boolean, default: false },
    vote:         String,
    isAlive:      { type: Boolean, default: true },
  }],
  currentNode: { type: String, default: 'inicio' },
  currentCombat: {
    enemies: [{
      name: String, hp: Number, hpMax: Number,
      ca: Number, ataque: Number, danio: String, xpReward: Number,
    }],
    turn:        { type: Number, default: 0 },
    playerOrder: [String],
    enemyTurn:   { type: Boolean, default: false },
  },
  flags:    { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
  lootPool: [{ name: String, rarity: String, type: String, bonus: Number, description: String }],

  // NUEVO: checkpoint de guardado
  checkpoint: {
    savedAt:     Date,
    savedByUser: String,
    nodeId:      String,
    playerHPs:   { type: Map, of: Number, default: {} },
  },

  lastActionAt: { type: Date, default: Date.now },
  turnDeadline: { type: Date },
  createdAt:    { type: Date, default: Date.now },
});

module.exports = mongoose.model('Session', sessionSchema);
