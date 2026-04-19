const Session = require('../models/Session');
const Character = require('../models/Character');
const { ADVENTURES } = require('../data/adventures');
const { rollAttack, rollDamage, rollSkillCheck, rollInitiative, rollDice } = require('./dice');
const { rollLoot } = require('../data/items');
const { CLASSES, checkLevelUp, applyLevelUp, getModifier } = require('../data/classes');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const TURN_TIMEOUT = 2 * 60 * 1000; // 2 minutos

// ─── RAREZA COLORES ────────────────────────────────────────────────────────
const RARITY_COLOR = {
  comun: 0x9e9e9e, infrecuente: 0x4caf50, raro: 0x2196f3,
  epico: 0x9c27b0, legendario: 0xff9800,
};
const RARITY_EMOJI = {
  comun: '⚪', infrecuente: '🟢', raro: '🔵', epico: '🟣', legendario: '🟠',
};

async function startAdventure(interaction, adventureId, playerIds, client) {
  const adventure = ADVENTURES[adventureId];
  if (!adventure) return interaction.reply({ content: '❌ Aventura no encontrada.', ephemeral: true });

  // Verificar personajes
  const players = [];
  for (const userId of playerIds) {
    const char = await Character.findOne({ userId, guildId: interaction.guildId });
    if (!char) {
      return interaction.reply({ content: `❌ <@${userId}> no tiene personaje. Usa \`/crear_personaje\` primero.`, ephemeral: true });
    }
    players.push({ userId, characterId: char._id, hp: char.hp, hasActed: false, isAlive: true });
  }

  // Crear sesión
  const session = new Session({
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    adventureId,
    players,
    currentNode: 'inicio',
    status: 'activa',
  });
  await session.save();

  // Mostrar mapa y primer nodo
  const mapEmbed = new EmbedBuilder()
    .setColor(0x1a1a2e)
    .setTitle(`🗺️ ${adventure.title}`)
    .setDescription(`\`\`\`${adventure.map}\`\`\``)
    .addFields(
      { name: '📖 Historia', value: adventure.description, inline: false },
      { name: '⏱️ Duración', value: adventure.duration.toUpperCase(), inline: true },
      { name: '👥 Jugadores', value: playerIds.map(id => `<@${id}>`).join(', '), inline: true },
    )
    .setFooter({ text: '¡Que los dados os sean favorables!' });

  await interaction.reply({ embeds: [mapEmbed] });
  await advanceNode(interaction.channel, session, adventure.nodes['inicio'], client);
}

