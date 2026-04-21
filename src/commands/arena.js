const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Character = require('../models/Character');
const Guild = require('../models/Guild');
const { rollAttack, rollDice, rollInitiative } = require('../utils/dice');
const { CLASSES, getModifier } = require('../data/classes');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('arena')
    .setDescription('Duelo PvP 1v1 en la Arena de Gladiadores')
    .addSubcommand(sub => sub.setName('desafiar')
      .setDescription('Desafiar a otro jugador a un duelo')
      .addUserOption(opt => opt.setName('rival').setDescription('Jugador a desafiar').setRequired(true))
      .addIntegerOption(opt => opt.setName('apuesta').setDescription('Oro apostado (opcional)').setRequired(false)))
    .addSubcommand(sub => sub.setName('ranking').setDescription('Ver ranking de la arena'))
    .addSubcommand(sub => sub.setName('historial').setDescription('Ver tu historial de duelos')),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'ranking') {
      const chars = await Character.find({ guildId: interaction.guildId, arenaWins: { $gt: 0 } })
        .sort({ arenaWins: -1 }).limit(10);

      if (!chars.length) return interaction.reply({ content: '🏟️ Nadie ha peleado en la arena aún.', ephemeral: true });

      const medals = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
      const rows = chars.map((c, i) => {
        const ratio = c.arenaLosses > 0 ? (c.arenaWins / (c.arenaWins + c.arenaLosses) * 100).toFixed(0) : 100;
        return `${medals[i]} **${c.name}** — ${c.arenaWins}V/${c.arenaLosses}D (${ratio}% victoria)`;
      });

      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xc62828).setTitle('🏟️ Ranking de la Arena').setDescription(rows.join('\n'))] });
    }

    if (sub === 'historial') {
      const char = await Character.findOne({ userId: interaction.user.id, guildId: interaction.guildId });
      if (!char) return interaction.reply({ content: '❌ No tienes personaje.', ephemeral: true });
      const ratio = (char.arenaWins + char.arenaLosses) > 0
        ? ((char.arenaWins / (char.arenaWins + char.arenaLosses)) * 100).toFixed(0) : 0;
      return interaction.reply({ content: `🏟️ **${char.name}** en la Arena:\n⚔️ Victorias: ${char.arenaWins}\n💀 Derrotas: ${char.arenaLosses}\n📊 Ratio: ${ratio}%`, ephemeral: true });
    }

    if (sub === 'desafiar') {
      const rival = interaction.options.getUser('rival');
      const apuesta = interaction.options.getInteger('apuesta') || 0;

      if (rival.id === interaction.user.id) return interaction.reply({ content: '❌ No puedes desafiarte a ti mismo.', ephemeral: true });
      if (rival.bot) return interaction.reply({ content: '❌ No puedes desafiar a un bot.', ephemeral: true });

      const charA = await Character.findOne({ userId: interaction.user.id, guildId: interaction.guildId });
      const charB = await Character.findOne({ userId: rival.id, guildId: interaction.guildId });

      if (!charA) return interaction.reply({ content: '❌ No tienes personaje.', ephemeral: true });
      if (!charB) return interaction.reply({ content: `❌ <@${rival.id}> no tiene personaje.`, ephemeral: true });
      if (apuesta > 0 && charA.gold < apuesta) return interaction.reply({ content: `❌ No tienes suficiente oro. Tienes ${charA.gold} mo.`, ephemeral: true });

      const embed = new EmbedBuilder()
        .setColor(0xc62828)
        .setTitle('🏟️ ¡DESAFÍO A DUELO!')
        .setDescription(`**${charA.name}** (${CLASSES[charA.class].emoji}) desafía a **${charB.name}** (${CLASSES[charB.class].emoji})`)
        .addFields(
          { name: '⚔️ Retador', value: `<@${interaction.user.id}> — Nv.${charA.level} | ❤️${charA.hp}/${charA.hpMax}`, inline: true },
          { name: '🛡️ Desafiado', value: `<@${rival.id}> — Nv.${charB.level} | ❤️${charB.hp}/${charB.hpMax}`, inline: true },
          { name: '💰 Apuesta', value: apuesta > 0 ? `${apuesta} monedas de oro` : 'Sin apuesta', inline: false },
        )
        .setFooter({ text: `<@${rival.id}> tiene 2 minutos para aceptar o rechazar` });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`arena_accept_${interaction.user.id}_${rival.id}_${apuesta}`).setLabel('✅ Aceptar duelo').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`arena_reject_${interaction.user.id}_${rival.id}`).setLabel('❌ Rechazar').setStyle(ButtonStyle.Danger),
      );

      await interaction.reply({ content: `<@${rival.id}>`, embeds: [embed], components: [row] });

      setTimeout(async () => {
        try { await interaction.editReply({ components: [] }); } catch {}
      }, 120000);
    }
  },
};

