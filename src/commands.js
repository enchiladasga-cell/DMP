const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require("discord.js");
const { Personaje, Mision, Grupo } = require("./models");
const { CLASES, ARMAS, ARMADURAS, RARIDADES, calcularNivel, xpParaNivel } = require("./gameData");
const { llamarDeepSeek, generarMision } = require("./deepseek");
const { generarFichaPersonaje } = require("./canvas");

// =============================================
//   HELPER: Crear personaje con stats de clase
// =============================================
function crearStatsIniciales(claseId) {
  const clase = CLASES[claseId];
  return { ...clase.stats_base, hp_max: clase.stats_base.hp, mana_max: clase.stats_base.mana };
}

function crearInventarioInicial(claseId) {
  const clase = CLASES[claseId];
  const items = [];
  for (const itemId of clase.equipo_inicial) {
    const arma = ARMAS[itemId];
    const armadura = ARMADURAS[itemId];
    const item = arma || armadura;
    if (item) {
      items.push({ itemId, nombre: item.nombre, tipo: item.tipo, raridad: item.raridad, cantidad: 1 });
    }
  }
  return items;
}

function equipoInicialDesdeInventario(claseId) {
  const clase = CLASES[claseId];
  const equipado = { arma: null, armadura: null, accesorio: null, escudo: null };
  for (const itemId of clase.equipo_inicial) {
    const arma = ARMAS[itemId];
    if (arma) { equipado.arma = itemId; continue; }
    const arm = ARMADURAS[itemId];
    if (arm) {
      if (arm.tipo === "escudo") equipado.escudo = itemId;
      else if (arm.tipo === "accesorio") equipado.accesorio = itemId;
      else equipado.armadura = itemId;
    }
  }
  return equipado;
}

// =============================================
//   EMBED DE RARIDAD CON COLOR
// =============================================
function colorRaridad(raridad) {
  return parseInt(RARIDADES[raridad]?.color?.replace("#", ""), 16) || 0xffffff;
}

