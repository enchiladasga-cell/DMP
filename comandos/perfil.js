const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const Character = require('../models/Character');
const { generarTarjeta } = require('../utils/canvasHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('perfil')
    .setDescription('Muestra tu tarjeta de jugador')
    .addUserOption(option =>
      option.setName('usuario')
            .setDescription('Ver el perfil de otro aventurero')
            .setRequired(false)),
  
  async execute(interaction) {
    await interaction.deferReply();
    const usuario = interaction.options.getUser('usuario') || interaction.user;
    const personaje = await Character.findOne({ userId: usuario.id });
    if (!personaje) {
      return interaction.editReply('Ese aventurero aún no ha forjado su leyenda. Usa `/crear_personaje`.');
    }

    const buffer = await generarTarjeta(personaje);
    const attachment = new AttachmentBuilder(buffer, { name: 'perfil.png' });
    await interaction.editReply({ files: [attachment] });
  }
};
