const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Session = require('../models/Session');
const Character = require('../models/Character');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reiniciar')
    .setDescription('Reinicia la campaña actual o tu personaje')
    .addSubcommand(sub => sub.setName('campaña').setDescription('Termina la aventura actual y empieza de nuevo'))
    .addSubcommand(sub => sub.setName('personaje').setDescription('Reinicia tu personaje (mantiene el nombre y clase, resetea todo lo demas)')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'campaña') {
      const session = await Session.findOne({
        channelId: interaction.channelId,
        guildId: interaction.guildId,
        status: { $in: ['activa', 'combate', 'pausada'] },
      });

      if (!session) return interaction.reply({ content: '❌ No hay campaña activa en este canal.', ephemeral: true });

      const player = session.players.find(p => p.userId === interaction.user.id);
      if (!player) return interaction.reply({ content: '❌ No eres parte de esta campaña.', ephemeral: true });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`reiniciar_confirm_${session._id}`).setLabel('⚠️ Sí, reiniciar campaña').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`reiniciar_cancel`).setLabel('Cancelar').setStyle(ButtonStyle.Secondary),
      );

      return interaction.reply({
        content: '⚠️ ¿Seguro que quieres terminar la campaña actual? Se perderá el progreso no guardado.',
        components: [row],
        ephemeral: true,
      });
    }

    if (sub === 'personaje') {
      const char = await Character.findOne({ userId: interaction.user.id, guildId: interaction.guildId });
      if (!char) return interaction.reply({ content: '❌ No tienes personaje.', ephemeral: true });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`reset_char_confirm_${interaction.user.id}`).setLabel('⚠️ Sí, reiniciar personaje').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`reset_char_cancel`).setLabel('Cancelar').setStyle(ButtonStyle.Secondary),
      );

      return interaction.reply({
        content: `⚠️ ¿Reiniciar a **${char.name}**? Perderás nivel, XP, oro e inventario (excepto legendarios). ¿Continuar?`,
        components: [row],
        ephemeral: true,
      });
    }
  },
};