async function advanceNode(channel, session, node, client) {
  const adventure = ADVENTURES[session.adventureId];

  if (node.type === 'combate') {
    await startCombat(channel, session, node, client);
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(node.type === 'fin' ? (node.success ? 0x4caf50 : 0xf44336) : 0x1a1a2e)
    .setDescription(node.text);

  if (node.type === 'fin') {
    embed.setTitle(node.success ? '🏆 ¡Victoria!' : '💀 Derrota');
    await finishAdventure(channel, session, node, client);
    return;
  }

  // Aplicar efectos del nodo
  if (node.bonusGold) {
    for (const p of session.players) {
      await Character.findByIdAndUpdate(p.characterId, { $inc: { gold: node.bonusGold } });
    }
    embed.addFields({ name: '💰 Oro encontrado', value: `+${node.bonusGold} monedas para todos`, inline: true });
  }

  if (node.bonusItem) {
    for (const p of session.players) {
      await Character.findByIdAndUpdate(p.characterId, { $push: { inventory: node.bonusItem } });
    }
    embed.addFields({ name: `${RARITY_EMOJI[node.bonusItem.rarity]} Objeto encontrado`, value: `**${node.bonusItem.name}** — ${node.bonusItem.description}`, inline: false });
  }

  const components = [];
  if (node.options && node.options.length > 0) {
    embed.setTitle('❓ ¿Qué hacéis?');
    embed.setFooter({ text: `⏱️ Tenéis 2 minutos para decidir. Todos deben votar.` });

    // Mostrar quién ha votado
    const votesField = session.players.map(p => `<@${p.userId}>: ⏳`).join('\n');
    embed.addFields({ name: '🗳️ Votos', value: votesField, inline: false });

    const row = new ActionRowBuilder();
    for (const opt of node.options.slice(0, 4)) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`choice_${session._id}_${opt.next}`)
          .setLabel(opt.label)
          .setStyle(ButtonStyle.Primary),
      );
    }
    components.push(row);
  }

  if (node.type === 'tirada') {
    embed.setTitle('🎲 Tirada de Habilidad');
    embed.setFooter({ text: `Tirada automática del grupo` });
    await channel.send({ embeds: [embed] });
    await handleSkillCheck(channel, session, node, client);
    return;
  }

  session.lastActionAt = new Date();
  session.turnDeadline = new Date(Date.now() + TURN_TIMEOUT);
  session.markModified('players');
  await session.save();

  const msg = await channel.send({ embeds: [embed], components });

  // Timer de timeout
  if (node.options && node.options.length > 0) {
    setTimeout(async () => {
      const fresh = await Session.findById(session._id);
      if (!fresh || fresh.currentNode !== session.currentNode) return;
      // Auto-seleccionar primera opción si nadie vota
      const firstOpt = node.options[0];
      const nextNode = adventure.nodes[firstOpt.next];
      fresh.currentNode = firstOpt.next;
      await fresh.save();
      await channel.send({ content: `⏱️ **Tiempo agotado!** El grupo avanza con: *${firstOpt.label}*` });
      if (nextNode) await advanceNode(channel, fresh, nextNode, client);
    }, TURN_TIMEOUT + 5000);
  }
}

async function handleButton(interaction, client) {
  const parts = interaction.customId.split('_');
  if (parts[0] !== 'choice' && parts[0] !== 'combat') return;

  if (parts[0] === 'choice') {
    const sessionId = parts[1];
    const nextNodeId = parts.slice(2).join('_');
    const session = await Session.findById(sessionId);
    if (!session || session.status !== 'activa') {
      return interaction.reply({ content: '❌ Esta sesión ya no está activa.', ephemeral: true });
    }

    const player = session.players.find(p => p.userId === interaction.user.id);
    if (!player) return interaction.reply({ content: '❌ No eres parte de esta aventura.', ephemeral: true });
    if (player.hasActed) return interaction.reply({ content: '✅ Ya has votado.', ephemeral: true });

    player.hasActed = true;
    player.vote = nextNodeId;
    session.markModified('players');
    await session.save();
    await interaction.reply({ content: `✅ Voto registrado.`, ephemeral: true });

    // Actualizar mensaje con votos
    const activePlayers = session.players.filter(p => p.isAlive);
    const allVoted = activePlayers.every(p => p.hasActed);

    if (allVoted) {
      // Contar votos
      const votes = {};
      for (const p of activePlayers) {
        votes[p.vote] = (votes[p.vote] || 0) + 1;
      }
      const winningChoice = Object.entries(votes).sort((a, b) => b[1] - a[1])[0][0];

      const adventure = ADVENTURES[session.adventureId];
      const nextNode = adventure.nodes[winningChoice];

      // Reset votes
      for (const p of session.players) { p.hasActed = false; p.vote = null; }
      session.currentNode = winningChoice;
      session.markModified('players');
      await session.save();

      await interaction.channel.send({ content: `🗳️ **Decisión tomada:** El grupo elige avanzar.` });
      if (nextNode) await advanceNode(interaction.channel, session, nextNode, client);
    }
  }

  if (parts[0] === 'combat') {
    await handleCombatAction(interaction, parts, client);
  }
}

