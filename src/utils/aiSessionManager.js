const AISession = require('../models/AISession');
const Character = require('../models/Character');
const Guild = require('../models/Guild');
const { narrateScene, processGroupActions, parseAIResponse, resolveSkillCheck, SYSTEM_PROMPT } = require('./dmAI');
const { rollAttack, rollDice, rollInitiative } = require('./dice');
const { CLASSES, getModifier, checkLevelUp, applyLevelUp } = require('../data/classes');
const { rollLoot } = require('../data/items');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const ACTION_TIMEOUT = 2 * 60 * 1000; // 2 minutos
const RARITY_EMOJI = { comun:'⚪', infrecuente:'🟢', raro:'🔵', epico:'🟣', legendario:'🟠' };

// ─── INICIAR AVENTURA CON IA ──────────────────────────────────────
async function startAIAdventure(channel, adventureData, playerIds, guildId, client) {
  const players = [];
  for (const userId of playerIds) {
    const char = await Character.findOne({ userId, guildId });
    if (!char) {
      await channel.send(`❌ <@${userId}> no tiene personaje. Usa \`/crear_personaje\` primero.`);
      return;
    }
    players.push({ userId, characterId: char._id, hp: char.hp, isAlive: true, hasActed: false });
  }

  const session = new AISession({
    guildId,
    channelId: channel.id,
    adventureId: adventureData.id || 'ai_generated',
    adventureTitle: adventureData.title,
    players,
    currentScene: 'intro',
    sceneContext: adventureData.intro || adventureData.description,
    aiAdventureData: adventureData,
    conversationHistory: [],
  });
  await session.save();

  // Embed de inicio
  const embed = new EmbedBuilder()
    .setColor(0x4a148c)
    .setTitle(`✨ ${adventureData.title}`)
    .setDescription(adventureData.description)
    .addFields(
      { name: '👥 Aventureros', value: playerIds.map(id => `<@${id}>`).join(', ') },
      { name: '💡 Cómo jugar', value: 'El DM narrará la historia. **Escribid vuestras acciones libremente** en el chat. Todos debéis actuar antes de que el DM continúe.\n\nTambién podéis usar botones cuando aparezcan.' },
    )
    .setFooter({ text: '/guardar para pausar | /descansar para recuperar HP' });

  await channel.send({ embeds: [embed] });

  // Narrar intro con GPT
  await narrateCurrentScene(channel, session, client);
}

// ─── NARRAR ESCENA ACTUAL ─────────────────────────────────────────
async function narrateCurrentScene(channel, session, client) {
  const adventure = session.aiAdventureData;
  let context = session.sceneContext;

  // Obtener escena actual si es aventura estructurada
  if (adventure.scenes) {
    const scene = adventure.scenes.find(s => s.id === session.currentScene) ||
                  (session.currentScene === 'intro' ? { context: adventure.intro, narration: adventure.intro } : null) ||
                  (session.currentScene === 'finale' ? adventure.finale : null);
    if (scene) context = scene.context || scene.narration || context;
  }

  const playerNames = await getPlayerNames(session);

  try {
    const narration = await narrateScene(context, session.conversationHistory.slice(-10), playerNames);
    const parsed = parseAIResponse(narration);

    // Actualizar historial
    session.conversationHistory.push({ role: 'assistant', content: parsed.narration });
    session.sceneContext = context;

    // Mostrar narración
    const embed = new EmbedBuilder()
      .setColor(0x1a237e)
      .setDescription(`📖 ${parsed.narration}`)
      .setFooter({ text: '✍️ Escribid vuestra acción en el chat | Tenéis 2 minutos' });

    await channel.send({ embeds: [embed] });

    // Si hay combate inmediato en la narración
    if (parsed.combates.length > 0) {
      await initiateCombat(channel, session, parsed.combates, client);
      return;
    }

    // Si hay tirada inmediata
    if (parsed.tiradas.length > 0) {
      await handleAutoRoll(channel, session, parsed.tiradas[0], context, client);
      return;
    }

    // Esperar acciones del grupo
    await waitForGroupActions(channel, session, context, client);

  } catch (err) {
    console.error('GPT Error:', err);
    await channel.send('⚠️ El DM necesita un momento... intenta de nuevo con `/continuar`');
  }
}

