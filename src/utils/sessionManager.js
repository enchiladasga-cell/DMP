const Session = require('../models/Session');
const Character = require('../models/Character');
const Guild = require('../models/Guild');
const { ADVENTURES } = require('../data/adventures');
const { rollAttack, rollDamage, rollSkillCheck, rollInitiative, rollDice } = require('./dice');
const { rollLoot } = require('../data/items');
const { CLASSES, checkLevelUp, applyLevelUp, getModifier } = require('../data/classes');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { executeArenaFight } = require('../commands/arena');

const TURN_TIMEOUT = 2 * 60 * 1000;
const RARITY_EMOJI = { comun:'⚪', infrecuente:'🟢', raro:'🔵', epico:'🟣', legendario:'🟠' };

// ─── INICIAR AVENTURA ────────────────────────────────────────────────────────
async function startAdventure(interaction, adventureId, playerIds, client) {
  const adventure = ADVENTURES[adventureId];
  if (!adventure) return interaction.reply({ content: '❌ Aventura no encontrada.', ephemeral: true });
  await _createSession(interaction.channel, adventure, playerIds, interaction.guildId, client, interaction);
}

async function startAdventureWithData(channel, adventure, playerIds, guildId, client) {
  await _createSession(channel, adventure, playerIds, guildId, client, null);
}

async function _createSession(channel, adventure, playerIds, guildId, client, interaction) {
  const players = [];
  for (const userId of playerIds) {
    const char = await Character.findOne({ userId, guildId });
    if (!char) {
      const msg = `❌ <@${userId}> no tiene personaje. Usa \`/crear_personaje\` primero.`;
      if (interaction) return interaction.reply({ content: msg, ephemeral: true });
      return channel.send(msg);
    }
    players.push({ userId, characterId: char._id, hp: char.hp, hasActed: false, isAlive: true });
  }

  const session = new Session({
    guildId,
    channelId: channel.id,
    adventureId: adventure.id,
    players,
    currentNode: 'inicio',
    status: 'activa',
  });
  await session.save();

  if (client.tempAdventures) client.tempAdventures[adventure.id] = adventure;

  const mapEmbed = new EmbedBuilder()
    .setColor(0x1a1a2e)
    .setTitle(`🗺️ ${adventure.title}`)
    .setDescription(`\`\`\`${adventure.map}\`\`\``)
    .addFields(
      { name: '📖 Historia', value: adventure.description },
      { name: '👥 Jugadores', value: playerIds.map(id => `<@${id}>`).join(', '), inline: true },
      { name: '💡 Comandos útiles', value: '`/guardar` pausar | `/descansar corto` recuperar | `/reiniciar campaña` terminar', inline: false },
    )
    .setFooter({ text: '¡Que los dados os sean favorables!' });

  if (interaction) await interaction.reply({ embeds: [mapEmbed] });
  else await channel.send({ embeds: [mapEmbed] });

  await advanceNode(channel, session, adventure.nodes['inicio'], client);
}

// ─── AVANZAR NODO ────────────────────────────────────────────────────────────
async function advanceNode(channel, session, node, client) {
  if (!node) return;
  if (session.status === 'pausada') return;

  const adventure = getAdventure(session.adventureId, client);
  if (!adventure) return;

  if (node.type === 'combate') {
    await startCombat(channel, session, node, client);
    return;
  }
  if (node.type === 'tirada') {
    const embed = new EmbedBuilder().setColor(0x1a1a2e).setTitle('🎲 Tirada de Habilidad').setDescription(node.text);
    await channel.send({ embeds: [embed] });
    await handleSkillCheck(channel, session, node, client);
    return;
  }
  if (node.type === 'fin') {
    await finishAdventure(channel, session, node, client);
    return;
  }

  // Historia
  const embed = new EmbedBuilder().setColor(0x1a1a2e).setTitle('📖 La aventura continúa...').setDescription(node.text);

  if (node.bonusGold) {
    for (const p of session.players) await Character.findByIdAndUpdate(p.characterId, { $inc: { gold: node.bonusGold } });
    embed.addFields({ name: '💰 Oro encontrado', value: `+${node.bonusGold} monedas para todos` });
  }
  if (node.bonusItem) {
    for (const p of session.players) await Character.findByIdAndUpdate(p.characterId, { $push: { inventory: node.bonusItem } });
    embed.addFields({ name: `${RARITY_EMOJI[node.bonusItem.rarity]} Objeto`, value: `**${node.bonusItem.name}** — ${node.bonusItem.description}` });
  }
  if (node.healPercent) {
    for (const p of session.players.filter(pl => pl.isAlive)) {
      const char = await Character.findById(p.characterId);
      const heal = Math.floor(char.hpMax * node.healPercent / 100);
      p.hp = Math.min(char.hpMax, p.hp + heal);
    }
    session.markModified('players');
    await session.save();
    embed.addFields({ name: '💚 Descanso', value: `El grupo recupera ${node.healPercent}% HP` });
  }

  const components = [];
  if (node.options && node.options.length > 0) {
    embed.setFooter({ text: '⏱️ 2 minutos para votar' });
    const votesField = session.players.filter(p => p.isAlive).map(p => `<@${p.userId}>: ⏳`).join('\n');
    embed.addFields({ name: '🗳️ Votos', value: votesField });

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

    session.lastActionAt = new Date();
    session.turnDeadline = new Date(Date.now() + TURN_TIMEOUT);
    for (const p of session.players) { p.hasActed = false; p.vote = null; }
    session.markModified('players');
    await session.save();

    await channel.send({ embeds: [embed], components });

    setTimeout(async () => {
      const fresh = await Session.findById(session._id);
      if (!fresh || fresh.status === 'pausada' || fresh.currentNode !== session.currentNode) return;
      const firstOpt = node.options[0];
      const nextNode = adventure.nodes[firstOpt.next];
      fresh.currentNode = firstOpt.next;
      await fresh.save();
      await channel.send({ content: `⏱️ **Tiempo agotado!** Avanzando con: *${firstOpt.label}*` });
      if (nextNode) await advanceNode(channel, fresh, nextNode, client);
    }, TURN_TIMEOUT + 5000);
  } else {
    await channel.send({ embeds: [embed] });
  }
}

