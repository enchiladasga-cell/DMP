// commands/mision.js — PARCHE v2.0
// /mision ver        — Ver el tablón de misiones disponibles para tu nivel
// /mision iniciar    — Iniciar una misión por ID
// /mision estado     — Ver el estado de la misión activa en el canal

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getAll, getById, getForPlayer, formatMissionList, DIFFICULTY_EMOJIS } = require('../data/missions');
const MissionSession = require('../models/MissionSession');
const Character = require('../models/Character');
const { rollDice } = require('../utils/dice');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mision')
    .setDescription('Tablón de misiones pequeñas')
    .addSubcommand(sub =>
      sub.setName('ver')
        .setDescription('Ver las misiones disponibles para tu nivel')
        .addStringOption(opt =>
          opt.setName('dificultad')
            .setDescription('Filtrar por dificultad')
            .addChoices(
              { name: '🟢 Fácil', value: 'fácil' },
              { name: '🟡 Normal', value: 'normal' },
              { name: '🔴 Difícil', value: 'difícil' },
              { name: '🟣 Épico', value: 'épico' },
            )
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('iniciar')
        .setDescription('Iniciar una misión')
        .addStringOption(opt =>
          opt.setName('id').setDescription('ID de la misión (ej: M001)').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('estado')
        .setDescription('Ver el estado de la misión activa en este canal')
    )
    .addSubcommand(sub =>
      sub.setName('abandonar')
        .setDescription('Abandonar la misión activa en este canal')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'ver') return handleVer(interaction);
    if (sub === 'iniciar') return handleIniciar(interaction);
    if (sub === 'estado') return handleEstado(interaction);
    if (sub === 'abandonar') return handleAbandonar(interaction);
  },

  // Botones de elección durante la misión
  async handleButton(interaction) {
    if (interaction.customId.startsWith('mission_choice_')) {
      return handleMissionChoice(interaction);
    }
    if (interaction.customId === 'mission_continue') {
      return handleMissionContinue(interaction);
    }
  },
};

// ─── Ver tablón ───────────────────────────────────────────────────────────────

async function handleVer(interaction) {
  const char = await Character.findOne({ userId: interaction.user.id, guildId: interaction.guildId });
  const level = char?.level || 1;
  const diffFilter = interaction.options.getString('dificultad');

  let missions = getForPlayer(level);
  if (diffFilter) missions = missions.filter(m => m.difficulty === diffFilter);

  if (missions.length === 0) {
    return interaction.reply({
      content: `📋 No hay misiones disponibles para tu nivel (${level}) con ese filtro.`,
      ephemeral: true,
    });
  }

  const embed = new EmbedBuilder()
    .setTitle('📋 Tablón de Misiones')
    .setDescription(
      `Misiones disponibles para nivel **${level}**${diffFilter ? ` — ${diffFilter}` : ''}:\n\n` +
      formatMissionList(missions)
    )
    .setColor(0x8B6914)
    .setFooter({ text: 'Usa /mision iniciar <ID> para comenzar. Misiones solos o en grupo ✅' });

  await interaction.reply({ embeds: [embed] });
}

// ─── Iniciar misión ───────────────────────────────────────────────────────────

async function handleIniciar(interaction) {
  const missionId = interaction.options.getString('id').toUpperCase();
  const mission = getById(missionId);

  if (!mission) {
    return interaction.reply({ content: `❌ No existe la misión con ID \`${missionId}\`. Usa /mision ver para listarlas.`, ephemeral: true });
  }

  const existing = await MissionSession.findOne({ guildId: interaction.guildId, channelId: interaction.channelId, active: true });
  if (existing) {
    return interaction.reply({ content: '⚠️ Ya hay una misión activa en este canal. Usa /mision estado para verla.', ephemeral: true });
  }

  const char = await Character.findOne({ userId: interaction.user.id, guildId: interaction.guildId });
  if (!char) {
    return interaction.reply({ content: '❌ Primero crea un personaje con /crear_personaje.', ephemeral: true });
  }
  if (char.level < mission.minLevel) {
    return interaction.reply({ content: `❌ Necesitas nivel **${mission.minLevel}** para esta misión (eres nivel ${char.level}).`, ephemeral: true });
  }

  const session = await MissionSession.create({
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    missionId,
    players: [interaction.user.id],
    currentStep: 0,
    responses: {},
    pendingResponses: [interaction.user.id],
    active: true,
  });

  const step = mission.steps[0];
  const embed = new EmbedBuilder()
    .setTitle(`${DIFFICULTY_EMOJIS[mission.difficulty]} ${mission.name}`)
    .setDescription(step.text)
    .setColor(0x8B6914)
    .addFields(
      { name: '🎯 Dificultad', value: mission.difficulty, inline: true },
      { name: '⭐ Recompensa', value: `${mission.xpReward} XP | ${mission.goldReward}🪙`, inline: true },
      { name: '👥 Jugadores', value: `${mission.minPlayers}–${mission.maxPlayers}`, inline: true },
    )
    .setFooter({ text: 'Otros jugadores pueden unirse reaccionando con /mision unirse' });

  const row = buildChoiceButtons(step.choices, 'mission_choice');
  await interaction.reply({ embeds: [embed], components: [row] });
}