// ─── ESPERAR ACCIONES DEL GRUPO ───────────────────────────────────
async function waitForGroupActions(channel, session, context, client) {
  session.status = 'esperando_acciones';
  session.actionDeadline = new Date(Date.now() + ACTION_TIMEOUT);
  for (const p of session.players) { p.hasActed = false; p.currentAction = null; }
  session.markModified('players');
  await session.save();

  // Guardar en cliente para acceso desde el event listener
  if (!client.aiSessions) client.aiSessions = {};
  client.aiSessions[channel.id] = session._id.toString();

  // Timeout: si no todos actúan, procesar con lo que hay
  setTimeout(async () => {
    const fresh = await AISession.findById(session._id);
    if (!fresh || fresh.status !== 'esperando_acciones') return;

    const acted = fresh.players.filter(p => p.isAlive && p.hasActed);
    if (acted.length === 0) {
      await channel.send('⏱️ **Tiempo agotado.** El grupo permanece inmóvil... El DM describe lo que pasa.');
      await processPlayerActions(channel, fresh, [{ name: 'El grupo', class: 'aventureros', action: 'esperan sin actuar, mirándose entre sí nerviosamente' }], context, client);
    } else {
      await channel.send(`⏱️ **Tiempo agotado.** Procesando acciones de ${acted.length} jugador(es)...`);
      const actions = acted.map(p => ({ name: p._name || 'Jugador', class: 'aventurero', action: p.currentAction }));
      await processPlayerActions(channel, fresh, actions, context, client);
    }
  }, ACTION_TIMEOUT + 5000);
}

// ─── RECIBIR MENSAJE DE JUGADOR ───────────────────────────────────
async function handlePlayerMessage(message, client) {
  if (!client.aiSessions) return;
  const sessionId = client.aiSessions[message.channel.id];
  if (!sessionId) return;

  const session = await AISession.findById(sessionId);
  if (!session || session.status !== 'esperando_acciones') return;

  const player = session.players.find(p => p.userId === message.author.id && p.isAlive);
  if (!player) return;
  if (player.hasActed) {
    await message.react('✅');
    return;
  }

  const char = await Character.findById(player.characterId);
  player.hasActed = true;
  player.currentAction = message.content.slice(0, 200);
  player._name = char.name;
  session.markModified('players');
  await session.save();

  await message.react('⚔️');

  // Agregar al historial de conversación
  session.conversationHistory.push({
    role: 'user',
    content: `${char.name} (${CLASSES[char.class].name}): "${message.content}"`,
  });
  await session.save();

  // Verificar si todos actuaron
  const alivePlayers = session.players.filter(p => p.isAlive);
  const allActed = alivePlayers.every(p => p.hasActed);

  if (allActed) {
    await message.channel.send('✅ **Todos han actuado. El DM procesa...**');
    const actions = alivePlayers.map(p => ({
      name: p._name || 'Jugador',
      class: 'aventurero',
      action: p.currentAction,
    }));
    await processPlayerActions(message.channel, session, actions, session.sceneContext, client);
  } else {
    const remaining = alivePlayers.filter(p => !p.hasActed).map(p => `<@${p.userId}>`).join(', ');
    await message.channel.send({ content: `⏳ Esperando a: ${remaining}`, allowedMentions: { parse: [] } });
  }
}

