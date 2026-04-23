const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { generateAIAdventure } = require('../utils/dmAI');
const { startAIAdventure } = require('../utils/aiSessionManager');
const AISession = require('../models/AISession');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('aventura_ia')
    .setDescription('Inicia una aventura narrativa con IA como Dungeon Master')
    .addStringOption(opt => opt.setName('tema')
      .setDescription('Tema o idea para la aventura (ej: "piratas", "dragón en las montañas")')
      .setRequired(true))
    .addUserOption(opt => opt.setName('jugador2').setDescription('Jugador 2').setRequired(false))
    .addUserOption(opt => opt.setName('jugador3').setDescription('Jugador 3').setRequired(false))
    .addUserOption(opt => opt.setName('jugador4').setDescription('Jugador 4').setRequired(false))
    .addUserOption(opt => opt.setName('jugador5').setDescription('Jugador 5').setRequired(false))
    .addUserOption(opt => opt.setName('jugador6').setDescription('Jugador 6').setRequired(false)),

  async execute(interaction, client) {
    const tema = interaction.options.getString('tema');

    // Verificar sesión activa
    const existing = await AISession.findOne({ channelId: interaction.channelId, status: { $in: ['activa', 'esperando_acciones', 'combate'] } });
    if (existing) return interaction.reply({ content: '❌ Ya hay una aventura activa en este canal.', ephemeral: true });

    // Reunir jugadores
    const playerIds = [interaction.user.id];
    for (let i = 2; i <= 6; i++) {
      const u = interaction.options.getUser(`jugador${i}`);
      if (u && !u.bot && !playerIds.includes(u.id)) playerIds.push(u.id);
    }

    if (playerIds.length < 2) return interaction.reply({ content: '❌ Necesitas al menos 2 jugadores para una aventura IA.', ephemeral: true });

    await interaction.deferReply();

    try {
      // Nivel promedio del grupo
      const Character = require('../models/Character');
      let totalLevel = 0;
      for (const uid of playerIds) {
        const char = await Character.findOne({ userId: uid, guildId: interaction.guildId });
        if (char) totalLevel += char.level;
      }
      const avgLevel = Math.round(totalLevel / playerIds.length) || 1;

      // Generar aventura con GPT
      const loadingEmbed = new EmbedBuilder()
        .setColor(0x4a148c)
        .setTitle('🤖 El Dungeon Master está preparando la aventura...')
        .setDescription(`Tema: **"${tema}"**\nNivel del grupo: **${avgLevel}**\n\nEsto puede tardar unos segundos...`);

      await interaction.editReply({ embeds: [loadingEmbed] });

      const adventureData = await generateAIAdventure(tema, avgLevel, playerIds.length);
      adventureData.id = `ai_${Date.now()}`;

      await interaction.editReply({ content: `✅ Aventura generada: **${adventureData.title}**` });
      await startAIAdventure(interaction.channel, adventureData, playerIds, interaction.guildId, client);

    } catch (err) {
      console.error('aventura_ia error:', err);
      await interaction.editReply({ content: '❌ Error generando la aventura. Verifica que `OPENAI_API_KEY` esté configurado en Render.' });
    }
  },
};
