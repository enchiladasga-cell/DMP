const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { ADVENTURES } = require('../data/adventures');

const DURATION_EMOJI = { corta: '🟢', media: '🟡', larga: '🔴' };
const DURATION_LABEL = { corta: 'Corta (~30 min)', media: 'Media (~60 min)', larga: 'Larga (~2h)' };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lista_aventuras')
    .setDescription('Ver todas las aventuras disponibles'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x4a148c)
      .setTitle('📜 Tablón de Aventuras')
      .setDescription('Elige tu destino, valiente aventurero.\n\nUsa `/aventura id:<id>` para comenzar.\n\n⚠️ *Los objetos legendarios solo aparecen en aventuras de dificultad media y larga.*');

    for (const adv of Object.values(ADVENTURES)) {
      embed.addFields({
        name: `${DURATION_EMOJI[adv.duration]} **${adv.title}** — \`ID: ${adv.id}\``,
        value: [
          adv.description,
          `⏱️ ${DURATION_LABEL[adv.duration]} | 👥 ${adv.minPlayers}-${adv.maxPlayers} jugadores | ⚔️ Nivel ${adv.recommendedLevel}+`,
        ].join('\n'),
      });
    }

    embed.setFooter({ text: 'Ejemplo: /aventura id:taberna_maldita jugadores:@Ana @Luis' });
    await interaction.reply({ embeds: [embed] });
  },
};
