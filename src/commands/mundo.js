const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Guild = require('../models/Guild');
const Character = require('../models/Character');
const { WORLD_MAP, ZONES, checkZoneUnlock } = require('../data/world');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mundo')
    .setDescription('Explora el mapa del mundo y ve las zonas disponibles')
    .addSubcommand(sub => sub.setName('mapa').setDescription('Ver el mapa del mundo'))
    .addSubcommand(sub => sub.setName('zona')
      .setDescription('Ver detalles de una zona')
      .addStringOption(opt => opt.setName('id')
        .setDescription('ID de la zona')
        .setRequired(true)
        .addChoices(
          { name: '🌾 Valle de Inicio', value: 'valle_inicio' },
          { name: '⛏️ Minas del Norte', value: 'minas_norte' },
          { name: '💀 Tierras Muertas', value: 'tierras_muertas' },
          { name: '🌲 Bosque Oscuro', value: 'bosque_oscuro' },
          { name: '🏘️ Pueblo Valdros', value: 'pueblo_valdros' },
          { name: '🏰 Fortaleza Caida', value: 'fortaleza_caida' },
          { name: '🌊 Costa Salvaje', value: 'costa' },
        ))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    let guildData = await Guild.findOne({ guildId: interaction.guildId });
    if (!guildData) {
      guildData = await Guild.create({ guildId: interaction.guildId });
    }

    if (sub === 'mapa') {
      const unlockedZones = guildData.world.unlockedZones;
      const worldLevel = guildData.world.worldLevel;

      let zonesStatus = '';
      for (const [id, zone] of Object.entries(ZONES)) {
        const unlocked = unlockedZones.includes(id) || checkZoneUnlock(zone, guildData);
        const status = unlocked ? '✅' : '🔒';
        zonesStatus += `${status} ${zone.emoji} **${zone.name}** (Nv.${zone.minLevel}+)\n`;
      }

      const embed = new EmbedBuilder()
        .setColor(0x1b5e20)
        .setTitle('🗺️ Mapa del Reino de Valdros')
        .setDescription(`\`\`\`${WORLD_MAP}\`\`\``)
        .addFields(
          { name: '🌍 Nivel del Mundo', value: `${worldLevel}`, inline: true },
          { name: '🏆 Aventuras del Servidor', value: `${guildData.world.totalAdventuresCompleted}`, inline: true },
          { name: '💀 Jefes Derrotados', value: `${guildData.world.totalBossesDefeated}`, inline: true },
          { name: '📍 Estado de Zonas', value: zonesStatus, inline: false },
        )
        .setFooter({ text: 'Usa /mundo zona id:nombre para ver detalles | Completa aventuras para desbloquear zonas' });

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'zona') {
      const zoneId = interaction.options.getString('id');
      const zone = ZONES[zoneId];
      if (!zone) return interaction.reply({ content: '❌ Zona no encontrada.', ephemeral: true });

      const unlocked = guildData.world.unlockedZones.includes(zoneId) || checkZoneUnlock(zone, guildData);
      const char = await Character.findOne({ userId: interaction.user.id, guildId: interaction.guildId });

      let reqText = '✅ Disponible desde el inicio';
      if (zone.unlockRequirement) {
        const r = zone.unlockRequirement;
        const parts = [];
        if (r.adventuresCompleted) parts.push(`${guildData.world.totalAdventuresCompleted}/${r.adventuresCompleted} aventuras del servidor`);
        if (r.worldLevel) parts.push(`Nivel mundo ${guildData.world.worldLevel}/${r.worldLevel}`);
        reqText = parts.join(' | ');
      }

      const embed = new EmbedBuilder()
        .setColor(unlocked ? 0x4caf50 : 0x9e9e9e)
        .setTitle(`${zone.emoji} ${zone.name}`)
        .setDescription(zone.description)
        .addFields(
          { name: '🔓 Estado', value: unlocked ? '✅ Desbloqueada' : '🔒 Bloqueada', inline: true },
          { name: '⚔️ Nivel mínimo', value: `${zone.minLevel}`, inline: true },
          { name: '📋 Requisito', value: reqText, inline: false },
        );

      if (zone.shopBonus) {
        const bonusText = zone.shopBonus.type === 'all' ? `${zone.shopBonus.discount}% descuento en toda la tienda` : `${zone.shopBonus.discount}% descuento en ${zone.shopBonus.type}s`;
        embed.addFields({ name: '🏪 Bonus de Tienda', value: bonusText, inline: false });
      }

      if (zone.adventures.length > 0) {
        embed.addFields({ name: '📜 Aventuras disponibles', value: zone.adventures.map(a => `• \`${a}\``).join('\n'), inline: false });
      }

      return interaction.reply({ embeds: [embed] });
    }
  },
};
