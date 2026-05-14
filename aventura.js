const { SlashCommandBuilder } = require('discord.js');
const Character = require('../models/Character');
const { askDeepseek } = require('../services/deepseek');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('aventura')
    .setDescription('Comienza una aventura narrada por el Dungeon Master IA')
    .addSubcommand(sub =>
      sub.setName('solitario')
         .setDescription('Aventura en solitario')),
  
  async execute(interaction) {
    if (interaction.options.getSubcommand() === 'solitario') {
      await interaction.deferReply({ ephemeral: true });
      
      const personaje = await Character.findOne({ userId: interaction.user.id });
      if (!personaje) {
        return interaction.editReply('Primero debes crear un personaje con `/crear_personaje`.');
      }

      const systemPrompt = `Eres el Dungeon Master de "Ecos de Eldoria", un mundo de fantasía oscura y épica. 
Narras las aventuras de un héroe llamado ${personaje.nombre}, un ${personaje.raza} ${personaje.clase} de nivel ${personaje.nivel}.
Sus atributos: FUE ${personaje.atributos.fuerza}, DES ${personaje.atributos.destreza}, CON ${personaje.atributos.constitucion}, INT ${personaje.atributos.inteligencia}, SAB ${personaje.atributos.sabiduria}, CAR ${personaje.atributos.carisma}.
Inventario actual: ${personaje.inventario.map(i => i.nombre).join(', ') || 'vacío'}.
Oro: ${personaje.oro}.

Reglas del juego:
- Usa un sistema d20 simplificado. Para acciones con riesgo, indica la dificultad (Fácil 10, Normal 13, Difícil 16, Épica 20).
- Ofrece opciones claras al final de cada mensaje (ej: "¿Atacas al lobo o intentas esquivarlo?").
- Incorpora el mundo de Eldoria (Bosque de Velo Oscuro, minas de los Enanos, dragones de piedra...).
- Proporciona drops (armas, pociones, gemas) según rareza cuando derrote enemigos. Usa el sistema: Común, Poco común, Raro, Épico, Mítico, Legendario.
- Sé descriptivo, atmosférico y reta al jugador. La muerte es posible si toma malas decisiones.
- Comienza narrando la entrada de ${personaje.nombre} a la Posada "El Cuervo Errante" donde ve el tablón de misiones.`;

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `${personaje.nombre} entra a la posada y mira el tablón de misiones. ¿Qué aventura le espera hoy?` }
      ];

      const respuesta = await askDeepseek(messages);
      
      const thread = await interaction.channel.threads.create({
        name: `🧭 ${personaje.nombre} - Aventura`,
        autoArchiveDuration: 60,
        type: 12,
        reason: 'Aventura de Eldoria',
      });
      await thread.members.add(interaction.user.id);
      
      await interaction.editReply(`Tu aventura comienza en ${thread}. ¡Que los dioses te guíen!`);
      await thread.send(`**${personaje.nombre}** se adentra en lo desconocido...\n\n${respuesta}`);
    }
  }
};