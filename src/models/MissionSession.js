// models/MissionSession.js — PARCHE v2.0
const mongoose = require('mongoose');

const MissionSessionSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
  missionId: { type: String, required: true },
  players: [String],
  currentStep: { type: Number, default: 0 },
  responses: { type: Map, of: Number, default: {} },
  pendingResponses: [String],
  active: { type: Boolean, default: true },
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
});

module.exports = mongoose.model('MissionSession', MissionSessionSchema);