// ─── BOTONES ─────────────────────────────────────────────────────────────────
async function handleButton(interaction, client) {
  const parts = interaction.customId.split('_');

  // Arena
  if (parts[0] === 'arena') {
    if (parts[1] === 'accept') {
      const [, , challengerId, challengedId, apuesta] = parts;
      if (interaction.user.id !== challengedId) return interaction.reply({ content: '❌ Este duelo no es para ti.', ephemeral: true });
      await interaction.update({ components: [] });
      await interaction.channel.send({ content: `⚔️ **¡El duelo comienza!** <@${challengerId}> VS <@${challengedId}>` });
      await executeArenaFight(interaction.channel, challengerId, challengedId, parseInt(apuesta) || 0, interaction.guildId, client);
    }
    if (parts[1] === 'reject') {
      const [, , challengerId] = parts;
      if (interaction.user.id !== parts[3]) return interaction.reply({ content: '❌ No es tu duelo.', ephemeral: true });
      await interaction.update({ content: `❌ <@${interaction.user.id}> rechazó el duelo.`, components: [] });
    }
    return;
  }

  // Reiniciar campaña
  if (parts[0] === 'reiniciar' && parts[1] === 'confirm') {
    const sessionId = parts[2];
    const session = await Session.findById(sessionId);
    if (session) { session.status = 'fallida'; await session.save(); }
    await interaction.update({ content: '✅ Campaña terminada. Usa `/aventura` para empezar una nueva.', components: [] });
    return;
  }
  if (parts[0] === 'reiniciar' && parts[1] === 'cancel') {
    return interaction.update({ content: '✅ Cancelado.', components: [] });
  }

  // Reiniciar personaje
  if (parts[0] === 'reset' && parts[1] === 'char' && parts[2] === 'confirm') {
    const userId = parts[3];
    const char = await Character.findOne({ userId, guildId: interaction.guildId });
    if (!char) return interaction.update({ content: '❌ Personaje no encontrado.', components: [] });

    const legendaries = char.inventory.filter(i => i.rarity === 'legendario');
    const classData = CLASSES[char.class];
    const conMod = getModifier(classData.stats.constitucion);
    const hpMax = classData.hitDie + conMod;

    char.level = 1;
    char.xp = 0;
    char.xpToNext = 300;
    char.stats = classData.stats;
    char.hpMax = Math.max(1, hpMax);
    char.hp = char.hpMax;
    char.gold = classData.startingGold;
    char.inventory = [...classData.startingItems, ...legendaries];
    char.bonificadorCompetencia = 2;
    char.resources = { rageTurns: 0, spellSlots: 3, healingUses: 3, secondWind: true, sneakReady: true };
    await char.save();

    return interaction.update({ content: `✅ **${char.name}** reiniciado al nivel 1. Los objetos legendarios se conservaron.`, components: [] });
  }
  if (parts[0] === 'reset' && parts[1] === 'char' && parts[2] === 'cancel') {
    return interaction.update({ content: '✅ Cancelado.', components: [] });
  }

  // Comercio
  if (parts[0] === 'trade') {
    const fromId = parts[2], toId = parts[3];
    if (interaction.user.id !== toId) return interaction.reply({ content: '❌ Esta oferta no es para ti.', ephemeral: true });

    const charFrom = await Character.findOne({ userId: fromId, guildId: interaction.guildId });
    const charTo = await Character.findOne({ userId: toId, guildId: interaction.guildId });
    if (!charTo.tradeOffer) return interaction.update({ content: '❌ La oferta ya no es válida.', components: [] });

    if (parts[1] === 'accept') {
      const offer = charTo.tradeOffer;
      if (offer.item) {
        const idx = charFrom.inventory.findIndex(i => i.name === offer.item.name);
        if (idx !== -1) {
          charFrom.inventory.splice(idx, 1);
          charTo.inventory.push(offer.item);
        }
      }
      if (offer.gold > 0) {
        charFrom.gold -= offer.gold;
        charTo.gold += offer.gold;
      }
      charTo.tradeOffer = null;
      await charFrom.save();
      await charTo.save();
      await interaction.update({ content: `✅ ¡Comercio completado! ${offer.item ? `**${offer.item.name}** transferido.` : ''} ${offer.gold > 0 ? `${offer.gold} oro transferido.` : ''}`, components: [] });
    }
    if (parts[1] === 'reject') {
      charTo.tradeOffer = null;
      await charTo.save();
      await interaction.update({ content: '❌ Oferta rechazada.', components: [] });
    }
    return;
  }

  // Elección de nodo
  if (parts[0] === 'choice') {
    const sessionId = parts[1];
    const nextNodeId = parts.slice(2).join('_');
    const session = await Session.findById(sessionId);
    if (!session || session.status !== 'activa') return interaction.reply({ content: '❌ Esta sesión ya no está activa.', ephemeral: true });

    const player = session.players.find(p => p.userId === interaction.user.id);
    if (!player) return interaction.reply({ content: '❌ No eres parte de esta aventura.', ephemeral: true });
    if (player.hasActed) return interaction.reply({ content: '✅ Ya has votado.', ephemeral: true });

    player.hasActed = true;
    player.vote = nextNodeId;
    session.markModified('players');
    await session.save();
    await interaction.reply({ content: '✅ Voto registrado.', ephemeral: true });

    const activePlayers = session.players.filter(p => p.isAlive);
    if (activePlayers.every(p => p.hasActed)) {
      const votes = {};
      for (const p of activePlayers) votes[p.vote] = (votes[p.vote] || 0) + 1;
      const winningChoice = Object.entries(votes).sort((a, b) => b[1] - a[1])[0][0];
      const adventure = getAdventure(session.adventureId, client);
      const nextNode = adventure?.nodes[winningChoice];
      for (const p of session.players) { p.hasActed = false; p.vote = null; }
      session.currentNode = winningChoice;
      session.markModified('players');
      await session.save();
      await interaction.channel.send({ content: '🗳️ **¡Todos han votado!** Avanzando...' });
      if (nextNode) await advanceNode(interaction.channel, session, nextNode, client);
    }
    return;
  }

  // Acciones de combate
  if (parts[0] === 'combat') {
    await handleCombatAction(interaction, parts, client);
  }
}

