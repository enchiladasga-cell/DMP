const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const Character = require('../models/Character');
const { CLASSES, getModifier } = require('../data/classes');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('crear_personaje')
    .setDescription('Crea tu personaje para las aventuras D&D')
    .addStringOption(opt => opt.setName('nombre').setDescription('Nombre de tu personaje').setRequired(true))
    .addStringOption(opt => opt.setName('clase')
      .setDescription('Clase de tu personaje')
      .setRequired(true)
      .addChoices(
        { name: '⚔️ Guerrero — Tanque y daño físico', value: 'guerrero' },
        { name: '🔮 Mago — Hechicero devastador', value: 'mago' },
        { name: '🗡️ Pícaro — Ataques críticos y sigilo', value: 'picaro' },
        { name: '✨ Clérigo — Sanador y soporte', value: 'clerigo' },
        { name: '🏹 Arquero — Daño a distancia', value: 'arquero' },
        { name: '🪓 Bárbaro — Fuerza bruta', value: 'barbaro' },
      )),

  async execute(interaction) {
    const nombre = interaction.options.getString('nombre');
    const clase = interaction.options.getString('clase');
    const classData = CLASSES[clase];

    // Verificar si ya tiene personaje
    const existing = await Character.findOne({ userId: interaction.user.id, guildId: interaction.guildId });
    if (existing) {
      return interaction.reply({
        content: `❌ Ya tienes un personaje: **${existing.name}** (${CLASSES[existing.class].emoji} ${CLASSES[existing.class].name}). Usa \`/personaje\` para verlo.`,
        ephemeral: true,
      });
    }

    // Calcular HP inicial (máximo del dado de golpe + mod CON)
    const conMod = getModifier(classData.stats.constitucion);
    const hpMax = classData.hitDie + conMod;
    const ca = clase === 'barbaro'
      ? 10 + getModifier(classData.stats.destreza) + getModifier(classData.stats.constitucion)
      : clase === 'mago'
        ? 10 + getModifier(classData.stats.destreza)
        : clase === 'guerrero'
          ? 16
          : 13 + getModifier(classData.stats.destreza);

    const char = new Character({
      userId: interaction.user.id,
      guildId: interaction.guildId,
      name: nombre,
      class: clase,
      stats: classData.stats,
      hpMax: Math.max(1, hpMax),
      hp: Math.max(1, hpMax),
      ca,
      gold: classData.startingGold,
      inventory: classData.startingItems,
    });

    await char.save();

    const statsText = Object.entries(classData.stats)
      .map(([k, v]) => `**${k.charAt(0).toUpperCase() + k.slice(1)}**: ${v} (${getModifier(v) >= 0 ? '+' : ''}${getModifier(v)})`)
      .join(' | ');

    const itemsText = classData.startingItems.map(i => `• **${i.name}** — ${i.description}`).join('\n');

    const embed = new EmbedBuilder()
      .setColor(0x4a148c)
      .setTitle(`${classData.emoji} ¡Bienvenido, ${nombre}!`)
      .setDescription(`Has creado tu personaje como **${classData.name}**.\n\n${classData.tutorial}`)
      .addFields(
        { name: '❤️ Puntos de Golpe', value: `${char.hpMax}/${char.hpMax}`, inline: true },
        { name: '🛡️ Clase de Armadura', value: `${ca}`, inline: true },
        { name: '💰 Oro inicial', value: `${classData.startingGold} mo`, inline: true },
        { name: '📊 Estadísticas', value: statsText, inline: false },
        { name: '🎒 Equipo inicial', value: itemsText, inline: false },
        { name: '⚡ Habilidades', value: classData.abilities.map(a => `• ${a}`).join('\n'), inline: false },
      )
      .setFooter({ text: 'Usa /aventura para unirte a una aventura | /personaje para ver tu ficha' });

    await interaction.reply({ embeds: [embed] });
  },
};
