const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Character = require('../models/Character');

const RARITY_EMOJI = { comun:'⚪', infrecuente:'🟢', raro:'🔵', epico:'🟣', legendario:'🟠' };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('comercio')
    .setDescription('Intercambia objetos u oro con otro jugador')
    .addSubcommand(sub => sub.setName('ofrecer')
      .setDescription('Ofrecer un objeto o oro a otro jugador')
      .addUserOption(opt => opt.setName('jugador').setDescription('Jugador con quien comerciar').setRequired(true))
      .addStringOption(opt => opt.setName('objeto').setDescription('Nombre del objeto a ofrecer (opcional)').setRequired(false))
      .addIntegerOption(opt => opt.setName('oro').setDescription('Oro a ofrecer (opcional)').setRequired(false)))
    .addSubcommand(sub => sub.setName('ver').setDescription('Ver ofertas pendientes para ti')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'ver') {
      const char = await Character.findOne({ userId: interaction.user.id, guildId: interaction.guildId });
      if (!char) return interaction.reply({ content: '❌ No tienes personaje.', ephemeral: true });
      if (!char.tradeOffer) return interaction.reply({ content: '📦 No tienes ofertas pendientes.', ephemeral: true });

      const offer = char.tradeOffer;
      const fromChar = await Character.findOne({ userId: offer.fromUserId, guildId: interaction.guildId });
      if (!fromChar) {
        char.tradeOffer = null;
        await char.save();
        return interaction.reply({ content: '❌ La oferta ya no es válida.', ephemeral: true });
      }

      let offerText = `**${fromChar.name}** te ofrece:\n`;
      if (offer.item) offerText += `${RARITY_EMOJI[offer.item.rarity]} **${offer.item.name}**\n`;
      if (offer.gold > 0) offerText += `💰 ${offer.gold} monedas de oro\n`;
      offerText += `\nA cambio de:\n`;
      if (offer.wantItem) offerText += `• Tu objeto: **${offer.wantItem}**\n`;
      if (offer.wantGold > 0) offerText += `• ${offer.wantGold} monedas de oro\n`;

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`trade_accept_${offer.fromUserId}_${interaction.user.id}`).setLabel('✅ Aceptar').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`trade_reject_${offer.fromUserId}_${interaction.user.id}`).setLabel('❌ Rechazar').setStyle(ButtonStyle.Danger),
      );

      return interaction.reply({ content: offerText, components: [row], ephemeral: true });
    }

    if (sub === 'ofrecer') {
      const targetUser = interaction.options.getUser('jugador');
      const objetoNombre = interaction.options.getString('objeto');
      const oro = interaction.options.getInteger('oro') || 0;

      if (targetUser.id === interaction.user.id) return interaction.reply({ content: '❌ No puedes comerciar contigo mismo.', ephemeral: true });

      const charA = await Character.findOne({ userId: interaction.user.id, guildId: interaction.guildId });
      const charB = await Character.findOne({ userId: targetUser.id, guildId: interaction.guildId });

      if (!charA) return interaction.reply({ content: '❌ No tienes personaje.', ephemeral: true });
      if (!charB) return interaction.reply({ content: `❌ <@${targetUser.id}> no tiene personaje.`, ephemeral: true });
      if (oro > charA.gold) return interaction.reply({ content: `❌ No tienes suficiente oro (tienes ${charA.gold} mo).`, ephemeral: true });

      let itemToOffer = null;
      if (objetoNombre) {
        itemToOffer = charA.inventory.find(i => i.name.toLowerCase().includes(objetoNombre.toLowerCase()));
        if (!itemToOffer) return interaction.reply({ content: `❌ No tienes "${objetoNombre}" en tu inventario.`, ephemeral: true });
      }

      if (!itemToOffer && oro === 0) return interaction.reply({ content: '❌ Debes ofrecer al menos un objeto o algo de oro.', ephemeral: true });

      // Guardar oferta en el personaje destino
      charB.tradeOffer = {
        fromUserId: interaction.user.id,
        item: itemToOffer || null,
        gold: oro,
        wantItem: null,
        wantGold: 0,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      };
      await charB.save();

      let offerText = `📦 **${charA.name}** te ofrece:\n`;
      if (itemToOffer) offerText += `${RARITY_EMOJI[itemToOffer.rarity]} **${itemToOffer.name}**\n`;
      if (oro > 0) offerText += `💰 ${oro} monedas de oro\n`;
      offerText += `\nUsa \`/comercio ver\` para aceptar o rechazar. Expira en 10 minutos.`;

      await interaction.reply({ content: `✅ Oferta enviada a <@${targetUser.id}>.`, ephemeral: true });
      await interaction.channel.send({ content: `<@${targetUser.id}> ${offerText}` });
    }
  },
};