// ─── TIRADA DE HABILIDAD ─────────────────────────────────────────────────────
async function handleSkillCheck(channel, session, node, client) {
  const adventure = getAdventure(session.adventureId, client);
  const chars = await Promise.all(session.players.filter(p => p.isAlive).map(p => Character.findById(p.characterId)));

  let bestMod = -5, bestChar = null;
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
    .addFields({ name: 'Resultado', value: success ? node.successText : node.failText });

  if (node.damage && !success) {
    const dmg = rollDice(node.damage);
    for (const p of session.players.filter(p => p.isAlive)) p.hp = Math.max(0, p.hp - dmg.total);
    embed.addFields({ name: '💥 Daño', value: `${dmg.display} daño al grupo` });
    session.markModified('players');
    await session.save();
  }
  if (node.bonusXp && success) {
    for (const p of session.players.filter(pl => pl.isAlive)) {
      await Character.findByIdAndUpdate(p.characterId, { $inc: { xp: node.bonusXp } });
    }
    embed.addFields({ name: '⭐ Bonus XP', value: `+${node.bonusXp} XP` });
  }

  await channel.send({ embeds: [embed] });

  const nextNodeId = success ? node.successNext : node.failNext;
  const nextNode = adventure?.nodes[nextNodeId];
  session.currentNode = nextNodeId;
  await session.save();
  setTimeout(async () => { if (nextNode) await advanceNode(channel, session, nextNode, client); }, 2000);
}

// ─── COMBATE ─────────────────────────────────────────────────────────────────
async function startCombat(channel, session, node, client) {
  session.status = 'combate';
  session.currentCombat = { enemies: node.enemies.map(e => ({ ...e })), turn: 0, playerOrder: [], enemyTurn: false };

  const chars = await Promise.all(session.players.filter(p => p.isAlive).map(p => Character.findById(p.characterId)));
  const initiatives = [];
  for (const char of chars) {
    const init = rollInitiative(getModifier(char.stats.destreza));
    const uid = session.players.find(p => p.characterId.toString() === char._id.toString())?.userId;
    initiatives.push({ userId: uid, name: char.name, initiative: init.total, roll: init.roll });
  }
  initiatives.sort((a, b) => b.initiative - a.initiative);
  session.currentCombat.playerOrder = initiatives.map(i => i.userId);
  await session.save();

  const initText = initiatives.map((i, idx) => `${idx + 1}. **${i.name}** — ${i.initiative} (🎲${i.roll})`).join('\n');
  const enemyList = node.enemies.map(e => `👾 **${e.name}** — ❤️${e.hp} | 🛡️CA${e.ca}`).join('\n');

  await channel.send({ embeds: [new EmbedBuilder().setColor(0xc62828).setTitle('⚔️ ¡COMBATE!').setDescription(node.text)
    .addFields({ name: '📋 Iniciativa', value: initText }, { name: '👾 Enemigos', value: enemyList })] });

  await sendCombatTurn(channel, session, client);
}

