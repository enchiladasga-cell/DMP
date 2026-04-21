const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { generateMazmorra } = require('../utils/mazmorraGenerator');
const { startAdventure } = require('../utils/sessionManager');
const Session = require('../models/Session');
const Character = require('../models/Character');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mazmorra')
    .setDescription('Genera y entra a una mazmorra aleatoria')
    .addStringOption(opt => opt.setName('zona')
      .setDescription('Tipo de mazmorra')
      .setRequired(false)
      .addChoices(
        { name: '💀 Cripta', value: 'cripta' },
        { name: '🪨 Cueva', value: 'cueva' },
        { name: '🏚️ Ruinas', value: 'ruinas' },
        { name: '🏰 Fortaleza', value: 'fortaleza' },
        { name: '🌲 Bosque', value: 'bosque' },
        { name: '🌿 Pantano', value: 'pantano' },
        { name: '🎲 Aleatoria', value: 'aleatoria' },
      ))
    .addUserOption(opt => opt.setName('jugador2').setDescription('Jugador 2').setRequired(false))
    .addUserOption(opt => opt.setName('jugador3').setDescription('Jugador 3').setRequired(false))
    .addUserOption(opt => opt.setName('jugador4').setDescription('Jugador 4').setRequired(false))
    .addUserOption(opt => opt.setName('jugador5').setDescription('Jugador 5').setRequired(false))
    .addUserOption(opt => opt.setName('jugador6').setDescription('Jugador 6').setRequired(false)),

  async execute(interaction, client) {
    const zonaInput = interaction.options.getString('zona') || 'aleatoria';
    const zona = zonaInput === 'aleatoria' ? null : zonaInput;

    // Verificar sesion activa
    const existing = await Session.findOne({ channelId: interaction.channelId, status: { $in: ['activa', 'combate'] } });
    if (existing) return interaction.reply({ content: '❌ Ya hay una aventura activa en este canal.', ephemeral: true });

    // Jugadores
    const playerIds = [interaction.user.id];
    for (let i = 2; i <= 6; i++) {
      const u = interaction.options.getUser(`jugador${i}`);
      if (u && !u.bot && !playerIds.includes(u.id)) playerIds.push(u.id);
    }

    if (playerIds.length < 2) return interaction.reply({ content: '❌ Necesitas al menos 2 jugadores.', ephemeral: true });

    // Calcular nivel promedio del grupo
    let totalLevel = 0;
    for (const uid of playerIds) {
      const char = await Character.findOne({ userId: uid, guildId: interaction.guildId });
      if (char) totalLevel += char.level;
    }
    const avgLevel = Math.round(totalLevel / playerIds.length);

    // Generar mazmorra
    const mazmorra = generateMazmorra(avgLevel, zona);

    // Guardar temporalmente en cliente para esta sesion
    if (!client.tempAdventures) client.tempAdventures = {};
    client.tempAdventures['mazmorra_aleatoria'] = mazmorra;

    const embed = new EmbedBuilder()
      .setColor(0x4a148c)
      .setTitle(`🎲 Mazmorra Generada: ${mazmorra.title}`)
      .setDescription(mazmorra.description)
      .addFields(
        { name: '🗺️ Tema', value: mazmorra.tema.toUpperCase(), inline: true },
        { name: '⚔️ Nivel', value: `${avgLevel}+`, inline: true },
        { name: '👥 Jugadores', value: playerIds.map(id => `<@${id}>`).join(', '), inline: false },
      )
      .setFooter({ text: 'La mazmorra se regenera cada vez que la pides. ¡Nunca es igual!' });

    await interaction.reply({ embeds: [embed] });
    await require('../utils/sessionManager').startAdventureWithData(interaction.channel, mazmorra, playerIds, interaction.guildId, client);
  },
};
