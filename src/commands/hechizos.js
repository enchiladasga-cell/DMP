// commands/hechizos.js — PARCHE v2.0
// /hechizos — Ver los hechizos y habilidades de tu clase según tu nivel actual

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Character = require('../models/Character');
const { getClass, getSpellsForLevel, getNewSpellsAtLevel, formatSpellList } = require('../data/classes');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hechizos')
    .setDescription('Ver tus hechizos y habilidades disponibles')
    .addUserOption(opt =>
      opt.setName('jugador')
        .setDescription('Ver los hechizos de otro jugador (opcional)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('jugador') || interaction.user;
    const char = await Character.findOne({ userId: target.id, guildId: interaction.guildId });

    if (!char) {
      const who = target.id === interaction.user.id ? 'No tienes' : `${target.username} no tiene`;
      return interaction.reply({ content: `❌ ${who} personaje creado. Usa /crear_personaje primero.`, ephemeral: true });
    }

    const cls = getClass(char.class);
    if (!cls) {
      return interaction.reply({ content: `❌ Clase desconocida: ${char.class}`, ephemeral: true });
    }

    const currentSpells = getSpellsForLevel(char.class, char.level);
    const nextLevelSpells = getNewSpellsAtLevel(char.class, char.level + 1);

    // Construir tabla de progresión de hechizos
    const spellLevels = Object.entries(cls.spellsPerLevel)
      .filter(([lvl]) => parseInt(lvl) <= char.level + 1)
      .map(([lvl, spells]) => {
        const unlocked = parseInt(lvl) <= char.level;
        const marker = unlocked ? '✅' : '🔒';
        return `${marker} **Nivel ${lvl}:** ${spells.map(s => s.name).join(', ') || '—'}`;
      })
      .join('\n');

    const embed = new EmbedBuilder()
      .setTitle(`${cls.name} — Hechizos y Habilidades`)
      .setDescription(`**Personaje:** ${char.name} | **Nivel:** ${char.level}\n\n**Progresión:**\n${spellLevels}`)
      .setColor(0x6A0DAD)
      .addFields(
        {
          name: `📖 Habilidades actuales (Nivel ${char.level})`,
          value: formatSpellList(currentSpells) || '_Ninguna_',
        }
      );

    if (nextLevelSpells.length > 0) {
      embed.addFields({
        name: `🔓 Al llegar a nivel ${char.level + 1} aprenderás:`,
        value: formatSpellList(nextLevelSpells),
      });
    } else {
      embed.addFields({
        name: `⭐ Máximo de habilidades alcanzado`,
        value: '¡Has desbloqueado todo el árbol de tu clase!',
      });
    }

    embed.setFooter({ text: 'Usa /personaje para ver tu ficha completa | Usa tus habilidades en combate con los botones' });

    await interaction.reply({ embeds: [embed] });
  },
};
