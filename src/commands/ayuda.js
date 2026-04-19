const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ayuda')
    .setDescription('Guía completa del bot para principiantes'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x0d47a1)
      .setTitle('📖 Guía del Dungeon Master Bot')
      .setDescription('¡Bienvenido a las aventuras D&D 5e! Aquí te explicamos todo lo que necesitas saber.')
      .addFields(
        {
          name: '🚀 Primeros pasos',
          value: [
            '1. `/crear_personaje nombre:TuNombre clase:guerrero` — Crea tu personaje',
            '2. `/lista_aventuras` — Ve las aventuras disponibles',
            '3. `/aventura id:taberna_maldita jugador2:@amigo` — ¡Comienza!',
          ].join('\n'),
        },
        {
          name: '🎲 Sistema de dados (D&D 5e simplificado)',
          value: [
            '• **Ataque**: Tiras 1d20 + modificador. Si superas la **CA** del enemigo, impactas.',
            '• **Daño**: Cada arma tiene su dado (ej: espada = 1d8).',
            '• **Crítico**: 20 natural en d20 = daño doble.',
            '• **Pifia**: 1 natural en d20 = fallo automático.',
            '• **Ventaja**: Tiras 2d20 y usas el mayor.',
            '• **Desventaja**: Tiras 2d20 y usas el menor.',
          ].join('\n'),
        },
        {
          name: '📊 Estadísticas explicadas',
          value: [
            '**FUE** (Fuerza): Ataques cuerpo a cuerpo, forzar puertas.',
            '**DES** (Destreza): Ataques a distancia, sigilo, CA sin armadura.',
            '**CON** (Constitución): HP máximo, resistencia.',
            '**INT** (Inteligencia): Hechizos de mago, conocimiento arcano.',
            '**SAB** (Sabiduría): Percepción, perspicacia, hechizos de clérigo.',
            '**CAR** (Carisma): Persuasión, engaño, intimidación.',
          ].join('\n'),
        },
        {
          name: '⚔️ Comandos de combate',
          value: [
            '• **Atacar** — Elige un enemigo y atacas con tu arma principal.',
            '• **Usar Poción** — Consume una poción de curación de tu inventario.',
            '• **Defender** — +2 CA hasta tu próximo turno.',
            '• ⏱️ Tienes **2 minutos** para actuar o se hace automático.',
          ].join('\n'),
        },
        {
          name: '📜 Todos los comandos',
          value: [
            '`/crear_personaje` — Crea tu héroe',
            '`/personaje` — Ve tu ficha completa',
            '`/inventario` — Gestiona tus objetos',
            '`/tienda` — Compra equipo con oro',
            '`/tirar` — Tira dados libremente',
            '`/aventura` — Inicia una aventura',
            '`/lista_aventuras` — Ve todas las aventuras',
            '`/ranking` — Clasificación del servidor',
          ].join('\n'),
        },
        {
          name: '🌟 Objetos Legendarios',
          value: 'Los objetos legendarios tienen una **probabilidad baja (~2-5%)** de aparecer al derrotar jefes finales. ¡No se venden en la tienda! Solo se consiguen en aventuras. Son los más poderosos del juego.',
        },
      )
      .setFooter({ text: '¿Primera vez? Empieza con /crear_personaje y luego /aventura id:taberna_maldita' });

    await interaction.reply({ embeds: [embed] });
  },
};
