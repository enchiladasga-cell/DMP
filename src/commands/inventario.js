const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Character = require('../models/Character');
const { CLASSES } = require('../data/classes');

const RARITY_EMOJI = { comun:'⚪',infrecuente:'🟢',raro:'🔵',epico:'🟣',legendario:'🟠' };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('inventario')
    .setDescription('Ve y gestiona tu inventario')
    .addStringOption(opt => opt.setName('equipar').setDescription('Nombre del objeto a equipar').setRequired(false))
    .addStringOption(opt => opt.setName('desequipar').setDescription('Nombre del objeto a desequipar').setRequired(false)),

  async execute(interaction) {
    const char = await Character.findOne({ userId: interaction.user.id, guildId: interaction.guildId });
    if (!char) return interaction.reply({ content: '❌ No tienes personaje.', ephemeral: true });

    const equiparNombre = interaction.options.getString('equipar');
    const desequiparNombre = interaction.options.getString('desequipar');

    if (equiparNombre) {
      const item = char.inventory.find(i => i.name.toLowerCase().includes(equiparNombre.toLowerCase()));
      if (!item) return interaction.reply({ content: `❌ No tienes un objeto llamado "${equiparNombre}".`, ephemeral: true });
      // Desequipar del mismo tipo
      char.inventory.forEach(i => { if (i.type === item.type) i.equipped = false; });
      item.equipped = true;
      await char.save();
      return interaction.reply({ content: `✅ **${item.name}** equipado.`, ephemeral: true });
    }

    if (desequiparNombre) {
      const item = char.inventory.find(i => i.name.toLowerCase().includes(desequiparNombre.toLowerCase()));
      if (!item) return interaction.reply({ content: `❌ No encontrado.`, ephemeral: true });
      item.equipped = false;
      await char.save();
      return interaction.reply({ content: `✅ **${item.name}** desequipado.`, ephemeral: true });
    }

    if (char.inventory.length === 0) {
      return interaction.reply({ content: '🎒 Tu inventario está vacío.', ephemeral: true });
    }

    const grouped = { arma: [], armadura: [], pocion: [], misc: [] };
    for (const item of char.inventory) {
      const type = item.type in grouped ? item.type : 'misc';
      grouped[type].push(item);
    }

    const formatGroup = (items) => items.map(i =>
      `${RARITY_EMOJI[i.rarity] || '⚪'} **${i.name}**${i.equipped ? ' ✅' : ''} ${i.bonus > 0 ? `(+${i.bonus})` : ''}\n  └ ${i.description}`
    ).join('\n');

    const embed = new EmbedBuilder()
      .setColor(0x37474f)
      .setTitle(`🎒 Inventario de ${char.name}`)
      .setDescription(`**${char.inventory.length}** objetos | 💰 ${char.gold} monedas de oro`);

    if (grouped.arma.length)    embed.addFields({ name: '⚔️ Armas', value: formatGroup(grouped.arma) });
    if (grouped.armadura.length) embed.addFields({ name: '🛡️ Armaduras', value: formatGroup(grouped.armadura) });
    if (grouped.pocion.length)  embed.addFields({ name: '🧪 Pociones', value: formatGroup(grouped.pocion) });
    if (grouped.misc.length)    embed.addFields({ name: '💎 Miscelánea', value: formatGroup(grouped.misc) });

    embed.setFooter({ text: 'Usa /inventario equipar:"nombre" para equipar un objeto' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