// ─── PROCESAR ACCIONES ────────────────────────────────────────────
async function processPlayerActions(channel, session, actions, context, client) {
  session.status = 'procesando';
  await session.save();

  const playerChars = await Promise.all(
    session.players.filter(p => p.isAlive).map(async p => {
      const char = await Character.findById(p.characterId);
      return { ...char.toObject(), hp: p.hp };
    })
  );

  try {
    const response = await processGroupActions(actions, context, session.conversationHistory.slice(-12), playerChars);
    const parsed = parseAIResponse(response);

    // Actualizar historial
    session.conversationHistory.push({ role: 'assistant', content: parsed.narration });

    // Mostrar narración
    const embed = new EmbedBuilder()
      .setColor(0x1b5e20)
      .setDescription(`🎲 ${parsed.narration}`);

    await channel.send({ embeds: [embed] });

    // Procesar tiradas si las hay
    if (parsed.tiradas.length > 0) {
      for (const tirada of parsed.tiradas) {
        await handleAutoRoll(channel, session, tirada, context, client);
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    // Procesar recompensas
    if (parsed.recompensas.length > 0) {
      for (const r of parsed.recompensas) {
        await distributeRewards(channel, session, r.xp, r.oro);
      }
    }

    // Procesar combates
    if (parsed.combates.length > 0) {
      await initiateCombat(channel, session, parsed.combates, client);
      return;
    }

    // Avanzar escena si hay objetivo completado
    if (parsed.objetivos.length > 0) {
      await advanceScene(channel, session, client);
      return;
    }

    // Continuar en la misma escena
    await session.save();
    await waitForGroupActions(channel, session, parsed.narration, client);

  } catch (err) {
    console.error('GPT process error:', err);
    session.status = 'activa';
    await session.save();
    await channel.send('⚠️ El DM tuvo un problema. Usa `/continuar` para retomar.');
  }
}

// ─── TIRADA AUTOMÁTICA ────────────────────────────────────────────
async function handleAutoRoll(channel, session, tirada, context, client) {
  const playerChars = await Promise.all(
    session.players.filter(p => p.isAlive).map(async p => {
      const char = await Character.findById(p.characterId);
      return { ...char.toObject(), hp: p.hp };
    })
  );

  const { success, result, bestChar, narration } = await resolveSkillCheck(
    tirada.stat, tirada.dc, playerChars, session.conversationHistory.slice(-8), context
  );

  const embed = new EmbedBuilder()
    .setColor(success ? 0x4caf50 : 0xf44336)
    .setTitle(`🎲 Tirada de ${tirada.stat.toUpperCase()} DC${tirada.dc}`)
    .setDescription(`**${bestChar.name}** lidera: ${result.display}\n\n${narration}`);

  await channel.send({ embeds: [embed] });

  session.conversationHistory.push({
    role: 'assistant',
    content: `Tirada de ${tirada.stat} DC${tirada.dc}: ${result.total} (${success ? 'éxito' : 'fallo'}). ${narration}`,
  });
  await session.save();
}

// ─── COMBATE CON IA ───────────────────────────────────────────────
async function initiateCombat(channel, session, enemies, client) {
  session.status = 'combate';
  session.currentCombat = { enemies, turn: 0, playerOrder: [] };

  const chars = await Promise.all(session.players.filter(p => p.isAlive).map(p => Character.findById(p.characterId)));
  const initiatives = chars.map(c => {
    const init = rollInitiative(getModifier(c.stats.destreza));
    const uid = session.players.find(p => p.characterId.toString() === c._id.toString())?.userId;
    return { userId: uid, name: c.name, initiative: init.total };
  }).sort((a, b) => b.initiative - a.initiative);

  session.currentCombat.playerOrder = initiatives.map(i => i.userId);
  await session.save();

  const enemyList = enemies.map(e => `👾 **${e.name}** ❤️${e.hp} CA${e.ca}`).join('\n');
  const initList = initiatives.map((i, idx) => `${idx + 1}. **${i.name}** — ${i.initiative}`).join('\n');

  await channel.send({ embeds: [new EmbedBuilder().setColor(0xc62828)
    .setTitle('⚔️ ¡COMBATE!')
    .addFields({ name: '📋 Iniciativa', value: initList }, { name: '👾 Enemigos', value: enemyList })] });

  await sendAICombatTurn(channel, session, client);
}

async function sendAICombatTurn(channel, session, client) {
  const combat = session.currentCombat;
  const aliveEnemies = combat.enemies.filter(e => e.hp > 0);
  if (aliveEnemies.length === 0) { await endAICombat(channel, session, true, client); return; }

  const currentUserId = combat.playerOrder[combat.turn % combat.playerOrder.length];
  const player = session.players.find(p => p.userId === currentUserId);
  if (!player || !player.isAlive) {
    combat.turn++;
    session.markModified('currentCombat');
    await session.save();
    if (combat.turn % combat.playerOrder.length === 0) await aiEnemyTurn(channel, session, client);
    else await sendAICombatTurn(channel, session, client);
    return;
  }

  const char = await Character.findById(player.characterId);
  const enemyStatus = aliveEnemies.map((e, i) => `${i + 1}. **${e.name}** ❤️${e.hp}/${e.hpMax} CA${e.ca}`).join('\n');
  const playerStatus = session.players.filter(p => p.isAlive).map(p => `<@${p.userId}> ❤️${p.hp}`).join(' | ');

  const embed = new EmbedBuilder().setColor(0xff6f00)
    .setTitle(`⚔️ Turno de ${char.name}`)
    .setDescription(`Describe tu acción de combate **o usa los botones**`)
    .addFields({ name: '👾 Enemigos', value: enemyStatus }, { name: '❤️ Grupo', value: playerStatus })
    .setFooter({ text: `❤️ ${player.hp}/${char.hpMax} HP | ⏱️ 2 min` });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`aicombat_${session._id}_attack_0`).setLabel('⚔️ Atacar #1').setStyle(ButtonStyle.Danger),
    aliveEnemies[1] ? new ButtonBuilder().setCustomId(`aicombat_${session._id}_attack_1`).setLabel('⚔️ Atacar #2').setStyle(ButtonStyle.Danger)
      : new ButtonBuilder().setCustomId('disabled').setLabel('─').setStyle(ButtonStyle.Secondary).setDisabled(true),
    new ButtonBuilder().setCustomId(`aicombat_${session._id}_potion`).setLabel('🧪 Poción').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`aicombat_${session._id}_defend`).setLabel('🛡️ Defender').setStyle(ButtonStyle.Primary),
  );

  await channel.send({ content: `<@${currentUserId}>`, embeds: [embed], components: [row] });

  // Timeout de turno
  setTimeout(async () => {
    const fresh = await AISession.findById(session._id);
    if (!fresh || fresh.status !== 'combate' || fresh.currentCombat.turn !== combat.turn) return;
    await channel.send(`⏱️ **${char.name}** ataca automáticamente.`);
    await processAICombatAttack(channel, fresh, currentUserId, 0, client);
  }, ACTION_TIMEOUT + 5000);
}

