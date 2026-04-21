const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Session = require('../models/Session');
const Character = require('../models/Character');
const { ADVENTURES } = require('../data/adventures');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('continuar')
    .setDescription('Continua una aventura pausada'),

  async execute(interaction, client) {
    const session = await Session.findOne({
      channelId: interaction.channelId,
      guildId: interaction.guildId,
      status: 'pausada',
    });

    if (!session) return interaction.reply({ content: '❌ No hay aventura pausada en este canal.', ephemeral: true });

    const player = session.players.find(p => p.userId === interaction.user.id);
    if (!player) return interaction.reply({ content: '❌ No eres parte de esta aventura.', ephemeral: true });

    if (!session.checkpoint) return interaction.reply({ content: '❌ No hay punto de guardado disponible.', ephemeral: true });

    // Restaurar HPs del checkpoint
    const savedAt = session.checkpoint.savedAt;
    for (const p of session.players) {
      if (session.checkpoint.playerHPs && session.checkpoint.playerHPs[p.userId]) {
        p.hp = session.checkpoint.playerHPs[p.userId];
      }
    }

    session.status = 'activa';
    session.currentNode = session.checkpoint.nodeId;
    session.markModified('players');
    await session.save();

    const embed = new EmbedBuilder()
      .setColor(0x1565c0)
      .setTitle('▶️ Aventura Reanudada')
      .setDescription(`Continuando desde el punto guardado...`)
      .addFields(
        { name: '📍 Nodo actual', value: session.currentNode, inline: true },
        { name: '⏰ Guardado', value: new Date(savedAt).toLocaleString('es-ES'), inline: true },
        { name: '👥 Jugadores', value: session.players.map(p => `<@${p.userId}> ❤️${p.hp}`).join('\n'), inline: false },
      );

    await interaction.reply({ embeds: [embed] });

    // Obtener la aventura correcta
    let adventure;
    if (client.tempAdventures && client.tempAdventures[session.adventureId]) {
      adventure = client.tempAdventures[session.adventureId];
    } else {
      adventure = ADVENTURES[session.adventureId];
    }

    if (!adventure) return;

    const node = adventure.nodes[session.currentNode];
    if (node) {
      const { advanceNode } = require('../utils/sessionManager');
      await advanceNode(interaction.channel, session, node, client);
    }
  },
};
