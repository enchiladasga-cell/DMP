// sessionManager.js — PARCHE v2.0
// Cambios:
//  - Eliminado el timer de 2 minutos; ahora el juego espera a que TODOS respondan
//  - Botón "Continuar" para el DM tras recibir todas las respuestas
//  - Soporte para /terminar_aventura y /reiniciar_aventura
//  - Se exporta handleContinue() para el botón

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { rollDice } = require('./dice');
const Adventure = require('../data/adventures');
const Session = require('../models/Session');
const Character = require('../models/Character');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildChoiceButtons(choices) {
  const row = new ActionRowBuilder();
  choices.forEach((c, i) => {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`choice_${i}`)
        .setLabel(c.label)
        .setStyle(ButtonStyle.Primary)
    );
  });
  return row;
}

function buildContinueButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('dm_continue')
      .setLabel('▶️ Continuar aventura')
      .setStyle(ButtonStyle.Success)
  );
}

// ─── Iniciar aventura ─────────────────────────────────────────────────────────

async function startAdventure(interaction, adventureId, players) {
  const adventure = Adventure.getById(adventureId);
  if (!adventure) {
    return interaction.reply({ content: '❌ Aventura no encontrada.', ephemeral: true });
  }

  // Verificar niveles mínimos
  for (const playerId of players) {
    const char = await Character.findOne({ userId: playerId, guildId: interaction.guildId });
    if (!char) {
      return interaction.reply({ content: `❌ <@${playerId}> no tiene personaje. Usa /crear_personaje primero.`, ephemeral: true });
    }
    if (char.level < adventure.minLevel) {
      return interaction.reply({ content: `❌ <@${playerId}> necesita nivel ${adventure.minLevel}+ para esta aventura.`, ephemeral: true });
    }
  }

  // Crear sesión
  const session = await Session.create({
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    adventureId,
    players,
    currentNode: adventure.startNode,
    pendingResponses: [...players],   // ← quién falta por responder
    responses: {},
    active: true,
    startedAt: new Date(),
  });

  const node = adventure.getNode(adventure.startNode);

  const embed = new EmbedBuilder()
    .setTitle(`⚔️ ${adventure.name}`)
    .setDescription(node.text)
    .setColor(0x8B4513)
    .setFooter({ text: `Jugadores: ${players.map(p => `<@${p}>`).join(', ')}` });

  const row = buildChoiceButtons(node.choices);

  await interaction.reply({ embeds: [embed], components: [row] });

  // Guardar el messageId para editar luego
  const msg = await interaction.fetchReply();
  session.lastMessageId = msg.id;
  await session.save();
}

// ─── Manejar elección de jugador ──────────────────────────────────────────────

async function handlePlayerChoice(interaction) {
  const session = await Session.findOne({
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    active: true,
  });

  if (!session) {
    return interaction.reply({ content: '⚠️ No hay aventura activa en este canal.', ephemeral: true });
  }

  const userId = interaction.user.id;

  if (!session.players.includes(userId)) {
    return interaction.reply({ content: '❌ No eres parte de esta aventura.', ephemeral: true });
  }

  if (!session.pendingResponses.includes(userId)) {
    return interaction.reply({ content: '✅ Ya respondiste. Espera a los demás.', ephemeral: true });
  }

  const choiceIndex = parseInt(interaction.customId.replace('choice_', ''));
  session.responses[userId] = choiceIndex;
  session.pendingResponses = session.pendingResponses.filter(p => p !== userId);
  session.markModified('responses');
  session.markModified('pendingResponses');
  await session.save();

  await interaction.reply({
    content: `✅ <@${userId}> eligió la opción **${choiceIndex + 1}**. Esperando a: ${session.pendingResponses.map(p => `<@${p}>`).join(', ') || 'nadie — ¡todos listos!'}`,
    ephemeral: false,
  });

  // ¿Todos respondieron?
  if (session.pendingResponses.length === 0) {
    // Mostrar botón de continuar (solo para que el DM o cualquier jugador lo presione)
    const continueRow = buildContinueButton();
    await interaction.followUp({
      content: `🎲 **¡Todos han respondido!** Pulsa el botón para resolver la escena.`,
      components: [continueRow],
    });
  }
}

// ─── Continuar (botón DM) ─────────────────────────────────────────────────────

async function handleContinue(interaction) {
  const session = await Session.findOne({
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    active: true,
  });

  if (!session) {
    return interaction.reply({ content: '⚠️ No hay aventura activa.', ephemeral: true });
  }

  if (session.pendingResponses.length > 0) {
    return interaction.reply({
      content: `⏳ Aún faltan respuestas de: ${session.pendingResponses.map(p => `<@${p}>`).join(', ')}`,
      ephemeral: true,
    });
  }

  await interaction.deferReply();

  const adventure = Adventure.getById(session.adventureId);
  const node = adventure.getNode(session.currentNode);

  // Calcular la elección mayoritaria
  const votes = Object.values(session.responses);
  const tally = {};
  votes.forEach(v => { tally[v] = (tally[v] || 0) + 1; });
  const winnerIndex = parseInt(Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0]);
  const chosenOption = node.choices[winnerIndex];

  // Limpiar respuestas para el siguiente nodo
  session.currentNode = chosenOption.next;
  session.responses = {};

  const nextNode = adventure.getNode(chosenOption.next);

  // Combate si aplica
  let combatLog = '';
  if (nextNode.combat) {
    combatLog = await resolveCombat(session, nextNode.combat);
  }

  // ¿Fin de aventura?
  if (!nextNode || nextNode.isEnd) {
    session.active = false;
    await session.save();
    return resolveAdventureEnd(interaction, session, nextNode, combatLog);
  }

  session.pendingResponses = [...session.players];
  session.markModified('responses');
  session.markModified('pendingResponses');
  await session.save();

  const embed = new EmbedBuilder()
    .setTitle(`⚔️ ${adventure.name}`)
    .setDescription((combatLog ? combatLog + '\n\n' : '') + nextNode.text)
    .setColor(0x8B4513);

  const row = buildChoiceButtons(nextNode.choices);

  await interaction.editReply({ embeds: [embed], components: [row] });
}