async function processAICombatAttack(channel, session, userId, targetIdx, client, interaction = null) {
  const player = session.players.find(p => p.userId === userId);
  const char = await Character.findById(player.characterId);
  const classData = CLASSES[char.class];
  const aliveEnemies = session.currentCombat.enemies.filter(e => e.hp > 0);
  const target = aliveEnemies[targetIdx] || aliveEnemies[0];
  if (!target) return;

  const primaryStat = char.stats[classData.primaryStat] || 10;
  const weapon = char.inventory.find(i => i.type === 'arma' && i.equipped) || char.inventory.find(i => i.type === 'arma');
  const weaponBonus = weapon?.bonus || 0;
  const attackBonus = getModifier(primaryStat) + char.bonificadorCompetencia + weaponBonus;
  const attackRoll = rollAttack(attackBonus);

  let txt = '';
  if (attackRoll.isFumble) {
    txt = `💨 **${char.name}** falla (pifia)`;
  } else if (attackRoll.isCrit || attackRoll.total >= target.ca) {
    const dmgNotation = weapon ? '1d8' : '1d6';
    const dmg = rollDice(dmgNotation);
    const totalDmg = Math.max(1, dmg.total + getModifier(primaryStat) + weaponBonus);
    const enemyObj = session.currentCombat.enemies.find(e => e.name === target.name && e.hp > 0);
    if (enemyObj) enemyObj.hp = Math.max(0, enemyObj.hp - totalDmg);
    txt = `⚔️ **${char.name}**${attackRoll.isCrit ? ' 💥CRIT' : ''} → **${target.name}**: **${totalDmg}** daño | ❤️${Math.max(0, enemyObj?.hp || 0)}`;
  } else {
    txt = `🛡️ **${char.name}** falla (${attackRoll.total} vs CA${target.ca})`;
  }

  session.markModified('currentCombat');
  await session.save();
  if (interaction) await interaction.editReply({ content: txt });
  else await channel.send({ content: txt });
  await advanceAICombatTurn(channel, session, client);
}

async function aiEnemyTurn(channel, session, client) {
  const aliveEnemies = session.currentCombat.enemies.filter(e => e.hp > 0);
  const alivePlayers = session.players.filter(p => p.isAlive && p.hp > 0);
  if (alivePlayers.length === 0) { await endAICombat(channel, session, false, client); return; }

  let txt = '👾 **Turno enemigos:**\n';
  for (const enemy of aliveEnemies) {
    const target = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
    const char = await Character.findById(target.characterId);
    const attackRoll = rollAttack(enemy.ataque);
    if (attackRoll.isFumble) {
      txt += `• **${enemy.name}** falla\n`;
    } else if (attackRoll.isCrit || attackRoll.total >= char.ca) {
      const dmg = rollDice(enemy.danio || '1d6');
      target.hp = Math.max(0, target.hp - dmg.total);
      txt += `• **${enemy.name}** golpea a <@${target.userId}>${attackRoll.isCrit ? ' 💥' : ''}: **${dmg.total}** daño ❤️${target.hp}\n`;
      if (target.hp <= 0) { target.isAlive = false; txt += `  ☠️ <@${target.userId}> ha caído!\n`; }
    } else {
      txt += `• **${enemy.name}** falla vs <@${target.userId}>\n`;
    }
  }

  session.markModified('players');
  session.markModified('currentCombat');
  await session.save();
  await channel.send({ content: txt });

  if (session.players.filter(p => p.isAlive && p.hp > 0).length === 0) {
    await endAICombat(channel, session, false, client);
    return;
  }
  await sendAICombatTurn(channel, session, client);
}

