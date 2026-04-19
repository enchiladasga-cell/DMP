const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Character = require('../models/Character');
const { CLASSES, getModifier, XP_TABLE } = require('../data/classes');
const { RARITY_EMOJI } = { RARITY_EMOJI: { comun:'⚪',infrecuente:'🟢',raro:'🔵',epico:'🟣',legendario:'🟠' } };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('personaje')
    .setDescription('Ve la ficha de tu personaje')
    .addUserOption(opt => opt.setName('jugador').setDescription('Ver ficha de otro jugador').setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser('jugador') || interaction.user;
    const char = await Character.findOne({ userId: target.id, guildId: interaction.guildId });
    if (!char) {
      return interaction.reply({ content: `❌ ${target.id === interaction.user.id ? 'No tienes' : `${target.username} no tiene`} personaje. Usa \`/crear_personaje\`.`, ephemeral: true });
    }

    const classData = CLASSES[char.class];
    const nextLevelXP = XP_TABLE[char.level + 1] || '—';
    const xpBar = buildXpBar(char.xp, XP_TABLE[char.level] || 0, nextLevelXP !== '—' ? nextLevelXP : char.xp);

    const statsText = Object.entries(char.stats)
      .map(([k, v]) => `**${k.slice(0,3).toUpperCase()}** ${v}(${getModifier(v) >= 0 ? '+' : ''}${getModifier(v)})`)
      .join(' | ');

    const weaponEquipped = char.inventory.find(i => i.type === 'arma' && i.equipped) || char.inventory.find(i => i.type === 'arma');
    const armorEquipped = char.inventory.find(i => i.type === 'armadura' && i.equipped) || char.inventory.find(i => i.type === 'armadura');

    const legendaryItems = char.inventory.filter(i => i.rarity === 'legendario');

    const embed = new EmbedBuilder()
      .setColor(0x1565c0)
      .setTitle(`${classData.emoji} ${char.name}`)
      .setDescription(`**${classData.name}** — Nivel ${char.level}`)
      .addFields(
        { name: '❤️ HP', value: `${char.hp}/${char.hpMax}`, inline: true },
        { name: '🛡️ CA', value: `${char.ca}`, inline: true },
        { name: '💰 Oro', value: `${char.gold} mo`, inline: true },
        { name: '⭐ Experiencia', value: `${char.xp} XP\n${xpBar}\nSiguiente nivel: ${nextLevelXP} XP`, inline: false },
        { name: '📊 Stats', value: statsText, inline: false },
        { name: '⚔️ Arma equipada', value: weaponEquipped ? `${weaponEquipped.name} ${weaponEquipped.bonus > 0 ? `(+${weaponEquipped.bonus})` : ''}` : 'Ninguna', inline: true },
        { name: '🛡️ Armadura equipada', value: armorEquipped ? `${armorEquipped.name} ${armorEquipped.bonus > 0 ? `(+${armorEquipped.bonus})` : ''}` : 'Ninguna', inline: true },
        { name: '🏆 Aventuras completadas', value: `${char.adventuresCompleted}`, inline: true },
      );

    if (legendaryItems.length > 0) {
      embed.addFields({
        name: '🌟 Objetos Legendarios',
        value: legendaryItems.map(i => `🟠 **${i.name}** — ${i.description}`).join('\n'),
      });
    }

    await interaction.reply({ embeds: [embed] });
  },
};

function buildXpBar(current, levelStart, levelEnd) {
  const progress = levelEnd > levelStart ? (current - levelStart) / (levelEnd - levelStart) : 1;
  const filled = Math.round(progress * 10);
  return `[${'█'.repeat(filled)}${'░'.repeat(10 - filled)}] ${Math.round(progress * 100)}%`;
}