// ─── Combate simplificado ─────────────────────────────────────────────────────

async function resolveCombat(session, enemyData) {
  const lines = [`⚔️ **¡Combate contra ${enemyData.name}!**`];
  let enemyHP = enemyData.hp;

  for (const playerId of session.players) {
    const char = await Character.findOne({ userId: playerId, guildId: session.guildId });
    if (!char || char.hp <= 0) continue;

    const atk = rollDice(`1d20`) + (char.attackBonus || 0);
    const dmg = rollDice(char.damageDice || '1d6');
    if (atk >= enemyData.ac) {
      enemyHP -= dmg;
      lines.push(`🗡️ <@${playerId}> golpea (${atk} vs CA ${enemyData.ac}) por **${dmg}** de daño.`);
    } else {
      lines.push(`💨 <@${playerId}> falla el ataque (${atk} vs CA ${enemyData.ac}).`);
    }
  }

  if (enemyHP > 0) {
    // Enemigo contraataca
    for (const playerId of session.players) {
      const char = await Character.findOne({ userId: playerId, guildId: session.guildId });
      if (!char) continue;
      const atkEnemy = rollDice('1d20') + (enemyData.attackBonus || 2);
      const dmgEnemy = rollDice(enemyData.damageDice || '1d6');
      if (atkEnemy >= (char.ac || 10)) {
        char.hp = Math.max(0, char.hp - dmgEnemy);
        await char.save();
        lines.push(`🩸 ${enemyData.name} golpea a <@${playerId}> por **${dmgEnemy}** de daño. (HP: ${char.hp})`);
      }
    }
    lines.push(`😤 ${enemyData.name} sobrevive con **${enemyHP} HP**.`);
  } else {
    lines.push(`💀 **${enemyData.name} ha sido derrotado!**`);
  }

  return lines.join('\n');
}

// ─── Fin de aventura ──────────────────────────────────────────────────────────

async function resolveAdventureEnd(interaction, session, endNode, combatLog) {
  const adventure = Adventure.getById(session.adventureId);

  let xpTotal = endNode?.xpReward || adventure.baseXp || 100;
  let goldTotal = endNode?.goldReward || adventure.baseGold || 50;

  const rewardLines = [];
  for (const playerId of session.players) {
    const char = await Character.findOne({ userId: playerId, guildId: session.guildId });
    if (!char) continue;
    char.xp += xpTotal;
    char.gold += goldTotal;
    await char.checkLevelUp();
    await char.save();
    rewardLines.push(`<@${playerId}>: +${xpTotal} XP, +${goldTotal} 🪙`);
  }

  const embed = new EmbedBuilder()
    .setTitle(`🏆 Aventura completada: ${adventure.name}`)
    .setDescription(
      (combatLog ? combatLog + '\n\n' : '') +
      (endNode?.text || '¡La aventura ha concluido!') +
      '\n\n**Recompensas:**\n' + rewardLines.join('\n')
    )
    .setColor(0xFFD700);

  await interaction.editReply({ embeds: [embed], components: [] });
}

// ─── Terminar / Reiniciar aventura ────────────────────────────────────────────

async function endAdventure(interaction) {
  const session = await Session.findOne({
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    active: true,
  });

  if (!session) {
    return interaction.reply({ content: '⚠️ No hay aventura activa en este canal.', ephemeral: true });
  }

  // Solo un participante o el que inició puede terminarla
  if (!session.players.includes(interaction.user.id)) {
    return interaction.reply({ content: '❌ No eres parte de esta aventura.', ephemeral: true });
  }

  session.active = false;
  await session.save();

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle('🛑 Aventura terminada')
        .setDescription('La aventura fue cancelada manualmente. Los personajes no reciben recompensas.')
        .setColor(0xFF0000),
    ],
  });
}

async function restartAdventure(interaction) {
  const session = await Session.findOne({
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    active: true,
  });

  if (!session) {
    return interaction.reply({ content: '⚠️ No hay aventura activa para reiniciar.', ephemeral: true });
  }

  if (!session.players.includes(interaction.user.id)) {
    return interaction.reply({ content: '❌ No eres parte de esta aventura.', ephemeral: true });
  }

  const adventure = Adventure.getById(session.adventureId);
  session.currentNode = adventure.startNode;
  session.responses = {};
  session.pendingResponses = [...session.players];
  session.markModified('responses');
  session.markModified('pendingResponses');
  await session.save();

  const node = adventure.getNode(adventure.startNode);
  const embed = new EmbedBuilder()
    .setTitle(`🔄 Aventura reiniciada: ${adventure.name}`)
    .setDescription(node.text)
    .setColor(0x0099FF);

  const row = buildChoiceButtons(node.choices);
  await interaction.reply({ embeds: [embed], components: [row] });
}

module.exports = {
  startAdventure,
  handlePlayerChoice,
  handleContinue,
  endAdventure,
  restartAdventure,
};