// =============================================
//   COMANDOS
// =============================================
const comandos = [

  // /crear - Crear personaje
  {
    data: new SlashCommandBuilder()
      .setName("crear")
      .setDescription("Crea tu personaje en Ecos de Eldoria")
      .addStringOption(o => o.setName("nombre").setDescription("Nombre de tu héroe").setRequired(true))
      .addStringOption(o => o.setName("clase").setDescription("Clase del personaje").setRequired(true)
        .addChoices(
          { name: "⚔️ Guerrero",  value: "GUERRERO" },
          { name: "🔮 Mago",      value: "MAGO" },
          { name: "🗡️ Ladrón",   value: "LADRON" },
          { name: "✨ Clérigo",   value: "CLERIGO" },
          { name: "🏹 Arquero",   value: "ARQUERO" },
          { name: "🌿 Druida",    value: "DRUIDA" },
        )),
    async execute(interaction) {
      await interaction.deferReply();
      const existe = await Personaje.findOne({ userId: interaction.user.id });
      if (existe) {
        return interaction.editReply({ content: `⚠️ Ya tienes un personaje: **${existe.nombre}** (${CLASES[existe.clase].emoji} ${existe.clase}). Usa \`/ficha\` para verlo.` });
      }

      const nombre = interaction.options.getString("nombre");
      const claseId = interaction.options.getString("clase");
      const clase = CLASES[claseId];

      const stats = crearStatsIniciales(claseId);
      const inventario = crearInventarioInicial(claseId);
      const equipado = equipoInicialDesdeInventario(claseId);
      const habilidades = clase.habilidades.filter(h => h.nivel === 1).map(h => h.nombre);

      const personaje = await Personaje.create({
        userId: interaction.user.id,
        guildId: interaction.guildId,
        nombre, clase: claseId,
        stats: { ...stats, hp_max: stats.hp, mana_max: stats.mana },
        inventario, equipado,
        habilidades_desbloqueadas: habilidades,
      });

      const embed = new EmbedBuilder()
        .setColor(0xc9a84c)
        .setTitle(`⚔️ ¡${nombre} ha llegado a Eldoria!`)
        .setDescription(`*${clase.descripcion}*`)
        .addFields(
          { name: `${clase.emoji} Clase`, value: clase.nombre, inline: true },
          { name: "⭐ Nivel", value: "1", inline: true },
          { name: "💰 Oro", value: "50", inline: true },
          { name: "❤️ HP", value: `${stats.hp}`, inline: true },
          { name: "💧 Maná", value: `${stats.mana}`, inline: true },
          { name: "🎒 Equipo Inicial", value: inventario.map(i => `${ARMAS[i.itemId]?.emoji || ARMADURAS[i.itemId]?.emoji || "📦"} ${i.nombre}`).join("\n") || "Ninguno" },
          { name: "✨ Habilidades", value: habilidades.join(", ") || "Ninguna" },
        )
        .setFooter({ text: "Usa /aventura para comenzar tu primera misión" });

      await interaction.editReply({ embeds: [embed] });
    }
  },

  // /ficha - Ver ficha del personaje
  {
    data: new SlashCommandBuilder()
      .setName("ficha")
      .setDescription("Ver tu ficha de personaje con imagen")
      .addUserOption(o => o.setName("jugador").setDescription("Ver ficha de otro jugador")),
    async execute(interaction) {
      await interaction.deferReply();
      const target = interaction.options.getUser("jugador") || interaction.user;
      const personaje = await Personaje.findOne({ userId: target.id });
      if (!personaje) return interaction.editReply({ content: `❌ ${target.username} no tiene personaje. Usa \`/crear\` primero.` });

      try {
        const buffer = await generarFichaPersonaje(personaje);
        const attachment = new AttachmentBuilder(buffer, { name: "ficha.png" });
        await interaction.editReply({ files: [attachment] });
      } catch (err) {
        console.error("Error canvas:", err);
        // Fallback embed si canvas falla
        const clase = CLASES[personaje.clase];
        const embed = new EmbedBuilder()
          .setColor(0xc9a84c)
          .setTitle(`${clase.emoji} ${personaje.nombre}`)
          .addFields(
            { name: "Clase", value: clase.nombre, inline: true },
            { name: "Nivel", value: `${personaje.nivel}`, inline: true },
            { name: "XP", value: `${personaje.xp}`, inline: true },
            { name: "HP", value: `${personaje.stats.hp}/${personaje.stats.hp_max}`, inline: true },
            { name: "Maná", value: `${personaje.stats.mana}/${personaje.stats.mana_max}`, inline: true },
            { name: "Oro", value: `${personaje.oro}`, inline: true },
          );
        await interaction.editReply({ embeds: [embed] });
      }
    }
  },

  // /aventura - Iniciar aventura solitaria
  {
    data: new SlashCommandBuilder()
      .setName("aventura")
      .setDescription("Inicia una aventura solitaria"),
    async execute(interaction) {
      await interaction.deferReply();
      const personaje = await Personaje.findOne({ userId: interaction.user.id });
      if (!personaje) return interaction.editReply({ content: "❌ Crea tu personaje primero con `/crear`" });
      if (personaje.en_aventura) return interaction.editReply({ content: "⚠️ Ya estás en una aventura. Termínala primero." });

      const misionData = await generarMision(personaje.nivel, "solitario");
      if (!misionData) return interaction.editReply({ content: "❌ Error al generar la misión. Intenta de nuevo." });

      const mision = await Mision.create({
        ...misionData,
        tipo: "solitario",
        jugadores: [{ userId: interaction.user.id, nombre: personaje.nombre, clase: personaje.clase }],
        lider_id: interaction.user.id,
        estado: "en_curso",
        iniciada_en: new Date(),
        historia_mision: [{ rol: "assistant", contenido: misionData.introduccion }],
        expira_en: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      personaje.en_aventura = true;
      personaje.historia = [{ rol: "assistant", contenido: misionData.introduccion }];
      await personaje.save();

      const embed = new EmbedBuilder()
        .setColor(0xc9a84c)
        .setTitle(`📜 ${misionData.titulo}`)
        .setDescription(misionData.introduccion)
        .addFields(
          { name: "🎯 Dificultad", value: misionData.dificultad, inline: true },
          { name: "⭐ XP", value: `${misionData.recompensas.xp}`, inline: true },
          { name: "💰 Oro", value: `${misionData.recompensas.oro}`, inline: true },
        )
        .setFooter({ text: `Usa /accion [lo que haces] para continuar | ID: ${mision._id}` });

      await interaction.editReply({ embeds: [embed] });
    }
  },

  // /accion - Realizar acción en aventura
  {
    data: new SlashCommandBuilder()
      .setName("accion")
      .setDescription("Realiza una acción en tu aventura")
      .addStringOption(o => o.setName("texto").setDescription("¿Qué haces?").setRequired(true)),
    async execute(interaction) {
      await interaction.deferReply();
      const personaje = await Personaje.findOne({ userId: interaction.user.id });
      if (!personaje) return interaction.editReply({ content: "❌ No tienes personaje." });
      if (!personaje.en_aventura) return interaction.editReply({ content: "⚠️ No estás en ninguna aventura. Usa `/aventura` o únete a una misión." });

      const accion = interaction.options.getString("texto");
      const respuesta = await llamarDeepSeek(personaje.historia, accion, personaje);

      // Guardar historial
      personaje.historia.push({ rol: "user", contenido: accion });
      personaje.historia.push({ rol: "assistant", contenido: respuesta });
      personaje.ultima_actividad = new Date();

      // XP por acción
      const xpGanado = Math.floor(Math.random() * 15) + 5;
      personaje.xp += xpGanado;
      const nivelNuevo = calcularNivel(personaje.xp);
      const subiNivel = nivelNuevo > personaje.nivel;
      if (subiNivel) {
        personaje.nivel = nivelNuevo;
        const clase = CLASES[personaje.clase];
        // Desbloquear habilidades nuevas
        const nuevasHabs = clase.habilidades
          .filter(h => h.nivel === nivelNuevo && !personaje.habilidades_desbloqueadas.includes(h.nombre))
          .map(h => h.nombre);
        personaje.habilidades_desbloqueadas.push(...nuevasHabs);
      }

      await personaje.save();

      const embed = new EmbedBuilder()
        .setColor(0x2b2d42)
        .setAuthor({ name: `${personaje.nombre} — ${CLASES[personaje.clase].emoji} Nivel ${personaje.nivel}` })
        .setDescription(respuesta)
        .setFooter({ text: `+${xpGanado} XP${subiNivel ? ` | ⭐ ¡SUBISTE AL NIVEL ${personaje.nivel}!` : ""}` });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("terminar_aventura").setLabel("🏁 Terminar aventura").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("ver_habilidades").setLabel("✨ Ver habilidades").setStyle(ButtonStyle.Secondary),
      );

      await interaction.editReply({ embeds: [embed], components: [row] });
    }
  },

  // /tablón - Ver tablón de misiones
  {
    data: new SlashCommandBuilder()
      .setName("tablon")
      .setDescription("Ver el tablón de misiones disponibles"),
    async execute(interaction) {
      await interaction.deferReply();
      const misiones = await Mision.find({ estado: "disponible", guildId: interaction.guildId }).limit(6).sort({ creada_en: -1 });

      if (misiones.length === 0) {
        return interaction.editReply({ content: "📋 El tablón está vacío. Un administrador puede usar `/generar_misiones` para publicar nuevas." });
      }

      const embed = new EmbedBuilder()
        .setColor(0xc9a84c)
        .setTitle("📋 Tablón de Misiones — Ecos de Eldoria")
        .setDescription("Misiones disponibles en el reino. Usa `/unirse [id]` para unirte.");

      for (const m of misiones) {
        const tipoEmoji = m.tipo === "solitario" ? "🧍" : "👥";
        embed.addFields({
          name: `${tipoEmoji} ${m.titulo} [${m.dificultad}]`,
          value: `${m.descripcion}\n**Recompensa:** ⭐ ${m.recompensas.xp} XP | 💰 ${m.recompensas.oro} oro | Jugadores: ${m.jugadores.length}/${m.max_jugadores}\n\`ID: ${m._id}\``,
        });
      }

      await interaction.editReply({ embeds: [embed] });
    }
  },

  // /unirse - Unirse a misión grupal
  {
    data: new SlashCommandBuilder()
      .setName("unirse")
      .setDescription("Unirte a una misión del tablón")
      .addStringOption(o => o.setName("id").setDescription("ID de la misión").setRequired(true)),
    async execute(interaction) {
      await interaction.deferReply({ ephemeral: true });
      const personaje = await Personaje.findOne({ userId: interaction.user.id });
      if (!personaje) return interaction.editReply({ content: "❌ Crea tu personaje primero." });
      if (personaje.en_aventura) return interaction.editReply({ content: "⚠️ Ya estás en una aventura." });

      const id = interaction.options.getString("id");
      let mision;
      try { mision = await Mision.findById(id); } catch { return interaction.editReply({ content: "❌ ID inválido." }); }
      if (!mision || mision.estado !== "disponible") return interaction.editReply({ content: "❌ Misión no disponible." });
      if (mision.nivel_minimo > personaje.nivel) return interaction.editReply({ content: `❌ Necesitas nivel ${mision.nivel_minimo} mínimo.` });
      if (mision.jugadores.find(j => j.userId === interaction.user.id)) return interaction.editReply({ content: "⚠️ Ya estás en esta misión." });
      if (mision.jugadores.length >= mision.max_jugadores) return interaction.editReply({ content: "❌ La misión está llena." });

      mision.jugadores.push({ userId: interaction.user.id, nombre: personaje.nombre, clase: personaje.clase });
      await mision.save();

      await interaction.editReply({ content: `✅ Te has unido a **${mision.titulo}**. Espera a que el líder inicie la aventura.` });

      // Notificar en el canal
      const canal = interaction.channel;
      canal.send(`🔔 **${personaje.nombre}** (${CLASES[personaje.clase].emoji} Nivel ${personaje.nivel}) se ha unido a **${mision.titulo}** [${mision.jugadores.length}/${mision.max_jugadores}]`);
    }
  },

  // /publicar_mision - Admin publica misión
  {
    data: new SlashCommandBuilder()
      .setName("publicar_mision")
      .setDescription("Publica una nueva misión en el tablón (Admin)")
      .addIntegerOption(o => o.setName("nivel").setDescription("Nivel recomendado").setRequired(true).setMinValue(1).setMaxValue(20))
      .addStringOption(o => o.setName("tipo").setDescription("Tipo").setRequired(true)
        .addChoices(
          { name: "🧍 Solitario", value: "solitario" },
          { name: "👥 Grupo",     value: "grupo" },
          { name: "🌍 Ambos",     value: "ambos" },
        )),
    async execute(interaction) {
      if (!interaction.member.permissions.has("MANAGE_GUILD") && !interaction.member.roles.cache.some(r => r.name.toLowerCase().includes("master") || r.name.toLowerCase().includes("admin"))) {
        return interaction.reply({ content: "❌ Necesitas permisos de administrador o rol DM/Master.", ephemeral: true });
      }
      await interaction.deferReply();
      const nivel = interaction.options.getInteger("nivel");
      const tipo  = interaction.options.getString("tipo");

      const misionData = await generarMision(nivel, tipo);
      if (!misionData) return interaction.editReply({ content: "❌ Error al generar. Intenta de nuevo." });

      const mision = await Mision.create({
        ...misionData,
        tipo, nivel_minimo: Math.max(1, nivel - 2),
        max_jugadores: tipo === "solitario" ? 1 : 4,
        guildId: interaction.guildId,
        expira_en: new Date(Date.now() + 72 * 60 * 60 * 1000),
      });

      const embed = new EmbedBuilder()
        .setColor(0xc9a84c)
        .setTitle(`📋 Nueva misión publicada: ${misionData.titulo}`)
        .setDescription(misionData.descripcion)
        .addFields(
          { name: "Dificultad", value: misionData.dificultad, inline: true },
          { name: "Tipo", value: tipo, inline: true },
          { name: "Nivel mín.", value: `${Math.max(1, nivel - 2)}`, inline: true },
          { name: "Recompensa", value: `⭐ ${misionData.recompensas.xp} XP | 💰 ${misionData.recompensas.oro} oro` },
          { name: "ID", value: `\`${mision._id}\`` },
        )
        .setFooter({ text: "Usa /unirse [ID] para unirte" });

      await interaction.editReply({ embeds: [embed] });
    }
  },

  // /habilidades - Ver habilidades
  {
    data: new SlashCommandBuilder()
      .setName("habilidades")
      .setDescription("Ver tus habilidades y cooldowns"),
    async execute(interaction) {
      await interaction.deferReply({ ephemeral: true });
      const personaje = await Personaje.findOne({ userId: interaction.user.id });
      if (!personaje) return interaction.editReply({ content: "❌ No tienes personaje." });

      const clase = CLASES[personaje.clase];
      const embed = new EmbedBuilder()
        .setColor(0x7b2d8b)
        .setTitle(`✨ Habilidades de ${personaje.nombre}`)
        .setDescription(`${clase.emoji} ${clase.nombre} — Nivel ${personaje.nivel}`);

      for (const h of clase.habilidades) {
        const desbloqueada = personaje.nivel >= h.nivel;
        const valor = h.dano ? `💥 ${h.dano}` : h.cura ? `💚 ${h.cura}` : `🔄 ${h.efecto}`;
        embed.addFields({
          name: `${desbloqueada ? "✅" : "🔒"} ${h.nombre} (Nv. ${h.nivel})`,
          value: `${valor}\n*${h.descripcion}*${h.cooldown > 0 ? `\n⏱️ Cooldown: ${h.cooldown} turnos` : ""}`,
          inline: true,
        });
      }

      await interaction.editReply({ embeds: [embed] });
    }
  },

  // /inventario - Ver inventario
  {
    data: new SlashCommandBuilder()
      .setName("inventario")
      .setDescription("Ver tu inventario"),
    async execute(interaction) {
      await interaction.deferReply({ ephemeral: true });
      const personaje = await Personaje.findOne({ userId: interaction.user.id });
      if (!personaje) return interaction.editReply({ content: "❌ No tienes personaje." });

      const embed = new EmbedBuilder()
        .setColor(0x8b6914)
        .setTitle(`🎒 Inventario de ${personaje.nombre}`)
        .setDescription(`💰 **Oro: ${personaje.oro}**`);

      if (personaje.inventario.length === 0) {
        embed.addFields({ name: "Vacío", value: "No tienes items" });
      } else {
        const grupos = {};
        for (const item of personaje.inventario) {
          if (!grupos[item.raridad]) grupos[item.raridad] = [];
          const allItems = { ...ARMAS, ...ARMADURAS };
          const data = allItems[item.itemId];
          const equipadoTag = Object.values(personaje.equipado).includes(item.itemId) ? " *(equipado)*" : "";
          grupos[item.raridad].push(`${data?.emoji || "📦"} **${item.nombre}**${equipadoTag} x${item.cantidad}`);
        }
        for (const [raridad, items] of Object.entries(grupos)) {
          embed.addFields({ name: `${RARIDADES[raridad].emoji} ${RARIDADES[raridad].nombre}`, value: items.join("\n") });
        }
      }

      await interaction.editReply({ embeds: [embed] });
    }
  },

  // /terminar - Terminar aventura actual
  {
    data: new SlashCommandBuilder()
      .setName("terminar")
      .setDescription("Termina tu aventura actual y cobra recompensas"),
    async execute(interaction) {
      await interaction.deferReply();
      const personaje = await Personaje.findOne({ userId: interaction.user.id });
      if (!personaje || !personaje.en_aventura) return interaction.editReply({ content: "⚠️ No estás en ninguna aventura." });

      personaje.en_aventura = false;
      personaje.historia = [];
      const oroBonus = Math.floor(Math.random() * 30) + 10;
      personaje.oro += oroBonus;
      await personaje.save();

      const embed = new EmbedBuilder()
        .setColor(0x4caf50)
        .setTitle("🏁 Aventura completada")
        .setDescription(`**${personaje.nombre}** regresa victorioso a la taberna.`)
        .addFields(
          { name: "💰 Oro ganado", value: `+${oroBonus}`, inline: true },
          { name: "⭐ Nivel actual", value: `${personaje.nivel}`, inline: true },
        )
        .setFooter({ text: "Usa /aventura para una nueva misión o /tablon para misiones grupales" });

      await interaction.editReply({ embeds: [embed] });
    }
  },

  // /top - Tabla de clasificación
  {
    data: new SlashCommandBuilder()
      .setName("top")
      .setDescription("Ver el ranking de héroes del servidor"),
    async execute(interaction) {
      await interaction.deferReply();
      const top = await Personaje.find({ guildId: interaction.guildId }).sort({ xp: -1 }).limit(10);

      const embed = new EmbedBuilder()
        .setColor(0xc9a84c)
        .setTitle("🏆 Ranking de Héroes — Ecos de Eldoria");

      const medallas = ["🥇", "🥈", "🥉"];
      const lineas = top.map((p, i) => {
        const medal = medallas[i] || `${i + 1}.`;
        const clase = CLASES[p.clase];
        return `${medal} **${p.nombre}** ${clase.emoji} Nv.${p.nivel} — ${p.xp} XP`;
      });

      embed.setDescription(lineas.join("\n") || "Nadie en el ranking aún.");
      await interaction.editReply({ embeds: [embed] });
    }
  },
];

module.exports = { comandos };