// ─── Estado ───────────────────────────────────────────────────────────────────

async function handleEstado(interaction) {
  const session = await MissionSession.findOne({ guildId: interaction.guildId, channelId: interaction.channelId, active: true });
  if (!session) {
    return interaction.reply({ content: '📋 No hay misión activa en este canal.', ephemeral: true });
  }
  const mission = getById(session.missionId);
  const embed = new EmbedBuilder()
    .setTitle(`📊 Estado: ${mission.name}`)
    .setDescription(
      `**Paso:** ${session.currentStep + 1}/${mission.steps.length}\n` +
      `**Jugadores:** ${session.players.map(p => `<@${p}>`).join(', ')}\n` +
      `**Faltan responder:** ${session.pendingResponses.length > 0 ? session.pendingResponses.map(p => `<@${p}>`).join(', ') : 'Nadie — todos listos'}`
    )
    .setColor(0x0099FF);
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// ─── Abandonar ────────────────────────────────────────────────────────────────

async function handleAbandonar(interaction) {
  const session = await MissionSession.findOne({ guildId: interaction.guildId, channelId: interaction.channelId, active: true });
  if (!session) return interaction.reply({ content: '⚠️ No hay misión activa.', ephemeral: true });
  if (!session.players.includes(interaction.user.id)) return interaction.reply({ content: '❌ No eres parte de esta misión.', ephemeral: true });

  session.active = false;
  await session.save();
  await interaction.reply({ content: '🏳️ Misión abandonada. No se otorgan recompensas.' });
}

// ─── Elección de jugador en misión ───────────────────────────────────────────

async function handleMissionChoice(interaction) {
  const session = await MissionSession.findOne({ guildId: interaction.guildId, channelId: interaction.channelId, active: true });
  if (!session) return interaction.reply({ content: '⚠️ No hay misión activa.', ephemeral: true });

  const userId = interaction.user.id;
  if (!session.players.includes(userId)) return interaction.reply({ content: '❌ No eres parte de esta misión.', ephemeral: true });
  if (!session.pendingResponses.includes(userId)) return interaction.reply({ content: '✅ Ya respondiste.', ephemeral: true });

  const choiceIndex = parseInt(interaction.customId.replace('mission_choice_', ''));
  session.responses[userId] = choiceIndex;
  session.pendingResponses = session.pendingResponses.filter(p => p !== userId);
  session.markModified('responses');
  session.markModified('pendingResponses');
  await session.save();

  await interaction.reply({ content: `✅ Opción registrada. Faltan: ${session.pendingResponses.map(p => `<@${p}>`).join(', ') || '**Nadie — ¡todos listos!**'}`, ephemeral: false });

  if (session.pendingResponses.length === 0) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('mission_continue').setLabel('▶️ Resolver escena').setStyle(ButtonStyle.Success)
    );
    await interaction.followUp({ content: '🎲 **¡Todos han respondido!** Pulsa para continuar.', components: [row] });
  }
}

// ─── Continuar misión ─────────────────────────────────────────────────────────

