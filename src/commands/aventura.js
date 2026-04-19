const { SlashCommandBuilder } = require('discord.js');
const { ADVENTURES } = require('../data/adventures');
const { startAdventure } = require('../utils/sessionManager');
const Session = require('../models/Session');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('aventura')
    .setDescription('Inicia una aventura')
    .addStringOption(opt => opt.setName('id')
      .setDescription('ID de la aventura (usa /lista_aventuras para ver IDs)')
      .setRequired(true)
      .addChoices(
        { name: '🍺 La Taberna Maldita (Corta)', value: 'taberna_maldita' },
        { name: '⛏️ La Mina de los Olvidados (Media)', value: 'mina_abandonada' },
        { name: '💀 La Torre del Lich (Larga)', value: 'torre_del_lich' },
      ))
    .addUserOption(opt => opt.setName('jugador2').setDescription('Jugador 2').setRequired(false))
    .addUserOption(opt => opt.setName('jugador3').setDescription('Jugador 3').setRequired(false))
    .addUserOption(opt => opt.setName('jugador4').setDescription('Jugador 4').setRequired(false))
    .addUserOption(opt => opt.setName('jugador5').setDescription('Jugador 5').setRequired(false))
    .addUserOption(opt => opt.setName('jugador6').setDescription('Jugador 6').setRequired(false)),

  async execute(interaction, client) {
    const advId = interaction.options.getString('id');
    const adventure = ADVENTURES[advId];
    if (!adventure) return interaction.reply({ content: '❌ Aventura no encontrada.', ephemeral: true });

    // Verificar que no hay sesión activa en este canal
    const existing = await Session.findOne({ channelId: interaction.channelId, status: { $in: ['activa', 'combate', 'esperando_jugadores'] } });
    if (existing) return interaction.reply({ content: '❌ Ya hay una aventura activa en este canal. Espera a que termine.', ephemeral: true });

    // Reunir jugadores
    const playerIds = [interaction.user.id];
    for (let i = 2; i <= 6; i++) {
      const u = interaction.options.getUser(`jugador${i}`);
      if (u && !u.bot && !playerIds.includes(u.id)) playerIds.push(u.id);
    }

    if (playerIds.length < adventure.minPlayers) {
      return interaction.reply({ content: `❌ Esta aventura requiere al menos **${adventure.minPlayers} jugadores**. Actualmente: ${playerIds.length}.`, ephemeral: true });
    }
    if (playerIds.length > adventure.maxPlayers) {
      return interaction.reply({ content: `❌ Máximo **${adventure.maxPlayers} jugadores** para esta aventura.`, ephemeral: true });
    }

    await startAdventure(interaction, advId, playerIds, client);
  },
};