async function sendCombatTurn(channel, session, client) {
  const combat = session.currentCombat;
  const aliveEnemies = combat.enemies.filter(e => e.hp > 0);
  if (aliveEnemies.length === 0) { await endCombat(channel, session, true, client); return; }

  const currentUserId = combat.playerOrder[combat.turn % combat.playerOrder.length];
  const player = session.players.find(p => p.userId === currentUserId);
  if (!player || !player.isAlive || player.hp <= 0) {
    combat.turn++;
    session.markModified('currentCombat');
    await session.save();
    if (combat.turn % combat.playerOrder.length === 0) { await enemyTurn(channel, session, client); }
    else { await sendCombatTurn(channel, session, client); }
    return;
  }

  const char = await Character.findById(player.characterId);
  const classData = CLASSES[char.class];
  const enemyStatus = aliveEnemies.map((e, i) => `${i + 1}. **${e.name}** ❤️${e.hp}/${e.hpMax} CA${e.ca}`).join('\n');
  const playerStatus = session.players.filter(p => p.isAlive).map(p => `<@${p.userId}>: ❤️${p.hp}`).join(' | ');

  const embed = new EmbedBuilder().setColor(0xff6f00)
    .setTitle(`⚔️ Turno de ${char.name}`)
    .addFields({ name: '👾 Enemigos', value: enemyStatus }, { name: '❤️ Grupo', value: playerStatus })
    .setFooter({ text: `❤️ Tu HP: ${player.hp}/${char.hpMax} | ⏱️ 2 min` });

  // Botones según clase
  const row1 = new ActionRowBuilder();
  row1.addComponents(
    new ButtonBuilder().setCustomId(`combat_${session._id}_attack_0`).setLabel('⚔️ Atacar').setStyle(ButtonStyle.Danger),
  );

  // Habilidades de clase
  if (char.class === 'mago' && char.resources.spellSlots > 0) {
    row1.addComponents(new ButtonBuilder().setCustomId(`combat_${session._id}_spell_bola`).setLabel(`🔥 Bola de Fuego (${char.resources.spellSlots} ranuras)`).setStyle(ButtonStyle.Primary));
    row1.addComponents(new ButtonBuilder().setCustomId(`combat_${session._id}_spell_misil`).setLabel('✨ Misil Mágico').setStyle(ButtonStyle.Primary));
  }
  if (char.class === 'clerigo' && char.resources.healingUses > 0) {
    row1.addComponents(new ButtonBuilder().setCustomId(`combat_${session._id}_heal`).setLabel(`✨ Curar (${char.resources.healingUses})`).setStyle(ButtonStyle.Success));
  }
  if (char.class === 'barbaro' && char.resources.rageTurns < 2) {
    row1.addComponents(new ButtonBuilder().setCustomId(`combat_${session._id}_rage`).setLabel('💢 Furia').setStyle(ButtonStyle.Danger));
  }
  if (char.class === 'guerrero' && char.resources.secondWind) {
    row1.addComponents(new ButtonBuilder().setCustomId(`combat_${session._id}_secondwind`).setLabel('💨 2do Aliento').setStyle(ButtonStyle.Success));
  }

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`combat_${session._id}_potion`).setLabel('🧪 Poción').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`combat_${session._id}_defend`).setLabel('🛡️ Defender').setStyle(ButtonStyle.Primary),
  );

  await channel.send({ content: `<@${currentUserId}>`, embeds: [embed], components: [row1, row2] });

  setTimeout(async () => {
    const fresh = await Session.findById(session._id);
    if (!fresh || fresh.status !== 'combate' || fresh.currentCombat.turn !== combat.turn) return;
    await channel.send({ content: `⏱️ **${char.name}** ataca automáticamente.` });
    await processCombatAttack(channel, fresh, currentUserId, 0, client);
  }, TURN_TIMEOUT + 5000);
}

