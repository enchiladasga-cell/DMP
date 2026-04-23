const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const AISession = require('../models/AISession');
const { narrateCurrentScene, advanceScene } = require('../utils/aiSessionManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dm')
    .setDescription('Comandos del Dungeon Master IA')
    .addSubcommand(sub => sub.setName('continuar').setDescription('Fuerza al DM a continuar la narrativa'))
    .addSubcommand(sub => sub.setName('estado').setDescription('Ver el estado actual de la aventura IA'))
    .addSubcommand(sub => sub.setName('escena').setDescription('Pedir al DM que redescribe la escena actual'))
    .addSubcommand(sub => sub.setName('pausa').setDescription('Pausar la aventura IA')),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const session = await AISession.findOne({
      channelId: interaction.channelId,
      status: { $in: ['activa', 'esperando_acciones', 'procesando', 'combate', 'pausada'] },
    });

    if (!session) return interaction.reply({ content: '❌ No hay aventura IA activa en este canal.', ephemeral: true });

    if (sub === 'estado') {
      const embed = new EmbedBuilder()
        .setColor(0x1565c0)
        .setTitle(`📊 Estado: ${session.adventureTitle}`)
        .addFields(
          { name: '📍 Escena', value: session.currentScene, inline: true },
          { name: '⚡ Estado', value: session.status, inline: true },
          { name: '👥 Jugadores', value: session.players.map(p => `<@${p.userId}> ${p.isAlive ? `❤️${p.hp}` : '☠️'} ${p.hasActed ? '✅' : '⏳'}`).join('\n') },
          { name: '💬 Mensajes en contexto', value: `${session.conversationHistory.length}`, inline: true },
        );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'continuar') {
      if (!session.players.find(p => p.userId === interaction.user.id)) {
        return interaction.reply({ content: '❌ No eres parte de esta aventura.', ephemeral: true });
      }
      await interaction.reply({ content: '▶️ El DM retoma la narrativa...' });
      session.status = 'activa';
      await session.save();
      await narrateCurrentScene(interaction.channel, session, client);
      return;
    }

    if (sub === 'escena') {
      await interaction.reply({ content: '🔄 El DM redescribe la escena...' });
      await narrateCurrentScene(interaction.channel, session, client);
      return;
    }

    if (sub === 'pausa') {
      session.status = 'pausada';
      session.checkpoint = { savedAt: new Date(), savedByUser: interaction.user.id };
      await session.save();
      return interaction.reply({ content: '💾 Aventura IA pausada. Usa `/dm continuar` para reanudar.' });
    }
  },
};