async function handleSkillCheck(channel, session, node, client) {
  const adventure = ADVENTURES[session.adventureId];
  const chars = await Promise.all(session.players.filter(p => p.isAlive).map(p => Character.findById(p.characterId)));

  // El mejor del grupo hace la tirada (toma el mejor modificador)
  let bestMod = -5;
  let bestChar = null;
  for (const c of chars) {
    const mod = getModifier(c.stats[node.skill] || 10);
    if (mod > bestMod) { bestMod = mod; bestChar = c; }
  }

  const result = rollSkillCheck(bestChar.stats[node.skill] || 10, false, bestChar.bonificadorCompetencia);
  const success = result.total >= node.dc;

  const embed = new EmbedBuilder()
    .setColor(success ? 0x4caf50 : 0xf44336)
    .setTitle(success ? '✅ ¡Éxito!' : '❌ Fallo')
    .setDescription(`**${bestChar.name}** lidera la tirada.\n${result.display}\nDificultad: **${node.dc}**`)
    .addFields({ name: success ? '🎉 Resultado' : '😬 Resultado', value: success ? node.successText : node.failText });

  if (node.damage && !success) {
    const dmg = rollDice(node.damage);
    for (const p of session.players.filter(p => p.isAlive)) {
      p.hp = Math.max(0, p.hp - dmg.total);
    }
    embed.addFields({ name: '💥 Daño', value: `${dmg.display} de daño a todo el grupo` });
    session.markModified('players');
    await session.save();
  }

  await channel.send({ embeds: [embed] });

  const nextNodeId = success ? node.successNext : node.failNext;
  const nextNode = adventure.nodes[nextNodeId];
  session.currentNode = nextNodeId;
  await session.save();

  setTimeout(async () => {
    if (nextNode) await advanceNode(channel, session, nextNode, client);
  }, 2000);
}

async function startCombat(channel, session, node, client) {
  session.status = 'combate';
  session.currentCombat = {
    enemies: node.enemies.map(e => ({ ...e })),
    turn: 0,
    playerOrder: [],
    enemyTurn: false,
  };

  // Tirar iniciativa
  const chars = await Promise.all(session.players.filter(p => p.isAlive).map(p => Character.findById(p.characterId)));
  const initiatives = [];

  for (const char of chars) {
    const init = rollInitiative(getModifier(char.stats.destreza));
    initiatives.push({ userId: char.userId || session.players.find(p => p.characterId.toString() === char._id.toString()).userId, name: char.name, initiative: init.total, roll: init.roll });
  }

  initiatives.sort((a, b) => b.initiative - a.initiative);
  session.currentCombat.playerOrder = initiatives.map(i => i.userId);

  if (node.advantage) {
    session.currentCombat.playerOrder = [...session.currentCombat.playerOrder]; // ya tienen ventaja
  }

  await session.save();

  const initText = initiatives.map((i, idx) => `${idx + 1}. **${i.name}** — Iniciativa ${i.initiative} (🎲${i.roll})`).join('\n');
  const enemyList = node.enemies.map(e => `👾 **${e.name}** — ❤️ ${e.hp} PG | 🛡️ CA ${e.ca}`).join('\n');

  const embed = new EmbedBuilder()
    .setColor(0xc62828)
    .setTitle('⚔️ ¡COMBATE INICIADO!')
    .setDescription(node.text)
    .addFields(
      { name: '📋 Orden de Iniciativa', value: initText, inline: false },
      { name: '👾 Enemigos', value: enemyList, inline: false },
    )
    .setFooter({ text: 'Usad los botones para actuar en vuestro turno' });

  await channel.send({ embeds: [embed] });

  session.currentCombat.turn = 0;
  await session.save();
  await sendCombatTurn(channel, session, client);
}