async function handleCombatAction(interaction, parts, client) {
  const sessionId = parts[1], action = parts[2], extra = parts[3];
  const session = await Session.findById(sessionId);
  if (!session || session.status !== 'combate') return interaction.reply({ content: '❌ No hay combate activo.', ephemeral: true });

  const combat = session.currentCombat;
  const currentUserId = combat.playerOrder[combat.turn % combat.playerOrder.length];
  if (interaction.user.id !== currentUserId) return interaction.reply({ content: '❌ No es tu turno.', ephemeral: true });

  await interaction.deferReply();

  if (action === 'attack') await processCombatAttack(interaction.channel, session, currentUserId, parseInt(extra) || 0, client, interaction);
  else if (action === 'spell') await processCombatSpell(interaction.channel, session, currentUserId, extra, client, interaction);
  else if (action === 'heal') await processCombatHeal(interaction.channel, session, currentUserId, client, interaction);
  else if (action === 'rage') await processCombatRage(interaction.channel, session, currentUserId, client, interaction);
  else if (action === 'secondwind') await processSecondWind(interaction.channel, session, currentUserId, client, interaction);
  else if (action === 'potion') await processCombatPotion(interaction.channel, session, currentUserId, client, interaction);
  else if (action === 'defend') await processCombatDefend(interaction.channel, session, currentUserId, client, interaction);
}

async function processCombatAttack(channel, session, userId, targetIdx, client, interaction = null) {
  const player = session.players.find(p => p.userId === userId);
  const char = await Character.findById(player.characterId);
  const classData = CLASSES[char.class];
  const combat = session.currentCombat;
  const aliveEnemies = combat.enemies.filter(e => e.hp > 0);
  const target = aliveEnemies[targetIdx] || aliveEnemies[0];
  if (!target) return;

  const primaryStat = char.stats[classData.primaryStat] || 10;
  const weapon = char.inventory.find(i => i.type === 'arma' && i.equipped) || char.inventory.find(i => i.type === 'arma');
  const weaponBonus = weapon?.bonus || 0;

  // Pícaro: Ataque Furtivo si hay aliados vivos adyacentes
  const hasAlly = session.players.filter(p => p.isAlive && p.userId !== userId).length > 0;
  const isSneakAttack = char.class === 'picaro' && hasAlly && char.resources.sneakReady;

  const attackBonus = getModifier(primaryStat) + char.bonificadorCompetencia + weaponBonus;
  const isRaging = char.resources?.rageTurns > 0;
  const attackRoll = rollAttack(attackBonus);
  let resultText = '';

  if (attackRoll.isFumble) {
    resultText = `💨 **${char.name}** falla (pifia d20:1)`;
  } else if (attackRoll.isCrit || attackRoll.total >= target.ca) {
    const dmgNotation = weapon ? getDamageForWeapon(weapon.name) : getDefaultDamage(char.class);
    const dmgResult = rollDamage(dmgNotation + (weaponBonus > 0 ? `+${weaponBonus}` : ''), attackRoll.isCrit);
    let totalDmg = dmgResult.total + getModifier(primaryStat);
    if (isRaging) totalDmg += 2; // Bonus furia
    if (isSneakAttack) {
      const sneakDmg = rollDice(`${Math.ceil(char.level / 2)}d6`);
      totalDmg += sneakDmg.total;
      char.resources.sneakReady = false;
      await char.save();
      resultText += `🗡️ **Ataque Furtivo** +${sneakDmg.total} daño!\n`;
    }

    const enemyInSession = session.currentCombat.enemies.find(e => e.name === target.name && e.hp > 0);
    if (enemyInSession) enemyInSession.hp = Math.max(0, enemyInSession.hp - totalDmg);

    const critText = attackRoll.isCrit ? ' 💥¡CRÍTICO!' : '';
    const rageTxt = isRaging ? ' 💢+2(Furia)' : '';
    resultText += `⚔️ **${char.name}** → **${target.name}**${critText}${rageTxt}\n🎲 ${attackRoll.d20}+${attackBonus}=**${attackRoll.total}** vs CA${target.ca} — IMPACTO\n💥 **${totalDmg}** daño | ❤️${Math.max(0, enemyInSession.hp)}/${target.hpMax}`;
  } else {
    resultText = `🛡️ **${char.name}** falla (${attackRoll.total} vs CA${target.ca})`;
  }

  session.markModified('currentCombat');
  await session.save();
  if (interaction) await interaction.editReply({ content: resultText });
  else await channel.send({ content: resultText });
  await advanceCombatTurn(channel, session, client);
}

