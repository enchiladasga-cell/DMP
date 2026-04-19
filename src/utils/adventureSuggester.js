const { ADVENTURES } = require('../data/adventures');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Sugiere aventuras cada cierto tiempo en servidores activos
module.exports = function startSuggester(client) {
  // Cada 6 horas sugiere una aventura aleatoria
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  setInterval(async () => {
    for (const guild of client.guilds.cache.values()) {
      try {
        // Buscar canal de texto general
        const channel = guild.channels.cache.find(c =>
          c.isTextBased() && !c.isThread() &&
          (c.name.includes('general') || c.name.includes('bot') || c.name.includes('dnd') || c.name.includes('juego'))
        );
        if (!channel) continue;

        const adventures = Object.values(ADVENTURES);
        const pick = adventures[Math.floor(Math.random() * adventures.length)];

        const embed = new EmbedBuilder()
          .setColor(0x7b1fa2)
          .setTitle('🎲 ¡El Dungeon Master os llama!')
          .setDescription(`Una nueva aventura os espera...\n\n**${pick.title}**\n${pick.description}`)
          .addFields(
            { name: '⏱️ Duración', value: pick.duration.toUpperCase(), inline: true },
            { name: '👥 Jugadores', value: `${pick.minPlayers}-${pick.maxPlayers}`, inline: true },
            { name: '⚔️ Nivel recomendado', value: `${pick.recommendedLevel}+`, inline: true },
          )
          .setFooter({ text: 'Usa /aventura para comenzar o /lista_aventuras para ver todas' });

        await channel.send({ embeds: [embed] });
      } catch (e) { /* silencioso */ }
    }
  }, SIX_HOURS);
};
