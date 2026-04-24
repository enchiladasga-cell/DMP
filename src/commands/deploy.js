// commands/deploy.js — PARCHE v2.0
// Registra todos los slash commands incluyendo los nuevos del parche

require('dotenv').config();
const { REST, Routes } = require('discord.js');

const commands = [
  // Comandos existentes
  require('./ayuda').data.toJSON(),
  require('./crear_personaje').data.toJSON(),
  require('./personaje').data.toJSON(),
  require('./inventario').data.toJSON(),
  require('./tienda').data.toJSON(),
  require('./tirar').data.toJSON(),
  require('./lista_aventuras').data.toJSON(),
  require('./aventura').data.toJSON(),
  require('./ranking').data.toJSON(),
  require('./borrar_personaje').data.toJSON(),

  // ── NUEVOS DEL PARCHE v2.0 ──
  require('./terminar_aventura').data.toJSON(),
  require('./reiniciar_aventura').data.toJSON(),
  require('./mision').data.toJSON(),
  require('./hechizos').data.toJSON(),
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('🔄 Registrando slash commands (parche v2.0)...');
    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: commands },
    );
    console.log('✅ Comandos registrados exitosamente.');
    console.log('\nNuevos comandos añadidos:');
    console.log('  /terminar_aventura — Cancela la aventura activa');
    console.log('  /reiniciar_aventura — Reinicia la aventura desde el principio');
    console.log('  /mision ver|iniciar|estado|abandonar — Tablón de misiones');
    console.log('  /hechizos — Ver hechizos y árbol de habilidades por nivel');
  } catch (err) {
    console.error('❌ Error registrando comandos:', err);
  }
})();