async function processCombatSpell(channel, session, userId, spellType, client, interaction) {
  const player = session.players.find(p => p.userId === userId);
  const char = await Character.findById(player.characterId);
  if (char.resources.spellSlots <= 0) {
    await interaction.editReply({ content: '❌ No tienes ranuras de hechizo.' });
    return;
  }

  const combat = session.currentCombat;
  const aliveEnemies = combat.enemies.filter(e => e.hp > 0);
  const intMod = getModifier(char.stats.inteligencia);
  let resultText = '';

  if (spellType === 'bola') {
    // Bola de Fuego: afecta a todos los enemigos
    const dmg = rollDice('3d6');
    const totalDmg = dmg.total + intMod;
    for (const e of aliveEnemies) e.hp = Math.max(0, e.hp - totalDmg);
    resultText = `🔥 **${char.name}** lanza **Bola de Fuego**!\n💥 ${dmg.display}+${intMod} = **${totalDmg}** daño a TODOS los enemigos\n`;
    resultText += aliveEnemies.map(e => `• ${e.name}: ❤️${e.hp}/${e.hpMax}`).join('\n');
  } else if (spellType === 'misil') {
    // Misil Mágico: 3 misiles automáticos al primer enemigo
    let totalDmg = 0;
    const misiles = [rollDice('1d4+1'), rollDice('1d4+1'), rollDice('1d4+1')];
    misiles.forEach(m => totalDmg += m.total);
    const target = aliveEnemies[0];
    if (target) target.hp = Math.max(0, target.hp - totalDmg);
    resultText = `✨ **${char.name}** lanza **Misil Mágico** (3 misiles, no falla)\n💥 ${misiles.map(m => m.total).join('+')} = **${totalDmg}** daño a **${target?.name}**\n❤️${target?.hp}/${target?.hpMax}`;
  }

  char.resources.spellSlots--;
  await char.save();
  session.markModified('currentCombat');
  await session.save();
  await interaction.editReply({ content: resultText });
  await advanceCombatTurn(channel, session, client);
}

async function processCombatHeal(channel, session, userId, client, interaction) {
  const player = session.players.find(p => p.userId === userId);
  const char = await Character.findById(player.characterId);
  if (char.resources.healingUses <= 0) {
    await interaction.editReply({ content: '❌ No tienes curaciones disponibles.' });
    return;
  }

  const sabMod = getModifier(char.stats.sabiduria);
  // Curar al aliado con menos HP
  const alivePlayers = session.players.filter(p => p.isAlive);
  const lowestHpPlayer = alivePlayers.sort((a, b) => a.hp - b.hp)[0];
  const targetChar = await Character.findById(lowestHpPlayer.characterId);
  const heal = rollDice(`1d8`);
  const totalHeal = heal.total + sabMod;
  lowestHpPlayer.hp = Math.min(targetChar.hpMax, lowestHpPlayer.hp + totalHeal);

  char.resources.healingUses--;
  await char.save();
  session.markModified('players');
  await session.save();
  await interaction.editReply({ content: `✨ **${char.name}** cura a <@${lowestHpPlayer.userId}>!\n${heal.display}+${sabMod} = **${totalHeal}** HP recuperados. ❤️${lowestHpPlayer.hp}/${targetChar.hpMax}` });
  await advanceCombatTurn(channel, session, client);
}

async function processCombatRage(channel, session, userId, client, interaction) {
  const player = session.players.find(p => p.userId === userId);
  const char = await Character.findById(player.characterId);
  char.resources.rageTurns = 3; // Dura 3 turnos
  await char.save();
  await interaction.editReply({ content: `💢 **${char.name}** entra en **FURIA**!\n+2 daño en ataques | Resistencia a daño físico | Dura 3 turnos` });
  await advanceCombatTurn(channel, session, client);
}

async function processSecondWind(channel, session, userId, client, interaction) {
  const player = session.players.find(p => p.userId === userId);
  const char = await Character.findById(player.characterId);
  const heal = rollDice(`1d10`);
  const totalHeal = heal.total + char.level;
  player.hp = Math.min(char.hpMax, player.hp + totalHeal);
  char.resources.secondWind = false;
  await char.save();
  session.markModified('players');
  await session.save();
  await interaction.editReply({ content: `💨 **${char.name}** usa **Segundo Aliento**!\n${heal.display}+${char.level} = **${totalHeal}** HP. ❤️${player.hp}/${char.hpMax}` });
  await advanceCombatTurn(channel, session, client);
}

async function processCombatPotion(channel, session, userId, client, interaction) {
  const player = session.players.find(p => p.userId === userId);
  const char = await Character.findById(player.characterId);
  const potion = char.inventory.find(i => i.type === 'pocion');
  if (!potion) { await interaction.editReply({ content: '❌ No tienes pociones.' }); return; }
  const heal = rollDice('2d4+2');
  player.hp = Math.min(char.hpMax, player.hp + heal.total);
  char.inventory.splice(char.inventory.indexOf(potion), 1);
  await char.save();
  session.markModified('players');
  await session.save();
  await interaction.editReply({ content: `🧪 **${char.name}** bebe poción. +${heal.total} HP. ❤️${player.hp}/${char.hpMax}` });
  await advanceCombatTurn(channel, session, client);
}

async function processCombatDefend(channel, session, userId, client, interaction) {
  const player = session.players.find(p => p.userId === userId);
  player.tempEffects = [...(player.tempEffects || []), 'defending'];
  session.markModified('players');
  await session.save();
  const char = await Character.findById(player.characterId);
  await interaction.editReply({ content: `🛡️ **${char.name}** adopta postura defensiva. +2 CA hasta su próximo turno.` });
  await advanceCombatTurn(channel, session, client);
}

