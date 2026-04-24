// commands/terminar_aventura.js — PARCHE v2.0
const { SlashCommandBuilder } = require('discord.js');
const { endAdventure } = require('../utils/sessionManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('terminar_aventura')
    .setDescription('Termina la aventura activa en este canal (sin recompensas)'),

  async execute(interaction) {
    await endAdventure(interaction);
  },
};
