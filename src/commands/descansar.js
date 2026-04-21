const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Character = require('../models/Character');
const { CLASSES, getModifier } = require('../data/classes');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('descansar')
    .setDescription('Descansa para recuperar fuerzas')
    .addStringOption(opt => opt.setName('tipo')
      .setDescription('Tipo de descanso')
      .setRequired(true)
      .addChoices(
        { name: '⚡ Corto (recupera recursos, algo de HP)', value: 'corto' },
        { name: '🌙 Largo (HP completo, todos los recursos)', value: 'largo' },
      )),

  async execute(interaction) {
    const tipo = interaction.options.getString('tipo');
    const char = await Character.findOne({ userId: interaction.user.id, guildId: interaction.guildId });
    if (!char) return interaction.reply({ content: '❌ No tienes personaje.', ephemeral: true });

    const classData = CLASSES[char.class];
    const conMod = getModifier(char.stats.constitucion);
    const embed = new EmbedBuilder().setTitle(tipo === 'corto' ? '⚡ Descanso Corto' : '🌙 Descanso Largo');

    if (tipo === 'corto') {
      // Recuperar Hit Dice (nivel/2 mínimo 1)
      const hitDice = Math.max(1, Math.floor(char.level / 2));
      const healPerDie = Math.ceil(classData.hitDie / 2) + conMod;
      const totalHeal = Math.max(1, hitDice * healPerDie);
      const oldHp = char.hp;
      char.hp = Math.min(char.hpMax, char.hp + totalHeal);

      // Restaurar algunos recursos
      if (char.class === 'guerrero') char.resources.secondWind = true;
      if (char.class === 'mago') char.resources.spellSlots = Math.min(3, char.resources.spellSlots + 1);
      if (char.class === 'barbaro') char.resources.rageTurns = Math.min(2, char.resources.rageTurns + 1);

      embed.setColor(0xff9800)
        .setDescription(`**${char.name}** descansa brevemente.`)
        .addFields(
          { name: '❤️ HP recuperado', value: `${oldHp} → ${char.hp}/${char.hpMax} (+${char.hp - oldHp})`, inline: true },
          { name: '🎲 Hit Dice usados', value: `${hitDice}d${classData.hitDie}`, inline: true },
        );

      if (char.class === 'guerrero') embed.addFields({ name: '⚡ Segundo Aliento', value: 'Restaurado', inline: true });
      if (char.class === 'mago') embed.addFields({ name: '🔮 Ranura de Hechizo', value: '+1 recuperada', inline: true });

    } else {
      // Descanso largo: HP completo + todos los recursos
      const oldHp = char.hp;
      char.hp = char.hpMax;
      char.resources.secondWind = true;
      char.resources.spellSlots = 3 + Math.floor(char.level / 3);
      char.resources.healingUses = 3;
      char.resources.rageTurns = 2;
      char.resources.sneakReady = true;

      embed.setColor(0x3f51b5)
        .setDescription(`**${char.name}** duerme profundamente y despierta renovado.`)
        .addFields(
          { name: '❤️ HP', value: `${oldHp} → ${char.hpMax}/${char.hpMax} (completo)`, inline: true },
          { name: '⚡ Recursos', value: 'Todos restaurados', inline: true },
        );

      if (char.class === 'mago') embed.addFields({ name: '🔮 Ranuras de Hechizo', value: `${char.resources.spellSlots} disponibles`, inline: true });
      if (char.class === 'barbaro') embed.addFields({ name: '💢 Furias', value: '2/2 restauradas', inline: true });
      if (char.class === 'clerigo') embed.addFields({ name: '✨ Curaciones', value: '3/3 restauradas', inline: true });
    }

    await char.save();
    embed.setFooter({ text: `Nivel ${char.level} ${classData.name}` });
    await interaction.reply({ embeds: [embed] });
  },
};