async function advanceCombatTurn(channel, session, client) {
  const combat = session.currentCombat;
  const aliveEnemies = combat.enemies.filter(e => e.hp > 0);
  if (aliveEnemies.length === 0) { await endCombat(channel, session, true, client); return; }

  combat.turn++;
  const allPlayersDone = combat.turn % combat.playerOrder.length === 0;
  session.markModified('currentCombat');
  await session.save();

  if (allPlayersDone) await enemyTurn(channel, session, client);
  else await sendCombatTurn(channel, session, client);
}

async function enemyTurn(channel, session, client) {
  const combat = session.currentCombat;
  const aliveEnemies = combat.enemies.filter(e => e.hp > 0);
  const alivePlayers = session.players.filter(p => p.isAlive && p.hp > 0);
  if (alivePlayers.length === 0) { await endCombat(channel, session, false, client); return; }

  let txt = '👾 **Turno de enemigos:**\n';
  for (const enemy of aliveEnemies) {
    const target = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
    const char = await Character.findById(target.characterId);
    const isDefending = target.tempEffects?.includes('defending');
    const targetCA = char.ca + (isDefending ? 2 : 0);
    const attackRoll = rollAttack(enemy.ataque);

    if (attackRoll.isFumble) {
      txt += `• **${enemy.name}** falla (pifia)\n`;
    } else if (attackRoll.isCrit || attackRoll.total >= targetCA) {
      const dmgResult = rollDice(enemy.danio || '1d6');
      let totalDmg = Math.max(1, dmgResult.total);

      // Resistencia de bárbaro en furia
      const targetCharFull = await Character.findById(target.characterId);
      if (targetCharFull.class === 'barbaro' && targetCharFull.resources.rageTurns > 0) {
        totalDmg = Math.floor(totalDmg / 2);
        targetCharFull.resources.rageTurns--;
        await targetCharFull.save();
        txt += `🛡️ ¡Resistencia bárbara! Daño reducido a la mitad.\n`;
      }

      target.hp = Math.max(0, target.hp - totalDmg);
      const critTxt = attackRoll.isCrit ? ' 💥CRIT' : '';
      txt += `• **${enemy.name}**${critTxt} → <@${target.userId}>: **${totalDmg}** daño. ❤️${target.hp}\n`;
      if (target.hp <= 0) { target.isAlive = false; txt += `  ☠️ <@${target.userId}> ha caído!\n`; }
    } else {
      txt += `• **${enemy.name}** falla vs <@${target.userId}> (${attackRoll.total} vs CA${targetCA})\n`;
    }
    target.tempEffects = [];
  }

  session.markModified('players');
  session.markModified('currentCombat');
  await session.save();
  await channel.send({ content: txt });

  const stillAlive = session.players.filter(p => p.isAlive && p.hp > 0);
  if (stillAlive.length === 0) { await endCombat(channel, session, false, client); return; }
  await sendCombatTurn(channel, session, client);
}

async function endCombat(channel, session, victory, client) {
  const adventure = getAdventure(session.adventureId, client);
  const node = adventure?.nodes[session.currentNode];
  const nextNodeId = victory ? node?.nextOnWin : node?.nextOnLoss;
  const nextNode = adventure?.nodes[nextNodeId];

  session.status = 'activa';
  session.currentNode = nextNodeId;
  session.currentCombat = null;

  if (victory) {
    const xpGained = node?.enemies?.reduce((s, e) => s + e.xpReward, 0) || 0;
    const gold = Math.floor(xpGained / 10);
    const loot = rollLoot('normal', node?.isBoss || false);
    const lootText = loot.length > 0 ? loot.map(i => `${RARITY_EMOJI[i.rarity]} **${i.name}**`).join('\n') : 'Sin botín';

    const embed = new EmbedBuilder().setColor(0x4caf50).setTitle('🏆 ¡Victoria!')
      .addFields({ name: '⭐ XP', value: `+${xpGained}`, inline: true }, { name: '💰 Oro', value: `+${gold}`, inline: true }, { name: '🎁 Botín', value: lootText });
    await channel.send({ embeds: [embed] });

    for (const p of session.players.filter(pl => pl.isAlive)) {
      const char = await Character.findById(p.characterId);
      char.xp += xpGained;
      char.gold += gold;
      char.hp = p.hp;
      char.totalKills += node?.enemies?.length || 0;
      char.resources.sneakReady = true; // Reset furtivo

      if (loot.length > 0) {
        const charLoot = loot[Math.floor(Math.random() * loot.length)];
        char.inventory.push(charLoot);
        if (charLoot.rarity === 'legendario') await channel.send({ content: `🌟 ¡<@${p.userId}> obtiene **${charLoot.name}** LEGENDARIO!` });
      }

      const newLevel = checkLevelUp(char);
      if (newLevel) {
        const levelInfo = applyLevelUp(char, CLASSES[char.class]);
        await channel.send({ content: `🎉 **¡${char.name} sube al nivel ${newLevel}!** +${levelInfo.hpGain} HP máximo` });
      }
      await char.save();
    }

    // Actualizar mundo del servidor
    if (node?.isBoss) {
      await Guild.findOneAndUpdate(
        { guildId: session.guildId },
        { $inc: { 'world.totalBossesDefeated': 1 } },
        { upsert: true },
      );
    }
    await Guild.findOneAndUpdate(
      { guildId: session.guildId },
      { $inc: { 'world.totalAdventuresCompleted': 0 } },
      { upsert: true },
    );
  } else {
    await channel.send({ content: '💀 **El grupo ha sido derrotado...**' });
  }

  await session.save();
  setTimeout(async () => { if (nextNode) await advanceNode(channel, session, nextNode, client); }, 3000);
}

