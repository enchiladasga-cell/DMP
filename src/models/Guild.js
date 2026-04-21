const mongoose = require('mongoose');

const guildSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  world: {
    unlockedZones: { type: [String], default: ['valle_inicio'] },
    currentEvents: [{ id: String, name: String, endsAt: Date }],
    totalAdventuresCompleted: { type: Number, default: 0 },
    totalBossesDefeated: { type: Number, default: 0 },
    worldLevel: { type: Number, default: 1 },
  },
  factions: {
    gremio_aventureros: { type: Number, default: 0 },
    reino_norte:        { type: Number, default: 0 },
    orden_magica:       { type: Number, default: 0 },
    ladrones:           { type: Number, default: 0 },
    iglesia_luz:        { type: Number, default: 0 },
  },
  arena: {
    seasonWins: { type: Map, of: Number, default: {} },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Guild', guildSchema);
