const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Character = require('../models/Character');
const { FACTIONS, getReputationRank } = require('../data/world');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reputacion')
    .setDescription('Ve tu reputacion con las facciones del reino')
    .addUserOption(opt => opt.setName('jugador').setDescription('Ver reputacion de otro jugador').setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser('jugador') || interaction.user;
    const char = await Character.findOne({ userId: target.id, guildId: interaction.guildId });
    if (!char) return interaction.reply({ content: '❌ Este jugador no tiene personaje.', ephemeral: true });

    const embed = new EmbedBuilder()
      .setColor(0x1565c0)
      .setTitle(`🏛️ Reputación de ${char.name}`)
      .setDescription('Tu standing con las facciones del reino determina que beneficios obtienes.');

    const rep = char.reputation || {};
    for (const [key, faction] of Object.entries(FACTIONS)) {
      const points = rep[key] || 0;
      const rank = getReputationRank(key, points);
      const nextThreshold = faction.thresholds.find(t => t > points) || faction.thresholds[faction.thresholds.length - 1];
      const rankIndex = faction.ranks.indexOf(rank);
      const perk = faction.perks[rankIndex] || '—';
      const bar = buildBar(points, nextThreshold);

      embed.addFields({
        name: `${faction.emoji} ${faction.name}`,
        value: `**${rank}** — ${points} pts\n${bar}\n✨ Beneficio: ${perk}`,
        inline: false,
      });
    }

    embed.setFooter({ text: 'Gana reputacion completando aventuras en las zonas de cada faccion' });
    await interaction.reply({ embeds: [embed] });
  },
};

function buildBar(current, max) {
  const pct = Math.min(current / Math.max(max, 1), 1);
  const filled = Math.round(pct * 8);
  return `[${'█'.repeat(filled)}${'░'.repeat(8 - filled)}] ${current}/${max}`;
}
