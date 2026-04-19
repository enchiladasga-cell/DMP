const { SlashCommandBuilder } = require('discord.js');
const Character = require('../models/Character');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('borrar_personaje')
    .setDescription('⚠️ Borra tu personaje permanentemente')
    .addStringOption(opt => opt.setName('confirmar').setDescription('Escribe BORRAR para confirmar').setRequired(true)),

  async execute(interaction) {
    const confirm = interaction.options.getString('confirmar');
    if (confirm !== 'BORRAR') return interaction.reply({ content: '❌ Debes escribir exactamente **BORRAR** para confirmar.', ephemeral: true });

    const deleted = await Character.findOneAndDelete({ userId: interaction.user.id, guildId: interaction.guildId });
    if (!deleted) return interaction.reply({ content: '❌ No tienes personaje.', ephemeral: true });

    await interaction.reply({ content: `✅ Personaje **${deleted.name}** eliminado. Puedes crear uno nuevo con \`/crear_personaje\`.`, ephemeral: true });
  },
};
