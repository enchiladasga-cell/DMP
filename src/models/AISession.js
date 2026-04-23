const mongoose = require('mongoose');

const aiSessionSchema = new mongoose.Schema({
  guildId:   { type: String, required: true },
  channelId: { type: String, required: true },
  adventureId: { type: String, required: true },
  adventureTitle: { type: String, default: 'Aventura' },
  status: {
    type: String,
    enum: ['activa', 'esperando_acciones', 'procesando', 'combate', 'pausada', 'completada', 'fallida'],
    default: 'activa',
  },

  // Jugadores en la sesion
  players: [{
    userId:      String,
    characterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Character' },
    hp:          Number,
    isAlive:     { type: Boolean, default: true },
    hasActed:    { type: Boolean, default: false },
    currentAction: { type: String, default: null },
  }],

  // Escena actual
  currentScene: { type: String, default: 'intro' },
  sceneContext:  { type: String, default: '' },

  // Historial de conversacion para GPT (contexto)
  conversationHistory: [{
    role:    { type: String, enum: ['system', 'user', 'assistant'] },
    content: String,
  }],

  // Combate activo (si hay)
  currentCombat: {
    enemies: [{
      name: String, hp: Number, hpMax: Number,
      ca: Number, ataque: Number, danio: String, xpReward: Number,
    }],
    turn:        { type: Number, default: 0 },
    playerOrder: [String],
  },

  // Datos de la aventura generada por IA
  aiAdventureData: { type: mongoose.Schema.Types.Mixed, default: null },

  // Tirada pendiente
  pendingRoll: {
    stat: String,
    dc:   Number,
    context: String,
  },

  // Checkpoint
  checkpoint: { savedAt: Date, savedByUser: String },

  actionDeadline: { type: Date },
  createdAt:      { type: Date, default: Date.now },
  updatedAt:      { type: Date, default: Date.now },
});

module.exports = mongoose.model('AISession', aiSessionSchema);