async function sendCombatTurn(channel, session, client) {
  const adventure = ADVENTURES[session.adventureId];
  const combat = session.currentCombat;
  const currentUserId = combat.playerOrder[combat.turn % combat.playerOrder.length];
  const player = session.players.find(p => p.userId === currentUserId);

  if (!player || !player.isAlive) {
    combat.turn++;
    session.markModified('currentCombat');
    await session.save();
    await sendCombatTurn(channel, session, client);
    return;
  }

  const char = await Character.findById(player.characterId);
  const aliveEnemies = combat.enemies.filter(e => e.hp > 0);

  if (aliveEnemies.length === 0) {
    await endCombat(channel, session, true, adventure, client);
    return;
  }

  const enemyStatus = aliveEnemies.map((e, i) => `${i + 1}. **${e.name}** — ❤️ ${e.hp}/${e.hpMax} | 🛡️ CA ${e.ca}`).join('\n');
  const playerStatus = session.players.filter(p => p.isAlive).map(p => `<@${p.userId}>: ❤️ ${p.hp}`).join(' | ');

  const embed = new EmbedBuilder()
    .setColor(0xff6f00)
    .setTitle(`⚔️ Turno de <@${currentUserId}> — ${char.name}`)
    .addFields(
      { name: '👾 Enemigos vivos', value: enemyStatus, inline: false },
      { name: '❤️ Estado del grupo', value: playerStatus, inline: false },
    )
    .setFooter({ text: `⏱️ 2 minutos para actuar | ❤️ Tu HP: ${player.hp}` });

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`combat_${session._id}_attack_0`).setLabel(`⚔️ Atacar #1`).setStyle(ButtonStyle.Danger),
    aliveEnemies[1] ? new ButtonBuilder().setCustomId(`combat_${session._id}_attack_1`).setLabel(`⚔️ Atacar #2`).setStyle(ButtonStyle.Danger) : new ButtonBuilder().setCustomId(`combat_disabled`).setLabel('─').setStyle(ButtonStyle.Secondary).setDisabled(true),
    new ButtonBuilder().setCustomId(`combat_${session._id}_potion`).setLabel('🧪 Usar Poción').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`combat_${session._id}_defend`).setLabel('🛡️ Defender').setStyle(ButtonStyle.Primary),
  );

  await channel.send({ content: `<@${currentUserId}>`, embeds: [embed], components: [row1] });

  // Timeout
  setTimeout(async () => {
    const fresh = await Session.findById(session._id);
    if (!fresh || fresh.status !== 'combate') return;
    if (fresh.currentCombat.turn !== combat.turn) return;
    // Auto atacar al primero
    await channel.send({ content: `⏱️ **${char.name}** tardó demasiado. ¡Ataque automático!` });
    await processCombatAttack(channel, fresh, currentUserId, 0, client);
  }, TURN_TIMEOUT + 5000);
}

async function handleCombatAction(interaction, parts, client) {
  const sessionId = parts[1];
  const action = parts[2];
  const targetIdx = parseInt(parts[3]) || 0;

  const session = await Session.findById(sessionId);
  if (!session || session.status !== 'combate') return interaction.reply({ content: '❌ No hay combate activo.', ephemeral: true });

  const combat = session.currentCombat;
  const currentUserId = combat.playerOrder[combat.turn % combat.playerOrder.length];

  if (interaction.user.id !== currentUserId) {
    return interaction.reply({ content: '❌ No es tu turno.', ephemeral: true });
  }

  await interaction.deferReply();

  if (action === 'attack') {
    await processCombatAttack(interaction.channel, session, currentUserId, targetIdx, client, interaction);
  } else if (action === 'potion') {
    await processCombatPotion(interaction.channel, session, currentUserId, client, interaction);
  } else if (action === 'defend') {
    await processCombatDefend(interaction.channel, session, currentUserId, client, interaction);
  }
}