async function advanceAICombatTurn(channel, session, client) {
  const aliveEnemies = session.currentCombat.enemies.filter(e => e.hp > 0);
  if (aliveEnemies.length === 0) { await endAICombat(channel, session, true, client); return; }
  session.currentCombat.turn++;
  session.markModified('currentCombat');
  await session.save();
  if (session.currentCombat.turn % session.currentCombat.playerOrder.length === 0) await aiEnemyTurn(channel, session, client);
  else await sendAICombatTurn(channel, session, client);
}

async function endAICombat(channel, session, victory, client) {
  const enemies = session.currentCombat?.enemies || [];
  const xpGained = enemies.reduce((s, e) => s + (e.xpReward || 0), 0);
  const loot = rollLoot('normal', false);

  session.status = 'activa';
  session.currentCombat = null;

  if (victory) {
    const embed = new EmbedBuilder().setColor(0x4caf50).setTitle('🏆 ¡Victoria en combate!')
      .addFields({ name: '⭐ XP', value: `+${xpGained}`, inline: true }, { name: '🎁 Botín', value: loot.length > 0 ? loot.map(i => `${RARITY_EMOJI[i.rarity]} ${i.name}`).join('\n') : 'Sin botín' });
    await channel.send({ embeds: [embed] });
    await distributeRewards(channel, session, xpGained, Math.floor(xpGained / 10));
  } else {
    await channel.send('💀 El grupo ha caído en combate...');
    session.status = 'fallida';
  }

  session.conversationHistory.push({ role: 'user', content: victory ? 'El grupo derrotó a los enemigos en combate.' : 'El grupo fue derrotado en combate.' });
  await session.save();

  if (victory) {
    await new Promise(r => setTimeout(r, 2000));
    await advanceScene(channel, session, client);
  }
}

// ─── AVANZAR ESCENA ───────────────────────────────────────────────
async function advanceScene(channel, session, client) {
  const adventure = session.aiAdventureData;
  if (!adventure) return;

  const scenes = adventure.scenes || [];
  const currentIdx = scenes.findIndex(s => s.id === session.currentScene);

  if (session.currentScene === 'intro') {
    session.currentScene = scenes[0]?.id || 'finale';
  } else if (currentIdx >= 0 && currentIdx < scenes.length - 1) {
    session.currentScene = scenes[currentIdx + 1].id;
  } else {
    session.currentScene = 'finale';
  }

  if (session.currentScene === 'finale') {
    await handleFinale(channel, session, client);
    return;
  }

  const nextScene = scenes.find(s => s.id === session.currentScene);
  session.sceneContext = nextScene?.context || nextScene?.narration || '';
  await session.save();

  await channel.send({ embeds: [new EmbedBuilder().setColor(0x311b92).setDescription(`✨ *La aventura continúa...*`)] });
  await new Promise(r => setTimeout(r, 1500));
  await narrateCurrentScene(channel, session, client);
}

async function handleFinale(channel, session, client) {
  const adventure = session.aiAdventureData;
  const finale = adventure?.finale;
  if (!finale) { await completeAdventure(channel, session, true); return; }

  session.sceneContext = finale.context || '';
  await session.save();

  await channel.send({ embeds: [new EmbedBuilder().setColor(0xb71c1c)
    .setTitle('💀 EL CLÍMAX SE ACERCA')
    .setDescription(`📖 ${finale.narration}`)
    .setFooter({ text: '¡El momento decisivo!' })] });

  if (finale.boss) {
    await new Promise(r => setTimeout(r, 2000));
    await initiateCombat(channel, session, [finale.boss], client);
  } else {
    await completeAdventure(channel, session, true);
  }
}

