// index.js — PARCHE v2.0
// Añadido manejo de botones de aventura y misión, y nuevos comandos

require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const { handlePlayerChoice, handleContinue, endAdventure } = require('./utils/sessionManager');
const misionCommand = require('./commands/mision');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

// ─── Cargar comandos ──────────────────────────────────────────────────────────

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js') && f !== 'deploy.js');

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (command.data && command.execute) {
    client.commands.set(command.data.name, command);
  }
}

// ─── Conectar MongoDB ─────────────────────────────────────────────────────────

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB conectado'))
  .catch(err => console.error('❌ Error MongoDB:', err));

// ─── Ready ────────────────────────────────────────────────────────────────────

client.once('ready', () => {
  console.log(`🎲 Bot online como ${client.user.tag}`);
  client.user.setActivity('D&D 5e | /ayuda', { type: 0 });
});

// ─── Interacciones ────────────────────────────────────────────────────────────

client.on('interactionCreate', async interaction => {
  // ── Slash commands ──
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(`Error en /${interaction.commandName}:`, err);
      const reply = { content: '❌ Ocurrió un error al ejecutar este comando.', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply);
      } else {
        await interaction.reply(reply);
      }
    }
    return;
  }

  // ── Botones ──
  if (interaction.isButton()) {
    const id = interaction.customId;

    // Botones de AVENTURA
    if (id.startsWith('choice_')) {
      return handlePlayerChoice(interaction);
    }
    if (id === 'dm_continue') {
      return handleContinue(interaction);
    }

    // Botones de MISIÓN
    if (id.startsWith('mission_choice_') || id === 'mission_continue') {
      return misionCommand.handleButton(interaction);
    }

    console.warn(`Botón no manejado: ${id}`);
  }
});

// ─── Ping de salud (para Render/UptimeRobot) ──────────────────────────────────

const http = require('http');
http.createServer((_, res) => { res.writeHead(200); res.end('OK'); })
    .listen(process.env.PORT || 3000);

client.login(process.env.DISCORD_TOKEN);