async function executeArenaFight(channel, userIdA, userIdB, apuesta, guildId, client) {
  const charA = await Character.findOne({ userId: userIdA, guildId });
  const charB = await Character.findOne({ userId: userIdB, guildId });

  let hpA = charA.hp, hpB = charB.hp;
  const classA = CLASSES[charA.class], classB = CLASSES[charB.class];

  // Iniciativa
  const initA = rollInitiative(getModifier(charA.stats.destreza));
  const initB = rollInitiative(getModifier(charB.stats.destreza));
  const aFirst = initA.total >= initB.total;

  let log = `🏟️ **DUELO: ${charA.name} VS ${charB.name}**\n`;
  log += `🎲 Iniciativa: **${charA.name}** (${initA.total}) vs **${charB.name}** (${initB.total})\n`;
  log += `⚔️ **${aFirst ? charA.name : charB.name}** ataca primero!\n\n`;

  let ronda = 1;
  const maxRondas = 10;

  while (hpA > 0 && hpB > 0 && ronda <= maxRondas) {
    log += `**— Ronda ${ronda} —**\n`;

    const atacantes = aFirst ? [[charA, charB, 'A'], [charB, charA, 'B']] : [[charB, charA, 'B'], [charA, charB, 'A']];

    for (const [atk, def, who] of atacantes) {
      if ((who === 'A' && hpA <= 0) || (who === 'B' && hpB <= 0)) continue;
      if ((who === 'A' && hpB <= 0) || (who === 'B' && hpA <= 0)) continue;

      const atkClass = CLASSES[atk.class];
      const atkMod = getModifier(atk.stats[atkClass.primaryStat]);
      const weapon = atk.inventory.find(i => i.type === 'arma' && i.equipped) || atk.inventory.find(i => i.type === 'arma');
      const weaponBonus = weapon ? (weapon.bonus || 0) : 0;
      const attackBonus = atkMod + atk.bonificadorCompetencia + weaponBonus;
      const defCA = who === 'A' ? charB.ca : charA.ca;

      const attackRoll = rollAttack(attackBonus);

      if (attackRoll.isFumble) {
        log += `💨 **${atk.name}** falla (pifia)\n`;
      } else if (attackRoll.isCrit || attackRoll.total >= defCA) {
        const dmgNotation = weapon ? '1d8' : '1d6';
        const dmg = rollDice(dmgNotation);
        const totalDmg = Math.max(1, dmg.total + atkMod + weaponBonus);
        const critText = attackRoll.isCrit ? ' 💥CRITICO' : '';
        if (who === 'A') { hpB = Math.max(0, hpB - totalDmg); }
        else { hpA = Math.max(0, hpA - totalDmg); }
        const defHp = who === 'A' ? hpB : hpA;
        const defMax = who === 'A' ? charB.hpMax : charA.hpMax;
        log += `⚔️ **${atk.name}**${critText} golpea a **${def.name}** por ${totalDmg} — ❤️${defHp}/${defMax}\n`;
      } else {
        log += `🛡️ **${atk.name}** falla (${attackRoll.total} vs CA${defCA})\n`;
      }

      if (hpA <= 0 || hpB <= 0) break;
    }
    ronda++;
    log += '\n';
  }

  // Determinar ganador
  let winnerId, loserId, winnerChar, loserChar;
  if (hpA <= 0 && hpB > 0) {
    winnerId = userIdB; loserId = userIdA; winnerChar = charB; loserChar = charA;
  } else if (hpB <= 0 && hpA > 0) {
    winnerId = userIdA; loserId = userIdB; winnerChar = charA; loserChar = charB;
  } else {
    // Empate — mayor HP restante gana
    winnerId = hpA >= hpB ? userIdA : userIdB;
    loserId = hpA >= hpB ? userIdB : userIdA;
    winnerChar = hpA >= hpB ? charA : charB;
    loserChar = hpA >= hpB ? charB : charA;
  }

  // Actualizar stats
  await Character.findByIdAndUpdate(winnerChar._id, { $inc: { arenaWins: 1, gold: apuesta, xp: 100 } });
  await Character.findByIdAndUpdate(loserChar._id, { $inc: { arenaLosses: 1, gold: -apuesta } });

  log += `\n🏆 **¡${winnerChar.name} GANA EL DUELO!**\n`;
  if (apuesta > 0) log += `💰 Gana **${apuesta} monedas de oro** de <@${loserId}>\n`;
  log += `⭐ +100 XP para <@${winnerId}>`;

  const embed = new EmbedBuilder()
    .setColor(0xffd700)
    .setTitle('🏟️ RESULTADO DEL DUELO')
    .setDescription(log.slice(0, 4000));

  await channel.send({ embeds: [embed] });
}

module.exports.executeArenaFight = executeArenaFight;