async function processCombatAttack(channel, session, userId, targetIdx, client, interaction = null) {
  const adventure = ADVENTURES[session.adventureId];
  const player = session.players.find(p => p.userId === userId);
  const char = await Character.findById(player.characterId);
  const classData = CLASSES[char.class];
  const combat = session.currentCombat;
  const aliveEnemies = combat.enemies.filter(e => e.hp > 0);
  const target = aliveEnemies[targetIdx] || aliveEnemies[0];

  if (!target) return;

  // Calcular bonus de ataque (stat primario + competencia + bonus de arma)
  const primaryStat = char.stats[classData.primaryStat] || 10;
  const weapon = char.inventory.find(i => i.type === 'arma' && i.equipped) || char.inventory.find(i => i.type === 'arma');
  const weaponBonus = weapon ? (weapon.bonus || 0) : 0;
  const attackBonus = getModifier(primaryStat) + char.bonificadorCompetencia + weaponBonus;

  const attackRoll = rollAttack(attackBonus);
  let resultText = '';

  if (attackRoll.isFumble) {
    resultText = `💨 **¡Pifia!** ${char.name} falla estrepitosamente. (d20: 1)`;
  } else if (attackRoll.isCrit || attackRoll.total >= target.ca) {
    // Hit
    const dmgNotation = weapon ? getDamageForWeapon(weapon.name) : getDefaultDamage(char.class);
    const dmgResult = rollDamage(dmgNotation + (weaponBonus > 0 ? `+${weaponBonus}` : ''), attackRoll.isCrit);
    const statMod = getModifier(primaryStat);
    const totalDmg = dmgResult.total + statMod;

    // Aplicar daño
    const enemyInSession = session.currentCombat.enemies.find(e => e.name === target.name && e.hp > 0);
    if (enemyInSession) enemyInSession.hp = Math.max(0, enemyInSession.hp - totalDmg);

    const critText = attackRoll.isCrit ? ' 💥 **¡CRÍTICO!**' : '';
    resultText = `⚔️ **${char.name}** ataca a **${target.name}**${critText}\n🎲 Ataque: ${attackRoll.d20}+${attackBonus} = **${attackRoll.total}** vs CA ${target.ca} — ¡IMPACTO!\n💥 Daño: ${dmgResult.display} + ${statMod} = **${totalDmg}** daño\n❤️ ${target.name}: ${Math.max(0, enemyInSession.hp)}/${target.hpMax} PG`;
  } else {
    resultText = `⚔️ **${char.name}** ataca a **${target.name}**\n🎲 Ataque: ${attackRoll.d20}+${attackBonus} = **${attackRoll.total}** vs CA ${target.ca} — ¡Fallo!`;
  }

  session.markModified('currentCombat');
  await session.save();

  if (interaction) {
    await interaction.editReply({ content: resultText });
  } else {
    await channel.send({ content: resultText });
  }

  await advanceCombatTurn(channel, session, client);
}

async function processCombatPotion(channel, session, userId, client, interaction) {
  const player = session.players.find(p => p.userId === userId);
  const char = await Character.findById(player.characterId);
  const potion = char.inventory.find(i => i.type === 'pocion');

  if (!potion) {
    await interaction.editReply({ content: '❌ No tienes pociones.' });
    return;
  }

  const heal = rollDice('2d4+2');
  player.hp = Math.min(char.hpMax, player.hp + heal.total);
  char.inventory.splice(char.inventory.indexOf(potion), 1);
  await char.save();
  session.markModified('players');
  await session.save();

  await interaction.editReply({ content: `🧪 **${char.name}** bebe una Poción de Curación.\n❤️ Recupera ${heal.display} PG. HP: ${player.hp}/${char.hpMax}` });
  await advanceCombatTurn(channel, session, client);
}

async function processCombatDefend(channel, session, userId, client, interaction) {
  const player = session.players.find(p => p.userId === userId);
  const char = await Character.findById(player.characterId);

  // Bonus defensivo temporal
  player.tempEffects = player.tempEffects || [];
  player.tempEffects.push('defending');
  session.markModified('players');
  await session.save();

  await interaction.editReply({ content: `🛡️ **${char.name}** adopta postura defensiva. +2 CA hasta su próximo turno.` });
  await advanceCombatTurn(channel, session, client);
}

async function advanceCombatTurn(channel, session, client) {
  const combat = session.currentCombat;
  const adventure = ADVENTURES[session.adventureId];
  const aliveEnemies = combat.enemies.filter(e => e.hp > 0);

  if (aliveEnemies.length === 0) {
    await endCombat(channel, session, true, adventure, client);
    return;
  }

  // Turno de enemigos después de todos los jugadores
  combat.turn++;
  const allPlayersDone = combat.turn % combat.playerOrder.length === 0;

  if (allPlayersDone) {
    await enemyTurn(channel, session, client);
  } else {
    await session.save();
    await sendCombatTurn(channel, session, client);
  }
}