async function finishAdventure(channel, session, node, client) {
  const embed = new EmbedBuilder()
    .setColor(node.success ? 0x4caf50 : 0xf44336)
    .setTitle(node.success ? '🏆 ¡AVENTURA COMPLETADA!' : '💀 Aventura Fallida')
    .setDescription(node.text);

  if (node.success) {
    const xp = node.xpReward;
    const gold = Math.floor(Math.random() * ((node.goldReward?.max || 50) - (node.goldReward?.min || 10) + 1)) + (node.goldReward?.min || 10);
    embed.addFields({ name: '⭐ XP', value: `+${xp}`, inline: true }, { name: '💰 Oro', value: `+${gold}`, inline: true });

    const allLoot = [];
    for (let i = 0; i < (node.lootRolls || 1); i++) allLoot.push(...rollLoot('jefe', node.isBoss));
    if (allLoot.length > 0) embed.addFields({ name: '🎁 Recompensas', value: allLoot.map(i => `${RARITY_EMOJI[i.rarity]} **${i.name}**`).join('\n') });

    for (const p of session.players.filter(pl => pl.isAlive)) {
      const char = await Character.findById(p.characterId);
      char.xp += xp;
      char.gold += gold;
      char.adventuresCompleted += 1;
      char.hp = char.hpMax;
      if (allLoot.length > 0) {
        const charLoot = allLoot[Math.floor(Math.random() * allLoot.length)];
        char.inventory.push(charLoot);
        if (charLoot.rarity === 'legendario') await channel.send({ content: `🌟✨ ¡**${char.name}** obtiene el legendario **${charLoot.name}**!` });
      }
      const newLevel = checkLevelUp(char);
      if (newLevel) {
        const levelInfo = applyLevelUp(char, CLASSES[char.class]);
        embed.addFields({ name: '🎉 ¡Nivel Up!', value: `${char.name} → Nv.${newLevel} (+${levelInfo.hpGain} HP)` });
      }

      // Reputación
      await updateReputation(char, session.guildId, 50);
      await char.save();
    }

    // Actualizar mundo del servidor
    await Guild.findOneAndUpdate(
      { guildId: session.guildId },
      { $inc: { 'world.totalAdventuresCompleted': 1 } },
      { upsert: true },
    );
    await checkWorldLevelUp(session.guildId, channel);
  }

  session.status = node.success ? 'completada' : 'fallida';
  await session.save();
  await channel.send({ embeds: [embed] });
}

async function updateReputation(char, guildId, amount) {
  const guildData = await Guild.findOne({ guildId });
  if (!guildData) return;
  // Dar reputación a facción aleatoria del servidor
  const factions = ['gremio_aventureros', 'reino_norte', 'orden_magica'];
  const faction = factions[Math.floor(Math.random() * factions.length)];
  if (!char.reputation) char.reputation = {};
  char.reputation[faction] = (char.reputation[faction] || 0) + amount;
  char.markModified('reputation');
}

async function checkWorldLevelUp(guildId, channel) {
  const guildData = await Guild.findOne({ guildId });
  if (!guildData) return;
  const thresholds = [0, 5, 15, 30, 50, 75];
  const currentLevel = guildData.world.worldLevel;
  const adventures = guildData.world.totalAdventuresCompleted;
  if (currentLevel < thresholds.length - 1 && adventures >= thresholds[currentLevel]) {
    guildData.world.worldLevel++;
    await guildData.save();
    await channel.send({ content: `🌍 **¡El mundo ha evolucionado al nivel ${guildData.world.worldLevel}!** Nuevas zonas desbloqueadas. Usa \`/mundo mapa\` para ver.` });
  }
}

function getAdventure(adventureId, client) {
  if (client?.tempAdventures?.[adventureId]) return client.tempAdventures[adventureId];
  return ADVENTURES[adventureId];
}

function getDamageForWeapon(name) {
  const map = { 'Espada': '1d8', 'Hacha': '1d8', 'Daga': '1d4', 'Maza': '1d6', 'Arco': '1d8', 'Baculo': '1d6' };
  for (const [k, v] of Object.entries(map)) { if (name.includes(k)) return v; }
  return '1d6';
}
function getDefaultDamage(cls) {
  return { guerrero:'1d8', mago:'1d6', picaro:'1d4', clerigo:'1d6', arquero:'1d8', barbaro:'1d12' }[cls] || '1d6';
}

module.exports = { startAdventure, startAdventureWithData, handleButton, advanceNode };
