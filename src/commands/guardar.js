const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Session = require('../models/Session');
const Character = require('../models/Character');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('guardar')
    .setDescription('Guarda el progreso de la aventura actual para continuar despues'),

  async execute(interaction) {
    const session = await Session.findOne({
      channelId: interaction.channelId,
      guildId: interaction.guildId,
      status: { $in: ['activa', 'combate'] },
    });

    if (!session) return interaction.reply({ content: '❌ No hay aventura activa en este canal.', ephemeral: true });

    const player = session.players.find(p => p.userId === interaction.user.id);
    if (!player) return interaction.reply({ content: '❌ No eres parte de esta aventura.', ephemeral: true });

    // Guardar checkpoint
    const playerHPs = {};
    for (const p of session.players) {
      playerHPs[p.userId] = p.hp;
    }

    session.checkpoint = {
      savedAt: new Date(),
      savedByUser: interaction.user.id,
      nodeId: session.currentNode,
      playerHPs,
    };
    session.status = 'pausada';
    await session.save();

    const embed = new EmbedBuilder()
      .setColor(0x4caf50)
      .setTitle('💾 Partida Guardada')
      .setDescription(`El progreso de la aventura ha sido guardado.`)
      .addFields(
        { name: '📍 Punto guardado', value: session.currentNode, inline: true },
        { name: '👤 Guardado por', value: `<@${interaction.user.id}>`, inline: true },
        { name: '⏰ Guardado a las', value: new Date().toLocaleTimeString('es-ES'), inline: true },
        { name: '💡 Para continuar', value: 'Usa `/continuar` en cualquier momento', inline: false },
      );

    await interaction.reply({ embeds: [embed] });
  },
};