async function enemyTurn(channel, session, client) {
  const adventure = ADVENTURES[session.adventureId];
  const combat = session.currentCombat;
  const aliveEnemies = combat.enemies.filter(e => e.hp > 0);
  const alivePlayers = session.players.filter(p => p.isAlive && p.hp > 0);

  if (alivePlayers.length === 0) {
    await endCombat(channel, session, false, adventure, client);
    return;
  }

  let enemyActionsText = '👾 **Turno de los enemigos:**\n';

  for (const enemy of aliveEnemies) {
    // Elegir objetivo aleatorio
    const target = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
    const char = await Character.findById(target.characterId);
    const isDefending = target.tempEffects && target.tempEffects.includes('defending');
    const targetCA = char.ca + (isDefending ? 2 : 0);

    const attackRoll = rollAttack(enemy.ataque);

    if (attackRoll.isFumble) {
      enemyActionsText += `• **${enemy.name}** falla contra <@${target.userId}>. (pifia)\n`;
    } else if (attackRoll.isCrit || attackRoll.total >= targetCA) {
      const dmgResult = rollDice(enemy.danio);
      const totalDmg = Math.max(1, dmgResult.total);
      target.hp = Math.max(0, target.hp - totalDmg);
      const critText = attackRoll.isCrit ? ' 💥¡CRÍTICO!' : '';
      enemyActionsText += `• **${enemy.name}** golpea a <@${target.userId}>${critText} — **${totalDmg}** daño. HP: ${target.hp}\n`;

      if (target.hp <= 0) {
        target.isAlive = false;
        enemyActionsText += `  ☠️ <@${target.userId}> ha caído inconsciente!\n`;
      }
    } else {
      enemyActionsText += `• **${enemy.name}** ataca a <@${target.userId}> — Falla (${attackRoll.total} vs CA ${targetCA})\n`;
    }

    // Limpiar efectos temporales
    target.tempEffects = [];
  }

  session.markModified('players');
  session.markModified('currentCombat');
  await session.save();

  await channel.send({ content: enemyActionsText });

  // Comprobar si todos los jugadores están caídos
  const stillAlive = session.players.filter(p => p.isAlive && p.hp > 0);
  if (stillAlive.length === 0) {
    await endCombat(channel, session, false, adventure, client);
    return;
  }

  // Siguiente ronda
  await sendCombatTurn(channel, session, client);
}

async function endCombat(channel, session, victory, adventure, client) {
  const node = adventure.nodes[session.currentNode];
  const nextNodeId = victory ? node.nextOnWin : node.nextOnLoss;
  const nextNode = adventure.nodes[nextNodeId];

  session.status = 'activa';
  session.currentNode = nextNodeId;
  session.currentCombat = null;
  await session.save();

  if (victory) {
    // XP y loot
    const xpGained = node.enemies.reduce((sum, e) => sum + e.xpReward, 0);
    const loot = rollLoot('normal', node.isBoss);
    let lootText = loot.length > 0 ? loot.map(i => `${RARITY_EMOJI[i.rarity]} **${i.name}** — ${i.description}`).join('\n') : 'Sin objetos';

    const embed = new EmbedBuilder()
      .setColor(0x4caf50)
      .setTitle('🏆 ¡Victoria en combate!')
      .addFields(
        { name: '⭐ XP ganada', value: `+${xpGained} XP para cada jugador`, inline: true },
        { name: '💰 Oro', value: `+${Math.floor(xpGained / 10)} monedas`, inline: true },
        { name: '🎁 Botín', value: lootText, inline: false },
      );

    await channel.send({ embeds: [embed] });

    // Aplicar XP y loot a personajes
    for (const p of session.players.filter(pl => pl.isAlive)) {
      const char = await Character.findById(p.characterId);
      char.xp += xpGained;
      char.gold += Math.floor(xpGained / 10);
      char.hp = p.hp; // sync hp
      char.totalKills += node.enemies.length;

      // Distribuir loot
      if (loot.length > 0) {
        const charLoot = loot[Math.floor(Math.random() * loot.length)];
        char.inventory.push(charLoot);
        if (charLoot.rarity === 'legendario') {
          await channel.send({ content: `🌟 ¡<@${p.userId}> ha obtenido el objeto legendario **${charLoot.name}**!` });
        }
      }

      // Level up check
      const newLevel = checkLevelUp(char);
      if (newLevel) {
        const classData = CLASSES[char.class];
        const levelInfo = applyLevelUp(char, classData);
        await channel.send({ content: `🎉 **¡${char.name} sube al nivel ${newLevel}!** +${levelInfo.hpGain} HP máximo` });
      }

      await char.save();
    }
  } else {
    await channel.send({ content: '💀 **El grupo ha sido derrotado...**' });
  }

  setTimeout(async () => {
    if (nextNode) await advanceNode(channel, session, nextNode, client);
  }, 3000);
}