async function handleMissionContinue(interaction) {
  const session = await MissionSession.findOne({ guildId: interaction.guildId, channelId: interaction.channelId, active: true });
  if (!session) return interaction.reply({ content: '⚠️ No hay misión activa.', ephemeral: true });
  if (session.pendingResponses.length > 0) return interaction.reply({ content: '⏳ Aún faltan respuestas.', ephemeral: true });

  await interaction.deferReply();

  const mission = getById(session.missionId);
  const currentStep = mission.steps[session.currentStep];

  // Elección mayoritaria
  const votes = Object.values(session.responses);
  const tally = {};
  votes.forEach(v => { tally[v] = (tally[v] || 0) + 1; });
  const winnerIndex = parseInt(Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0]);
  const chosen = currentStep.choices[winnerIndex];
  const nextStepIndex = chosen.next;
  const nextStep = mission.steps[nextStepIndex];

  let combatLog = '';

  // ¿Tiene combate?
  if (nextStep?.combat) {
    combatLog = await resolveMissionCombat(session, nextStep.combat);
  }

  // ¿Fin?
  if (!nextStep || nextStep.isEnd) {
    session.active = false;
    await session.save();

    const xp = nextStep?.xpReward || mission.xpReward;
    const gold = nextStep?.goldReward || mission.goldReward;
    const rewardLines = [];

    for (const playerId of session.players) {
      const char = await Character.findOne({ userId: playerId, guildId: session.guildId });
      if (!char) continue;
      char.xp += xp;
      char.gold += gold;
      await char.checkLevelUp();
      await char.save();
      rewardLines.push(`<@${playerId}>: +${xp} XP, +${gold} 🪙`);
    }

    // Loot especial
    let lootLine = '';
    if (mission.loot && Math.random() < mission.loot.chance) {
      lootLine = `\n🎁 **¡Objeto especial encontrado!** ${mission.loot.name} — _${mission.loot.bonus}_`;
      // Aquí podrías agregar el item al inventario del primer jugador o al que más votó
    }

    const embed = new EmbedBuilder()
      .setTitle(`✅ Misión completada: ${mission.name}`)
      .setDescription(
        (combatLog ? combatLog + '\n\n' : '') +
        (nextStep?.text || '¡Misión completada con éxito!') +
        '\n\n**Recompensas:**\n' + rewardLines.join('\n') + lootLine
      )
      .setColor(0xFFD700);

    return interaction.editReply({ embeds: [embed], components: [] });
  }

  // Siguiente paso normal
  session.currentStep = nextStepIndex;
  session.responses = {};
  session.pendingResponses = [...session.players];
  session.markModified('responses');
  session.markModified('pendingResponses');
  await session.save();

  const embed = new EmbedBuilder()
    .setTitle(`${DIFFICULTY_EMOJIS[mission.difficulty]} ${mission.name}`)
    .setDescription((combatLog ? combatLog + '\n\n' : '') + nextStep.text)
    .setColor(0x8B6914);

  const row = buildChoiceButtons(nextStep.choices, 'mission_choice');
  await interaction.editReply({ embeds: [embed], components: [row] });
}

// ─── Combate en misión ────────────────────────────────────────────────────────

async function resolveMissionCombat(session, enemyData) {
  const lines = [`⚔️ **¡Combate contra ${enemyData.name}!**`];
  let enemyHP = enemyData.hp;

  for (const playerId of session.players) {
    const char = await Character.findOne({ userId: playerId, guildId: session.guildId });
    if (!char || char.hp <= 0) continue;
    const atk = rollDice('1d20') + (char.attackBonus || 0);
    const dmg = rollDice(char.damageDice || '1d6');
    if (atk >= enemyData.ac) {
      enemyHP -= dmg;
      lines.push(`🗡️ <@${playerId}> golpea (${atk}) por **${dmg}** daño.`);
    } else {
      lines.push(`💨 <@${playerId}> falla (${atk} vs CA ${enemyData.ac}).`);
    }
  }

  if (enemyHP > 0) {
    for (const playerId of session.players) {
      const char = await Character.findOne({ userId: playerId, guildId: session.guildId });
      if (!char) continue;
      const atkE = rollDice('1d20') + (enemyData.attackBonus || 2);
      const dmgE = rollDice(enemyData.damageDice || '1d6');
      if (atkE >= (char.ac || 10)) {
        char.hp = Math.max(0, char.hp - dmgE);
        await char.save();
        lines.push(`🩸 ${enemyData.name} golpea a <@${playerId}> por **${dmgE}** (HP: ${char.hp})`);
      }
    }
    lines.push(`😤 ${enemyData.name} sobrevive con **${Math.max(0, enemyHP)} HP**.`);
  } else {
    lines.push(`💀 **${enemyData.name} derrotado!**`);
  }

  return lines.join('\n');
}

// ─── Helper botones ───────────────────────────────────────────────────────────

function buildChoiceButtons(choices, prefix) {
  if (!choices || choices.length === 0) return null;
  const row = new ActionRowBuilder();
  choices.forEach((c, i) => {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`${prefix}_${i}`)
        .setLabel(c.label)
        .setStyle(ButtonStyle.Primary)
    );
  });
  return row;
}
