const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { rollDice, rollD20WithAdvantage, rollD20WithDisadvantage } = require('../utils/dice');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tirar')
    .setDescription('Tira dados (ej: 2d6, 1d20, 3d8+5)')
    .addStringOption(opt => opt.setName('dados').setDescription('Notación: 2d6, 1d20, d8+3...').setRequired(true))
    .addStringOption(opt => opt.setName('tipo')
      .setDescription('Tipo de tirada')
      .setRequired(false)
      .addChoices(
        { name: 'Normal', value: 'normal' },
        { name: 'Con Ventaja (2d20 mejor)', value: 'ventaja' },
        { name: 'Con Desventaja (2d20 peor)', value: 'desventaja' },
      )),

  async execute(interaction) {
    const notation = interaction.options.getString('dados').trim();
    const tipo = interaction.options.getString('tipo') || 'normal';

    const validNotation = /^\d*d\d+([+-]\d+)?$/i.test(notation);
    if (!validNotation) {
      return interaction.reply({ content: '❌ Formato inválido. Ejemplos: `1d20`, `2d6`, `1d8+3`, `d12`', ephemeral: true });
    }

    let result, description;

    if (tipo === 'ventaja' && notation.toLowerCase() === 'd20' || notation === '1d20') {
      const r = rollD20WithAdvantage();
      description = `🎲 2d20 con **Ventaja**: [${r.rolls.join(', ')}] → Usa el **${r.result}**`;
      result = r.result;
    } else if (tipo === 'desventaja' && (notation.toLowerCase() === 'd20' || notation === '1d20')) {
      const r = rollD20WithDisadvantage();
      description = `🎲 2d20 con **Desventaja**: [${r.rolls.join(', ')}] → Usa el **${r.result}**`;
      result = r.result;
    } else {
      const r = rollDice(notation);
      description = `🎲 \`${notation}\`: ${r.display}`;
      result = r.total;
    }

    const color = result === 20 ? 0xffd700 : result === 1 ? 0xf44336 : 0x1565c0;
    const title = result === 20 ? '🌟 ¡CRÍTICO NATURAL!' : result === 1 ? '💀 ¡PIFIA!' : '🎲 Resultado';

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(description)
      .setFooter({ text: `Tirada de ${interaction.user.username}` });

    await interaction.reply({ embeds: [embed] });
  },
};
