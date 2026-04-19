// Script para registrar los slash commands en Discord
// Ejecutar UNA vez con: node src/commands/deploy.js
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandFiles = fs.readdirSync(__dirname).filter(f => f.endsWith('.js') && f !== 'deploy.js');

for (const file of commandFiles) {
  const cmd = require(path.join(__dirname, file));
  if (cmd.data) commands.push(cmd.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`🔄 Registrando ${commands.length} comandos...`);
    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: commands },
    );
    console.log('✅ Comandos registrados exitosamente.');
  } catch (error) {
    console.error('❌ Error:', error);
  }
})();