async function finishAdventure(channel, session, node, client) {
  const embed = new EmbedBuilder()
    .setColor(node.success ? 0x4caf50 : 0xf44336)
    .setTitle(node.success ? '🏆 ¡AVENTURA COMPLETADA!' : '💀 Aventura Fallida')
    .setDescription(node.text);

  if (node.success) {
    const xp = node.xpReward;
    const goldMin = node.goldReward?.min || 0;
    const goldMax = node.goldReward?.max || 0;
    const gold = Math.floor(Math.random() * (goldMax - goldMin + 1)) + goldMin;

    embed.addFields(
      { name: '⭐ XP Final', value: `+${xp}`, inline: true },
      { name: '💰 Oro Final', value: `+${gold}`, inline: true },
    );

    // Loot bonus del fin
    const lootRolls = node.lootRolls || 1;
    const allLoot = [];
    for (let i = 0; i < lootRolls; i++) {
      const l = rollLoot('jefe', node.isBoss);
      allLoot.push(...l);
    }

    if (allLoot.length > 0) {
      const lootText = allLoot.map(i => `${RARITY_EMOJI[i.rarity]} **${i.name}** — ${i.description}`).join('\n');
      embed.addFields({ name: '🎁 Recompensas Finales', value: lootText });
    }

    for (const p of session.players.filter(pl => pl.isAlive)) {
      const char = await Character.findById(p.characterId);
      char.xp += xp;
      char.gold += gold;
      char.adventuresCompleted += 1;
      char.hp = Math.min(char.hpMax, char.hpMax); // HP completo al terminar
      if (allLoot.length > 0) {
        const charLoot = allLoot[Math.floor(Math.random() * allLoot.length)];
        char.inventory.push(charLoot);
        if (charLoot.rarity === 'legendario') {
          await channel.send({ content: `🌟✨ ¡<@${p.userId}> recibe el legendario **${charLoot.name}**! ¡Una hazaña digna de canciones!` });
        }
      }
      const newLevel = checkLevelUp(char);
      if (newLevel) {
        const classData = CLASSES[char.class];
        const levelInfo = applyLevelUp(char, classData);
        embed.addFields({ name: `🎉 ¡SUBIDA DE NIVEL!`, value: `${char.name} → Nivel ${newLevel} (+${levelInfo.hpGain} HP)` });
      }
      await char.save();
    }
  }

  session.status = node.success ? 'completada' : 'fallida';
  await session.save();

  await channel.send({ embeds: [embed] });
}

function getDamageForWeapon(name) {
  const dmgMap = {
    'Espada Larga': '1d8', 'Hacha Grande': '1d12', 'Daga': '1d4', 'Maza': '1d6',
    'Arco Largo': '1d8', 'Báculo Arcano': '1d6', 'Espada Corta': '1d6',
    'Daga x2': '1d4', 'Hacha de Batalla': '1d8',
  };
  for (const [key, val] of Object.entries(dmgMap)) {
    if (name.includes(key.split(' ')[0])) return val;
  }
  return '1d6';
}

function getDefaultDamage(className) {
  const map = { guerrero: '1d8', mago: '1d6', picaro: '1d4', clerigo: '1d6', arquero: '1d8', barbaro: '1d12' };
  return map[className] || '1d6';
}

module.exports = { startAdventure, handleButton, advanceNode };
