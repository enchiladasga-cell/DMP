const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Character = require('../models/Character');
const { SHOP_ITEMS } = require('../data/items');

const RARITY_EMOJI = { comun:'⚪',infrecuente:'🟢',raro:'🔵',epico:'🟣',legendario:'🟠' };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tienda')
    .setDescription('Visita la tienda del gremio')
    .addStringOption(opt => opt.setName('comprar').setDescription('Nombre del objeto a comprar').setRequired(false)),

  async execute(interaction) {
    const char = await Character.findOne({ userId: interaction.user.id, guildId: interaction.guildId });
    if (!char) return interaction.reply({ content: '❌ No tienes personaje.', ephemeral: true });

    const comprar = interaction.options.getString('comprar');

    if (comprar) {
      const item = SHOP_ITEMS.find(i => i.name.toLowerCase().includes(comprar.toLowerCase()));
      if (!item) return interaction.reply({ content: `❌ No se vende "${comprar}". Usa \`/tienda\` para ver el catálogo.`, ephemeral: true });
      if (char.gold < item.price) return interaction.reply({ content: `❌ No tienes suficiente oro. Necesitas **${item.price} mo**, tienes **${char.gold} mo**.`, ephemeral: true });

      char.gold -= item.price;
      const { price, ...itemToAdd } = item;
      char.inventory.push(itemToAdd);
      await char.save();

      return interaction.reply({ content: `✅ Comprado: **${item.name}** por ${item.price} mo. Oro restante: ${char.gold} mo.`, ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(0xe65100)
      .setTitle('🏪 Tienda del Gremio de Aventureros')
      .setDescription(`💰 Tu oro: **${char.gold} mo**\n\n*Los objetos legendarios no se venden — solo se consiguen en aventuras.*`);

    const grouped = {};
    for (const item of SHOP_ITEMS) {
      if (!grouped[item.type]) grouped[item.type] = [];
      grouped[item.type].push(item);
    }

    const typeNames = { arma:'⚔️ Armas', armadura:'🛡️ Armaduras', pocion:'🧪 Pociones', misc:'💎 Miscelánea' };
    for (const [type, items] of Object.entries(grouped)) {
      const value = items.map(i => `${RARITY_EMOJI[i.rarity]} **${i.name}** — ${i.price} mo\n  └ ${i.description}`).join('\n');
      embed.addFields({ name: typeNames[type] || type, value });
    }

    embed.setFooter({ text: 'Usa /tienda comprar:"nombre del objeto" para comprar' });
    await interaction.reply({ embeds: [embed] });
  },
};