async function completeAdventure(channel, session, victory) {
  const adventure = session.aiAdventureData;
  const xp = adventure?.finale?.xpReward || 500;
  const goldMin = adventure?.finale?.goldReward?.min || 50;
  const goldMax = adventure?.finale?.goldReward?.max || 200;
  const gold = Math.floor(Math.random() * (goldMax - goldMin + 1)) + goldMin;

  if (victory) {
    const victoryText = adventure?.finale?.victory || '¡Habéis triunfado! El reino os celebra como héroes.';
    const embed = new EmbedBuilder().setColor(0x4caf50)
      .setTitle('🏆 ¡AVENTURA COMPLETADA!')
      .setDescription(victoryText)
      .addFields({ name: '⭐ XP Final', value: `+${xp}`, inline: true }, { name: '💰 Oro Final', value: `+${gold}`, inline: true });
    await channel.send({ embeds: [embed] });
    await distributeRewards(channel, session, xp, gold, true);
  }

  session.status = victory ? 'completada' : 'fallida';
  await session.save();

  if (session.guildId) {
    await Guild.findOneAndUpdate({ guildId: session.guildId }, { $inc: { 'world.totalAdventuresCompleted': 1 } }, { upsert: true });
  }
}

// ─── DISTRIBUIR RECOMPENSAS ───────────────────────────────────────
async function distributeRewards(channel, session, xp, gold, withLoot = false) {
  const loot = withLoot ? rollLoot('jefe', true) : [];
  for (const p of session.players.filter(pl => pl.isAlive)) {
    const char = await Character.findById(p.characterId);
    char.xp += xp;
    char.gold += gold;
    char.hp = p.hp;
    if (withLoot) char.adventuresCompleted += 1;
    if (loot.length > 0) {
      const charLoot = loot[Math.floor(Math.random() * loot.length)];
      char.inventory.push(charLoot);
      if (charLoot.rarity === 'legendario') await channel.send({ content: `🌟 ¡<@${p.userId}> obtiene el legendario **${charLoot.name}**!` });
    }
    const newLevel = checkLevelUp(char);
    if (newLevel) {
      const info = applyLevelUp(char, CLASSES[char.class]);
      await channel.send({ content: `🎉 **¡${char.name} sube al nivel ${newLevel}!** +${info.hpGain} HP` });
    }
    await char.save();
  }
}

// ─── MANEJAR BOTONES DE COMBATE IA ───────────────────────────────
async function handleAICombatButton(interaction, parts, client) {
  const sessionId = parts[1], action = parts[2], targetIdx = parseInt(parts[3]) || 0;
  const session = await AISession.findById(sessionId);
  if (!session || session.status !== 'combate') return interaction.reply({ content: '❌ No hay combate activo.', ephemeral: true });

  const currentUserId = session.currentCombat.playerOrder[session.currentCombat.turn % session.currentCombat.playerOrder.length];
  if (interaction.user.id !== currentUserId) return interaction.reply({ content: '❌ No es tu turno.', ephemeral: true });

  await interaction.deferReply();
  if (action === 'attack') await processAICombatAttack(interaction.channel, session, currentUserId, targetIdx, client, interaction);
  else if (action === 'potion') {
    const player = session.players.find(p => p.userId === currentUserId);
    const char = await Character.findById(player.characterId);
    const potion = char.inventory.find(i => i.type === 'pocion');
    if (!potion) { await interaction.editReply({ content: '❌ No tienes pociones.' }); return; }
    const heal = rollDice('2d4+2');
    player.hp = Math.min(char.hpMax, player.hp + heal.total);
    char.inventory.splice(char.inventory.indexOf(potion), 1);
    await char.save();
    session.markModified('players');
    await session.save();
    await interaction.editReply({ content: `🧪 **${char.name}** bebe poción. +${heal.total} HP ❤️${player.hp}/${char.hpMax}` });
    await advanceAICombatTurn(interaction.channel, session, client);
  } else if (action === 'defend') {
    const player = session.players.find(p => p.userId === currentUserId);
    player.tempEffects = [...(player.tempEffects || []), 'defending'];
    session.markModified('players');
    await session.save();
    const char = await Character.findById(player.characterId);
    await interaction.editReply({ content: `🛡️ **${char.name}** se defiende. +2 CA hasta su próximo turno.` });
    await advanceAICombatTurn(interaction.channel, session, client);
  }
}

// ─── HELPERS ─────────────────────────────────────────────────────
async function getPlayerNames(session) {
  const names = [];
  for (const p of session.players.filter(pl => pl.isAlive)) {
    const char = await Character.findById(p.characterId);
    if (char) names.push(char.name);
  }
  return names;
}

module.exports = { startAIAdventure, handlePlayerMessage, handleAICombatButton, narrateCurrentScene, advanceScene };
