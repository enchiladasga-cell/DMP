const { Client, GatewayIntentBits, Collection, Events, REST, Routes } = require('discord.js');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const http = require('http');

// --- Evento messageCreate (DeepSeek) ---
const messageCreateEvent = require('./events/messageCreate');

// --- Cliente de Discord ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
  ]
});

// --- Colección de comandos ---
client.commands = new Collection();

// --- Cargar comandos automáticamente ---
const commandsPath = path.join(__dirname, 'comandos');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

const commands = [];

for (const file of commandFiles) {
  const command = require(`./comandos/${file}`);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    commands.push(command.data.toJSON());
  } else {
    console.log(`[AVISO] El comando ${file} no tiene "data" o "execute".`);
  }
}

// --- Conexión a MongoDB ---
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('📦 Conectado a MongoDB'))
  .catch(console.error);

// --- Evento: Bot listo ---
client.once(Events.ClientReady, async (c) => {
  console.log(`🛡️ ${c.user.tag} ha despertado en Eldoria.`);

  // Registrar comandos de barra
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    console.log('⚔️ Registrando comandos de barra...');
    await rest.put(Routes.applicationCommands(c.user.id), { body: commands });
    console.log('✅ Comandos registrados.');
  } catch (error) {
    console.error(error);
  }
});

// --- Evento: Interacciones (comandos de barra) ---
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({ content: '¡El grimorio ha fallado! Error al ejecutar el comando.', ephemeral: true });
  }
});

// --- Evento: Mensajes (aventuras) ---
client.on('messageCreate', messageCreateEvent.execute.bind(null));

// --- Servidor HTTP para UptimeRobot ---
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Ecos de Eldoria: El Dungeon Master está vivo.\n');
}).listen(process.env.PORT || 3000, () => {
  console.log('🌐 Servidor HTTP listo.');
});

// --- Login ---
client.login(process.env.DISCORD_TOKEN);