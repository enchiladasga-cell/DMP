const ADVENTURES = {

  taberna_maldita: {
    id: 'taberna_maldita',
    title: '🍺 La Taberna Maldita',
    duration: 'corta',
    description: 'Una taberna en el camino esconde un oscuro secreto. Los viajeros que se quedan... no salen.',
    minPlayers: 2, maxPlayers: 6, recommendedLevel: 1,
    map: `
╔═══════════════════╗
║  🌲  BOSQUE  🌲   ║
║  ┌─────────────┐  ║
║  │  🍺TABERNA  │  ║
║  │  [ENTRADA]  │  ║
║  │  [BODEGA]   │  ║
║  └─────────────┘  ║
║    CAMINO REAL     ║
╚═══════════════════╝`,
    nodes: {
      inicio: {
        type: 'historia',
        text: `🌧️ **La lluvia cae sin piedad** mientras vuestro grupo recorre el Camino Real. A lo lejos, las luces de la *Taberna del Cuervo Rojo* parpadean como un faro de esperanza.\n\nAl entrar, el ambiente es extraño. El posadero os recibe con una sonrisa forzada.\n\n*"Bienvenidos, viajeros. Tenemos habitaciones... y una bodega llena de los mejores vinos."*\n\nUn bardo borracho susurra: **"No os quedéis. El posadero... guarda algo en la bodega."**\n\n**¿Qué hacéis?**`,
        options: [
          { id: 'opt_barda', label: '🗣️ Hablar con el bardo borracho', next: 'barda_info' },
          { id: 'opt_posadero', label: '🍺 Preguntar al posadero sobre la bodega', next: 'posadero_evasivo' },
          { id: 'opt_bodega', label: '🔍 Investigar la bodega a escondidas', next: 'bodega_sigilo' },
        ],
      },
      barda_info: {
        type: 'historia',
        text: `El bardo susurra tembloroso:\n\n*"Hace tres semanas llegaron mercaderes. Por la mañana... sus caballos estaban, pero ellos no."*\n\n*"El posadero baja a la bodega cada medianoche. Y cuando sube... siempre trae más vino. ¿De dónde saca tanto vino?"*`,
        options: [
          { id: 'opt_bodega2', label: '🔍 Ir a investigar la bodega ahora', next: 'bodega_sigilo' },
          { id: 'opt_esperar', label: '🌙 Esperar a medianoche y seguir al posadero', next: 'medianoche' },
        ],
      },
      posadero_evasivo: {
        type: 'tirada',
        text: `Preguntáis al posadero sobre la bodega. Su sonrisa no llega a los ojos.\n\n*"La bodega es privada. Solo almacenamiento."*\n\nPero sus manos tiemblan.\n\n🎲 **Tirada de PERSPICACIA (SAB) DC 12** — ¿Detectáis su mentira?`,
        skill: 'sabiduria', dc: 12,
        successNext: 'posadero_mentira', failNext: 'bodega_sigilo',
        successText: '✅ Notáis claramente que miente.',
        failText: '❌ No podéis leer sus intenciones.',
      },
      posadero_mentira: {
        type: 'historia',
        text: `Confrontáis al posadero. El hombre palidece y os lleva a un rincón.\n\n*"Hay algo en la bodega. Un espíritu. Me obliga a traer viajeros."*\n\n**"Si entráis, podéis liberarme. Pero es peligroso."**`,
        options: [
          { id: 'opt_ayudar', label: '⚔️ Acepta. Vamos a liberarte.', next: 'bodega_combate' },
          { id: 'opt_negar', label: '🚪 Salir de la taberna', next: 'huida_mala' },
        ],
      },
      bodega_sigilo: {
        type: 'tirada',
        text: `Bajáis las escaleras con cuidado. El olor a moho invade vuestras narices.\n\n🎲 **Tirada de SIGILO (DEX) DC 13** — ¿Pasáis sin ser detectados?`,
        skill: 'destreza', dc: 13,
        successNext: 'bodega_descubrimiento', failNext: 'combate_espiritu',
        successText: '✅ Os movéis como sombras.',
        failText: '❌ Un crujido os delata. El espíritu os ha detectado.',
      },
      bodega_descubrimiento: {
        type: 'historia',
        text: `En la bodega encontráis **tres mercaderes encadenados**, vivos pero en trance. En el centro, un altar con una gema negra pulsante.\n\nUna voz llena la estancia: *"Más almas para mi colección..."*\n\nEl **Espíritu del Altar** emerge.\n\n**¡COMBATE!**`,
        options: [
          { id: 'opt_atacar', label: '⚔️ Atacar al espíritu', next: 'combate_espiritu' },
          { id: 'opt_gema', label: '💎 Intentar destruir la gema primero (INT DC14)', next: 'destruir_gema' },
        ],
      },
      medianoche: {
        type: 'historia',
        text: `A medianoche, seguís al posadero hasta la bodega. Descubrís los mercaderes en trance y el altar maldito.\n\nEl posadero no os ha visto. Tenéis un momento de sorpresa.\n\n🎯 **Ventaja en iniciativa.**`,
        options: [
          { id: 'opt_atacar2', label: '⚔️ Atacar al espíritu con ventaja', next: 'combate_espiritu_ventaja' },
        ],
      },
      bodega_combate: {
        type: 'combate',
        text: '⚔️ El **Espíritu del Altar** flota hacia vosotros.',
        enemies: [
          { name: 'Espíritu del Altar', hp: 45, hpMax: 45, ca: 13, ataque: 5, danio: '2d6', xpReward: 150 },
        ],
        nextOnWin: 'victoria_taberna', nextOnLoss: 'derrota',
      },
      combate_espiritu: {
        type: 'combate',
        text: '⚔️ El **Espíritu del Altar** se lanza sobre vosotros.',
        enemies: [
          { name: 'Espíritu del Altar', hp: 45, hpMax: 45, ca: 13, ataque: 5, danio: '2d6', xpReward: 150 },
        ],
        nextOnWin: 'victoria_taberna', nextOnLoss: 'derrota',
      },
      combate_espiritu_ventaja: {
        type: 'combate',
        text: '⚔️ ¡Sorpresa! El **Espíritu del Altar** no esperaba vuestro ataque.',
        enemies: [
          { name: 'Espíritu del Altar (Debilitado)', hp: 30, hpMax: 30, ca: 12, ataque: 4, danio: '2d6', xpReward: 150 },
        ],
        advantage: true, nextOnWin: 'victoria_taberna', nextOnLoss: 'derrota',
      },
      destruir_gema: {
        type: 'tirada',
        text: `🎲 **Tirada de INTELIGENCIA (Arcana) DC 14** para destruir la gema.`,
        skill: 'inteligencia', dc: 14,
        successNext: 'gema_destruida', failNext: 'combate_espiritu',
        successText: '✅ La gema explota. El espíritu queda debilitado.',
        failText: '❌ No sabéis cómo destruirla. El espíritu contraataca.',
      },
      gema_destruida: {
        type: 'combate',
        text: '💥 La gema explota. El espíritu aparece **gravemente debilitado**.',
        enemies: [
          { name: 'Espíritu Debilitado', hp: 20, hpMax: 20, ca: 11, ataque: 3, danio: '1d6', xpReward: 100 },
        ],
        nextOnWin: 'victoria_taberna', nextOnLoss: 'derrota',
      },
      huida_mala: {
        type: 'fin', success: false,
        text: `Salís corriendo de la taberna. Pero mientras corréis escucháis los gritos de los mercaderes...\n\n*Los dejasteis atrás.*`,
        xpReward: 50, goldReward: { min: 0, max: 0 },
      },
      victoria_taberna: {
        type: 'fin', success: true,
        text: `La sombra se disuelve con un último chillido. Los mercaderes despiertan vivos.\n\nEl posadero llora de alivio: **"¡Libres!"**\n\n🏆 **¡AVENTURA COMPLETADA!**`,
        xpReward: 200, goldReward: { min: 30, max: 60 }, lootRolls: 1, isBoss: false,
      },
      derrota: {
        type: 'fin', success: false,
        text: `Las sombras os envuelven. Caéis uno a uno...\n\nCuando despertáis, estáis en el camino fuera de la taberna.\n\n*El espíritu os dejó vivir. Por ahora.*`,
        xpReward: 75, goldReward: { min: 0, max: 10 },
      },
    },
  },

  mina_abandonada: {
    id: 'mina_abandonada',
    title: '⛏️ La Mina de los Olvidados',
    duration: 'media',
    description: 'Una mina abandonada esconde riquezas y los espíritus de los mineros muertos que buscan venganza.',
    minPlayers: 2, maxPlayers: 6, recommendedLevel: 2,
    map: `
╔══════════════════════════════╗
║  🏔️  MONTAÑAS DEL NORTE  🏔️  ║
║  ┌──────────────────────┐   ║
║  │ [ENTRADA MINA]       │   ║
║  │  ├─[TUNEL ESTE]      │   ║
║  │  │   └─[CAMARA GEM.] │   ║
║  │  ├─[TUNEL OESTE]     │   ║
║  │  │   └─[TRAMPA]      │   ║
║  │  └─[NIVEL BAJO]      │   ║
║  │      └─[JEFE FINAL]  │   ║
║  └──────────────────────┘   ║
╚══════════════════════════════╝`,
    nodes: {
      inicio: {
        type: 'historia',
        text: `🏔️ El alcalde os contrató para investigar la mina abandonada de *Valdris*: hace 10 años explotó, mató a 23 mineros, y ahora dicen que **los muertos caminan**.\n\nLlegáis a la entrada. Las vigas están podridas. El viento gime al entrar.\n\nUna señal dice: **"MALDITO EL QUE ENTRE SIN PERMISO DE LOS MUERTOS"**\n\nHay dos túneles: el **este** (silencioso) y el **oeste** (extraños golpes rítmicos).`,
        options: [
          { id: 'opt_este', label: 'Explorar el Tunel Este (silencioso)', next: 'tunel_este' },
          { id: 'opt_oeste', label: 'Explorar el Tunel Oeste (golpes)', next: 'tunel_oeste' },
          { id: 'opt_inspeccionar', label: '🔍 Inspeccionar la entrada primero', next: 'entrada_pistas' },
        ],
      },
      entrada_pistas: {
        type: 'tirada',
        text: `Buscáis pistas antes de avanzar.\n\n🎲 **Tirada de INVESTIGACION (INT) DC 11**`,
        skill: 'inteligencia', dc: 11,
        successNext: 'pistas_encontradas', failNext: 'tunel_este',
        successText: '✅ Encontráis anotaciones: "Los espíritus duermen con luz. El jefe está en el nivel bajo. LA GEMA ROJA es su ancla."',
        failText: '❌ No encontráis nada útil.',
      },
      pistas_encontradas: {
        type: 'historia',
        text: `Las anotaciones revelan:\n- **Los espíritus son vulnerables a la luz**\n- **El jefe está en el nivel bajo**\n- **Una Gema Roja es su ancla**\n\n💡 *Información guardada.*`,
        flags: { tieneInfo: true },
        options: [
          { id: 'opt_este2', label: 'Explorar el Tunel Este', next: 'tunel_este' },
          { id: 'opt_oeste2', label: 'Explorar el Tunel Oeste', next: 'tunel_oeste' },
        ],
      },
      tunel_este: {
        type: 'historia',
        text: `El túnel este es más ancho. Vuestras antorchas iluminan **venas de mineral brillante**.\n\nTras una curva encontráis la **Cámara de las Gemas**. Hay algo de valor aquí...\n\n¡Pero escucháis pasos arrastrándose! **Tres Esqueletos de Minero** os emboscan.`,
        options: [
          { id: 'opt_luchar', label: '⚔️ Luchar', next: 'combate_esqueletos_este' },
          { id: 'opt_retroceder', label: 'Retroceder hacia la entrada', next: 'tunel_oeste' },
        ],
      },
      tunel_oeste: {
        type: 'tirada',
        text: `Los golpes se intensifican. La fuente: una **trampa de madera** activada por el viento.\n\nPero el suelo está lleno de tablones podridos.\n\n🎲 **Tirada de PERCEPCION (SAB) DC 13** para evitar la trampa.`,
        skill: 'sabiduria', dc: 13,
        successNext: 'trampa_evitada', failNext: 'trampa_caida',
        successText: '✅ Veis los tablones débiles y los sorteáis.',
        failText: '❌ ¡CRACK! El suelo cede.',
      },
      trampa_evitada: {
        type: 'historia',
        text: `Pasáis la trampa sin problema. Al fondo encontráis una escalera al **Nivel Bajo**.\n\nAquí el frío es cortante. En las paredes hay grabados de mineros trabajando... y algo devorándolos.`,
        options: [
          { id: 'opt_bajar', label: 'Bajar al Nivel Bajo', next: 'nivel_bajo' },
        ],
      },
      trampa_caida: {
        type: 'historia',
        text: `¡El suelo cede! Caéis en una cámara inferior tomando **1d6 daño**.\n\nPor suerte, es el camino al Nivel Bajo. Doloroso, pero eficiente.`,
        damage: '1d6',
        options: [
          { id: 'opt_continuar', label: 'Continuar al Nivel Bajo', next: 'nivel_bajo' },
        ],
      },
      combate_esqueletos_este: {
        type: 'combate',
        text: '💀 Tres **Esqueletos de Minero** os atacan con picos oxidados.',
        enemies: [
          { name: 'Esqueleto Minero', hp: 13, hpMax: 13, ca: 13, ataque: 4, danio: '1d6+2', xpReward: 50 },
          { name: 'Esqueleto Minero', hp: 13, hpMax: 13, ca: 13, ataque: 4, danio: '1d6+2', xpReward: 50 },
          { name: 'Esqueleto Minero', hp: 13, hpMax: 13, ca: 13, ataque: 4, danio: '1d6+2', xpReward: 50 },
        ],
        nextOnWin: 'camara_gemas', nextOnLoss: 'derrota_mina',
      },
      camara_gemas: {
        type: 'historia',
        text: `Con los esqueletos derrotados, exploráis la **Cámara de las Gemas**. Encontráis minerales valiosos y una caja fuerte oxidada.`,
        options: [
          { id: 'opt_caja', label: 'Abrir la caja a la fuerza (FUE DC14)', next: 'caja_abierta' },
          { id: 'opt_nivel_bajo', label: 'Ir al Nivel Bajo', next: 'nivel_bajo' },
        ],
      },
      caja_abierta: {
        type: 'tirada',
        text: `🎲 **Tirada de ATLETISMO (FUE) DC 14**`,
        skill: 'fuerza', dc: 14,
        successNext: 'tesoro_caja', failNext: 'nivel_bajo',
        successText: '✅ La caja cede. Dentro hay monedas y un objeto.',
        failText: '❌ La caja no cede. Continuáis.',
      },
      tesoro_caja: {
        type: 'historia',
        text: `Dentro encontráis **25 monedas de oro** y una **Poción de Curación Mayor**.`,
        bonusGold: 25,
        bonusItem: { name: 'Pocion de Curacion Mayor', type: 'pocion', rarity: 'infrecuente', bonus: 0, description: 'Recupera 4d4+4 PG.' },
        options: [
          { id: 'opt_nivel_bajo2', label: 'Ir al Nivel Bajo', next: 'nivel_bajo' },
        ],
      },
      nivel_bajo: {
        type: 'historia',
        text: `El **Nivel Bajo** es una cámara enorme. En el centro hay un **altar de piedra negra** con una gema roja que pulsa como un corazón.\n\nLos espectros de los 23 mineros flotan en silencio.\n\n*"¿Más intrusos? Llevamos diez años esperando que alguien nos libere... o pague."*\n\nEl **Espectro del Capataz Valdris** se materializa.`,
        options: [
          { id: 'opt_dialogar', label: '🗣️ Intentar hablar con Valdris', next: 'dialogo_valdris' },
          { id: 'opt_atacar_gema', label: '💎 Destruir la Gema Roja directamente', next: 'ataque_gema' },
          { id: 'opt_atacar_valdris', label: '⚔️ Atacar a Valdris', next: 'combate_valdris_dificil' },
        ],
      },
      dialogo_valdris: {
        type: 'tirada',
        text: `🎲 **Tirada de PERSUASION (CAR) DC 15**`,
        skill: 'carisma', dc: 15,
        successNext: 'valdris_convencido', failNext: 'combate_valdris',
        successText: '✅ Valdris os escucha. Su ira se transforma en esperanza.',
        failText: '❌ "¡Mentirosos! ¡Como todos!" — Ataca.',
      },
      valdris_convencido: {
        type: 'historia',
        text: `*"El dueño sabía que las vigas estaban podridas. Murieron 23 hombres. Si destruís la gema... seremos libres."*\n\nOs señala la gema y se aparta.`,
        options: [
          { id: 'opt_destruir', label: 'Destruir la Gema Roja', next: 'combate_gema_debil' },
        ],
      },
      ataque_gema: {
        type: 'combate',
        text: '💎 La **Gema Roja** está protegida. Valdris ataca mientras intentáis destruirla.',
        enemies: [
          { name: 'Gema Roja (Ancla)', hp: 30, hpMax: 30, ca: 15, ataque: 0, danio: '0', xpReward: 100 },
          { name: 'Capataz Valdris', hp: 40, hpMax: 40, ca: 13, ataque: 6, danio: '2d8', xpReward: 150 },
        ],
        nextOnWin: 'victoria_mina', nextOnLoss: 'derrota_mina',
      },
      combate_gema_debil: {
        type: 'combate',
        text: '💎 La **Gema Roja** pulsa débilmente. Valdris observa pero no interviene.',
        enemies: [
          { name: 'Gema Roja (Debilitada)', hp: 15, hpMax: 15, ca: 12, ataque: 3, danio: '1d6', xpReward: 200 },
        ],
        nextOnWin: 'victoria_mina', nextOnLoss: 'derrota_mina',
      },
      combate_valdris: {
        type: 'combate',
        text: '👻 El **Capataz Valdris** ruge de furia.',
        enemies: [
          { name: 'Capataz Valdris', hp: 65, hpMax: 65, ca: 14, ataque: 7, danio: '2d8+3', xpReward: 250 },
        ],
        nextOnWin: 'victoria_mina', nextOnLoss: 'derrota_mina',
      },
      combate_valdris_dificil: {
        type: 'combate',
        text: '👻 **Valdris y sus espectros** os atacan en masa.',
        enemies: [
          { name: 'Capataz Valdris', hp: 65, hpMax: 65, ca: 14, ataque: 7, danio: '2d8+3', xpReward: 250 },
          { name: 'Espectro Minero', hp: 22, hpMax: 22, ca: 12, ataque: 4, danio: '1d8', xpReward: 75 },
          { name: 'Espectro Minero', hp: 22, hpMax: 22, ca: 12, ataque: 4, danio: '1d8', xpReward: 75 },
        ],
        nextOnWin: 'victoria_mina', nextOnLoss: 'derrota_mina',
      },
      victoria_mina: {
        type: 'fin', success: true,
        text: `La gema explota en luz roja. Los espectros se disuelven en paz.\n\nValdris: *"Gracias. Decidle al pueblo que descansamos al fin."*\n\n🏆 **¡AVENTURA COMPLETADA!**`,
        xpReward: 450, goldReward: { min: 80, max: 150 }, lootRolls: 2, isBoss: true,
      },
      derrota_mina: {
        type: 'fin', success: false,
        text: `Los espectros os superan. Despertáis fuera de la mina en el frío.\n\n*La mina sigue maldita.*`,
        xpReward: 100, goldReward: { min: 0, max: 20 },
      },
    },
  },

  torre_del_lich: {
    id: 'torre_del_lich',
    title: '💀 La Torre del Lich',
    duration: 'larga',
    description: 'Un poderoso Lich amenaza el reino desde su torre. Solo los más valientes pueden detenerle.',
    minPlayers: 3, maxPlayers: 6, recommendedLevel: 4,
    map: `
╔══════════════════════════════════╗
║         🌑 TIERRAS MUERTAS 🌑    ║
║  ┌────────────────────────────┐  ║
║  │      💀 TORRE DEL LICH     │  ║
║  │  [PLANTA BAJA: GUARDIANES] │  ║
║  │  [PLANTA 2: BIBLIOTECA]    │  ║
║  │  [PLANTA 3: LABORATORIO]   │  ║
║  │  [CIMA: SALA DEL LICH]     │  ║
║  └────────────────────────────┘  ║
║  [PUEBLO] ═══════ [CAMINO MUERTO]║
╚══════════════════════════════════╝`,
    nodes: {
      inicio: {
        type: 'historia',
        text: `🌑 Las **Tierras Muertas** se extienden ante vosotros. El cielo es siempre gris.\n\nEn el horizonte, la **Torre del Lich Malachar** se eleva como una aguja negra.\n\nEl rey os encargó: *"Malachar lleva décadas extendiendo su maldición. Id a su torre y acabad con él... o encontrad su **Filacteria** y destruidla."*\n\nUna **Filacteria** es el objeto donde un Lich guarda su alma. Sin ella, es inmortal.\n\n¿Cómo os aproximáis?`,
        options: [
          { id: 'opt_fuerza', label: '⚔️ Asalto directo por la puerta principal', next: 'entrada_fuerza' },
          { id: 'opt_sigilo', label: 'Rodear la torre buscando entrada secreta', next: 'entrada_secreta' },
          { id: 'opt_parlamento', label: '📜 Enviar mensaje a Malachar para negociar', next: 'parlamento_lich' },
        ],
      },
      entrada_fuerza: {
        type: 'combate',
        text: '💀 La puerta está guardada por **dos Caballeros Esqueleto**.',
        enemies: [
          { name: 'Caballero Esqueleto', hp: 52, hpMax: 52, ca: 17, ataque: 6, danio: '1d8+4', xpReward: 200 },
          { name: 'Caballero Esqueleto', hp: 52, hpMax: 52, ca: 17, ataque: 6, danio: '1d8+4', xpReward: 200 },
        ],
        nextOnWin: 'planta_baja', nextOnLoss: 'derrota_torre',
      },
      entrada_secreta: {
        type: 'tirada',
        text: `Rodeáis la torre buscando entrada alternativa.\n\n🎲 **Tirada de PERCEPCION (SAB) DC 14**`,
        skill: 'sabiduria', dc: 14,
        successNext: 'entrada_secreta_encontrada', failNext: 'entrada_fuerza',
        successText: '✅ Encontráis una trampilla en la base norte.',
        failText: '❌ No encontráis nada. Hay que ir por la entrada principal.',
      },
      entrada_secreta_encontrada: {
        type: 'historia',
        text: `La trampilla os lleva a un pasaje subterráneo. Esquiváis a los guardianes.\n\n🎯 Acceso directo a la Planta Baja sin combate.`,
        options: [
          { id: 'opt_pb', label: 'Continuar a la Planta Baja', next: 'planta_baja' },
        ],
      },
      parlamento_lich: {
        type: 'tirada',
        text: `Enviáis un mensaje. Malachar responde: *"Venid. Os recibiré."*\n\nPero algo no está bien.\n\n🎲 **Tirada de PERSPICACIA (SAB) DC 16** para detectar la trampa.`,
        skill: 'sabiduria', dc: 16,
        successNext: 'trampa_detectada', failNext: 'trampa_activada',
        successText: '✅ Detectáis runas de miedo. Las desactiváis.',
        failText: '❌ Activáis las runas. Efecto Asustado (-2 ataques) 2 turnos.',
      },
      trampa_detectada: {
        type: 'historia',
        text: `Desactiváis las runas. Malachar: *"Impresionante. Quizás merezcáis vivir el tiempo suficiente para ser un desafío."*`,
        options: [
          { id: 'opt_pb2', label: 'Explorar la Planta Baja', next: 'planta_baja' },
        ],
      },
      trampa_activada: {
        type: 'historia',
        text: `Las runas os envuelven en miedo sobrenatural. El efecto **Asustado** dura 2 turnos.`,
        tempEffect: 'asustado_2_turnos',
        options: [
          { id: 'opt_pb3', label: 'Continuar a la Planta Baja', next: 'planta_baja' },
        ],
      },
      planta_baja: {
        type: 'historia',
        text: `La **Planta Baja** es una sala circular con cuatro estatuas. En el centro, una escalera lleva arriba.\n\nLas estatuas se mueven. Sus ojos se iluminan en rojo.\n\nUn **Golem de Piedra** y dos **Zombis Guerreros** bloquean la escalera.`,
        options: [
          { id: 'opt_combate_pb', label: '⚔️ Luchar para pasar', next: 'combate_planta_baja' },
          { id: 'opt_flanquear', label: 'Buscar cómo desactivar las estatuas (INT DC15)', next: 'desactivar_estatuas' },
        ],
      },
      desactivar_estatuas: {
        type: 'tirada',
        text: `🎲 **Tirada de ARCANOS (INT) DC 15**`,
        skill: 'inteligencia', dc: 15,
        successNext: 'estatuas_desactivadas', failNext: 'combate_planta_baja',
        successText: '✅ Encontráis la piedra de control. Los zombis se detienen.',
        failText: '❌ No encontráis cómo detenerlos.',
      },
      estatuas_desactivadas: {
        type: 'combate',
        text: '🪨 Los zombis se detienen. Solo el **Golem de Piedra** sigue avanzando.',
        enemies: [
          { name: 'Golem de Piedra', hp: 60, hpMax: 60, ca: 16, ataque: 7, danio: '2d8+4', xpReward: 250 },
        ],
        nextOnWin: 'planta_2', nextOnLoss: 'derrota_torre',
      },
      combate_planta_baja: {
        type: 'combate',
        text: '💀 El **Golem de Piedra** y los **Zombis Guerreros** os atacan.',
        enemies: [
          { name: 'Golem de Piedra', hp: 60, hpMax: 60, ca: 16, ataque: 7, danio: '2d8+4', xpReward: 250 },
          { name: 'Zombi Guerrero', hp: 30, hpMax: 30, ca: 12, ataque: 5, danio: '1d10+2', xpReward: 100 },
          { name: 'Zombi Guerrero', hp: 30, hpMax: 30, ca: 12, ataque: 5, danio: '1d10+2', xpReward: 100 },
        ],
        nextOnWin: 'planta_2', nextOnLoss: 'derrota_torre',
      },
      planta_2: {
        type: 'historia',
        text: `La **Biblioteca** ocupa toda la segunda planta. Un **Archimago No-Muerto** lee tranquilamente.\n\n*"Debo evaluaros con un acertijo. Si fallais, os devoraré."*\n\n**El acertijo:**\n*"Soy más viejo que el tiempo, más joven que el pensamiento. Los reyes me temen, los sabios me buscan. No tengo forma pero doy forma a todo. ¿Qué soy?"*`,
        options: [
          { id: 'opt_conocimiento', label: '"El Conocimiento"', next: 'acierto_acertijo' },
          { id: 'opt_muerte', label: '"La Muerte"', next: 'fallo_acertijo' },
          { id: 'opt_magia', label: '"La Magia"', next: 'fallo_acertijo' },
          { id: 'opt_atacar_arch', label: '⚔️ Ignorar el acertijo y atacar', next: 'combate_archimago' },
        ],
      },
      acierto_acertijo: {
        type: 'historia',
        text: `El Archimago asiente lentamente.\n\n*"Correcto. El conocimiento. Es la respuesta que Malachar nunca dio cuando le hice esta misma pregunta."*\n\nSe aparta del camino.`,
        options: [
          { id: 'opt_lab', label: 'Subir al Laboratorio', next: 'planta_3' },
        ],
      },
      fallo_acertijo: {
        type: 'combate',
        text: '📚 *"Incorrecto. Qué decepción."* — El Archimago ataca.',
        enemies: [
          { name: 'Archimago No-Muerto', hp: 70, hpMax: 70, ca: 15, ataque: 8, danio: '4d6', xpReward: 350 },
        ],
        nextOnWin: 'planta_3', nextOnLoss: 'derrota_torre',
      },
      combate_archimago: {
        type: 'combate',
        text: '📚 *"Siempre la violencia."* — El Archimago contraataca con todo su poder.',
        enemies: [
          { name: 'Archimago No-Muerto (Enfurecido)', hp: 85, hpMax: 85, ca: 16, ataque: 9, danio: '4d8', xpReward: 350 },
        ],
        nextOnWin: 'planta_3', nextOnLoss: 'derrota_torre',
      },
      planta_3: {
        type: 'historia',
        text: `El **Laboratorio** es un infierno de experimentos. Jaulas, frascos, el olor es insoportable.\n\nEncontráis el diario de Malachar: **su Filacteria es un anillo negro que siempre lleva puesto**.\n\nPara derrotarle permanentemente, debéis destruir el anillo **durante el combate**.\n\nTambién encontráis **Pociones de Resistencia** para todo el grupo.`,
        bonusEffect: 'pocion_resistencia_todos',
        options: [
          { id: 'opt_cima', label: 'Subir a la Cima. Enfrentar a Malachar.', next: 'cima_lich' },
        ],
      },
      cima_lich: {
        type: 'historia',
        text: `La **Sala del Lich** es una cámara circular abierta al cielo gris. En el centro, sentado en un trono de huesos, está **Malachar**.\n\nEsqueleto con túnica negra y ojos que arden como brasas. Lleva un anillo negro.\n\n*"Habéis llegado hasta aquí. Interesante."*\n\n*"¿Cuántos lo intentaron antes? Sus huesos decoran los pisos inferiores."*\n\n**¿Cuál es vuestro movimiento final?**`,
        options: [
          { id: 'opt_atacar_lich', label: '⚔️ Atacar a Malachar', next: 'combate_lich' },
          { id: 'opt_anillo', label: 'Intentar arrebatarle el anillo (DEX DC18)', next: 'robar_anillo' },
          { id: 'opt_hablar_lich', label: '🗣️ Intentar hablar con él (CAR DC20)', next: 'dialogo_lich' },
        ],
      },
      robar_anillo: {
        type: 'tirada',
        text: `🎲 **Tirada de JUEGO DE MANOS (DEX) DC 18** — La acción más arriesgada posible.`,
        skill: 'destreza', dc: 18,
        successNext: 'anillo_robado', failNext: 'combate_lich',
        successText: '✅ ¡El Picaro arranca el anillo! Malachar ruge de furia.',
        failText: '❌ Malachar captura vuestra mano. "¿De verdad?" — Combate.',
      },
      anillo_robado: {
        type: 'combate',
        text: '💍 El anillo está en vuestras manos. Malachar sin su Filacteria puede morir permanentemente.',
        enemies: [
          { name: 'Malachar el Lich (sin Filacteria)', hp: 100, hpMax: 100, ca: 17, ataque: 9, danio: '3d8+5', xpReward: 800 },
        ],
        nextOnWin: 'victoria_lich', nextOnLoss: 'derrota_torre',
      },
      dialogo_lich: {
        type: 'tirada',
        text: `🎲 **Tirada de PERSUASION (CAR) DC 20** — Convencer a un Lich es casi imposible.`,
        skill: 'carisma', dc: 20,
        successNext: 'lich_escucha', failNext: 'combate_lich',
        successText: '✅ Algo en vuestras palabras llega a lo que queda de humanidad en Malachar.',
        failText: '❌ "Las palabras no me interesan." — COMBATE.',
      },
      lich_escucha: {
        type: 'historia',
        text: `Malachar se detiene. Algo cambia en sus ojos.\n\n*"...doscientos años. Hace doscientos años era como vosotros."*\n\nSilencio.\n\n*"Me dije que la inmortalidad era para servir al conocimiento. Pero ¿qué he creado? Una tierra muerta."*\n\nSe quita el anillo y lo deja caer al suelo.\n\n*"Acabadlo. Soy demasiado cansado para seguir."*`,
        options: [
          { id: 'opt_destruir_filacteria', label: 'Destruir el anillo (la Filacteria)', next: 'victoria_lich_pacifico' },
        ],
      },
      combate_lich: {
        type: 'combate',
        text: '💀 **MALACHAR EL LICH** se levanta de su trono. El suelo tiembla.',
        enemies: [
          { name: 'Malachar el Lich', hp: 135, hpMax: 135, ca: 18, ataque: 10, danio: '4d8+6', xpReward: 1000 },
        ],
        nextOnWin: 'victoria_lich', nextOnLoss: 'derrota_torre',
      },
      victoria_lich: {
        type: 'fin', success: true,
        text: `El anillo se destruye con un destello cegador. Malachar lanza un último grito.\n\nLuego, silencio. El Lich se desmorona en polvo negro.\n\nLas **Tierras Muertas** comienzan a cambiar: por primera vez en siglos, aparecen brotes de hierba verde.\n\n*El nombre de vuestro grupo pasará a los libros de historia.*\n\n🏆 **¡AVENTURA COMPLETADA! — La Torre del Lich**`,
        xpReward: 1500, goldReward: { min: 300, max: 600 }, lootRolls: 3, isBoss: true,
      },
      victoria_lich_pacifico: {
        type: 'fin', success: true,
        text: `El anillo se rompe. Malachar suspira... y sonríe por primera vez en doscientos años.\n\n*"Gracias."*\n\nSu forma se desvanece como niebla al amanecer. No con violencia. Con paz.\n\n🕊️🏆 **¡AVENTURA COMPLETADA — Fin Pacifico!**`,
        xpReward: 1800, goldReward: { min: 350, max: 700 }, lootRolls: 4, isBoss: true,
      },
      derrota_torre: {
        type: 'fin', success: false,
        text: `Caéis ante el poder de Malachar.\n\n*"Vivid. Y recordad que Malachar el Lich es eterno."*\n\nEl reino sigue amenazado.`,
        xpReward: 200, goldReward: { min: 0, max: 50 },
      },
    },
  },
};

module.exports = { ADVENTURES };
