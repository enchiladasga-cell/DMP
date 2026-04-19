const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Character = require('../models/Character');
const { CLASSES } = require('../data/classes');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ranking')
    .setDescription('Ver el ranking del servidor')
    .addStringOption(opt => opt.setName('tipo')
      .setDescription('Tipo de ranking')
      .setRequired(false)
      .addChoices(
        { name: '⭐ Por XP', value: 'xp' },
        { name: '🏆 Por aventuras completadas', value: 'aventuras' },
        { name: '💰 Por oro', value: 'oro' },
      )),

  async execute(interaction) {
    const tipo = interaction.options.getString('tipo') || 'xp';
    const sortField = { xp: 'xp', aventuras: 'adventuresCompleted', oro: 'gold' }[tipo];

    const chars = await Character.find({ guildId: interaction.guildId })
      .sort({ [sortField]: -1 })
      .limit(10);

    if (!chars.length) return interaction.reply({ content: '❌ No hay personajes en este servidor aún.', ephemeral: true });

    const titleMap = { xp: '⭐ Ranking por XP', aventuras: '🏆 Ranking por Aventuras', oro: '💰 Ranking por Oro' };
    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

    const rows = chars.map((c, i) => {
      const classData = CLASSES[c.class];
      const value = tipo === 'xp' ? `${c.xp} XP (Nv.${c.level})` : tipo === 'aventuras' ? `${c.adventuresCompleted} aventuras` : `${c.gold} mo`;
      return `${medals[i]} ${classData.emoji} **${c.name}** — ${value}`;
    });

    const embed = new EmbedBuilder()
      .setColor(0xf57f17)
      .setTitle(titleMap[tipo])
      .setDescription(rows.join('\n'));

    await interaction.reply({ embeds: [embed] });
  },
};
