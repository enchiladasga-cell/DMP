require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

client.commands = new Collection();
client.tempAdventures = {}; // Mazmorras generadas en memoria

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js') && f !== 'deploy.js');
for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (command.data && command.execute) client.commands.set(command.data.name, command);
}

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB conectado'))
  .catch(err => console.error('❌ Error MongoDB:', err));

client.once('clientReady', () => {
  console.log(`✅ Bot listo como ${client.user.tag}`);
  require('./utils/adventureSuggester')(client);
});

client.on('interactionCreate', async interaction => {
  if (interaction.isCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction, client);
    } catch (error) {
      console.error(error);
      const msg = { content: '❌ Hubo un error ejecutando este comando.', flags: 64 };
      if (interaction.replied || interaction.deferred) await interaction.followUp(msg);
      else await interaction.reply(msg);
    }
  }
  if (interaction.isButton()) {
    try {
      const sessionManager = require('./utils/sessionManager');
      await sessionManager.handleButton(interaction, client);
    } catch (error) {
      console.error('Button error:', error);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
