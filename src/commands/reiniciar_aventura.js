// commands/reiniciar_aventura.js — PARCHE v2.0
const { SlashCommandBuilder } = require('discord.js');
const { restartAdventure } = require('../utils/sessionManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reiniciar_aventura')
    .setDescription('Reinicia la aventura activa desde el principio (conserva jugadores)'),

  async execute(interaction) {
    await restartAdventure(interaction);
  },
};
