⬇️ Bajar al Nivel Bajo', next: 'nivel_bajo' },
        ],
      },

      trampa_caida: {
        type: 'historia',
        text: `¡El suelo cede! Caéis en una cámara inferior tomando **1d6 daño de caída**. 

Por suerte, es el camino al Nivel Bajo. Doloroso, pero eficiente.`,
        damage: '1d6',
        options: [
          { id: 'opt_continuar', label: '⬇️ Continuar hacia el Nivel Bajo', next: 'nivel_bajo' },
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
        nextOnWin: 'camara_gemas',
        nextOnLoss: 'derrota_mina',
      },

      camara_gemas: {
        type: 'historia',
        text: `Con los esqueletos derrotados, exploráis la **Cámara de las Gemas**. Encontráis minerales valiosos incrustados en las paredes y una caja fuerte oxidada.

🎲 Podéis intentar abrir la caja (Atletismo DC 14) o continuar al Nivel Bajo.`,
        options: [
          { id: 'opt_caja', label: '💪 Abrir la caja a la fuerza (FUE DC14)', next: 'caja_abierta' },
          { id: 'opt_nivel_bajo', label: '⬇️ Ir directamente al Nivel Bajo', next: 'nivel_bajo' },
        ],
      },

      caja_abierta: {
        type: 'tirada',
        text: `🎲 **Tirada de ATLETISMO (FUE)** DC 14`,
        skill: 'fuerza',
        dc: 14,
        successNext: 'tesoro_caja',
        failNext: 'nivel_bajo',
        successText: '✅ La caja cede. Dentro hay monedas y un objeto.',
        failText: '❌ La caja no cede. Continuáis hacia el Nivel Bajo.',
      },

      tesoro_caja: {
        type: 'historia',
        text: `Dentro de la caja encontráis **25 monedas de oro** y una **Poción de Curación Mayor**. ¡Bien hecho!`,
        bonusGold: 25,
        bonusItem: { name: 'Poción de Curación Mayor', type: 'pocion', rarity: 'infrecuente', bonus: 0, description: 'Recupera 4d4+4 PG.' },
        options: [
          { id: 'opt_nivel_bajo2', label: '⬇️ Ir al Nivel Bajo', next: 'nivel_bajo' },
        ],
      },

      nivel_bajo: {
        type: 'historia',
        text: `El **Nivel Bajo** es una cámara enorme excavada directamente en la roca. En el centro hay un **altar de piedra negra** con una gema roja que pulsa como un corazón.

Alrededor del altar flotan los espectros de los 23 mineros muertos, en silencio, mirándoos.

Entonces una voz grave resuena: *"¿Más intrusos? Llevamos diez años esperando. Esperando que alguien nos libere... o que alguien pague."*

El **Espectro del Capataz Valdris** se materializa. Su forma es imponente y sus ojos arden en rojo.`,
        options: [
          { id: 'opt_dialogar', label: '🗣️ Intentar hablar con Valdris', next: 'dialogo_valdris' },
          { id: 'opt_atacar_gema', label: '💎 Destruir la Gema Roja directamente', next: 'ataque_gema' },
          { id: 'opt_atacar_valdris', label: '⚔️ Atacar a Valdris', next: 'combate_valdris_dificil' },
        ],
      },

      dialogo_valdris: {
        type: 'tirada',
        text: `Intentáis convencer a Valdris de que podéis ayudarle.
🎲 **Tirada de PERSUASIÓN (CAR)** DC 15`,
        skill: 'carisma',
        dc: 15,
        successNext: 'valdris_convencido',
        failNext: 'combate_valdris',
        successText: '✅ Valdris os escucha. Su ira se transforma en algo parecido a la esperanza.',
        failText: '❌ Valdris no os cree. "¡Mentirosos! ¡Como todos!" — ¡Ataca!',
      },

      valdris_convencido: {
        type: 'historia',
        text: `Valdris os mira fijamente. Tras un largo silencio, habla:

*"El dueño de la mina sabía que las vigas estaban podridas. Las dejó así para no gastar oro. Murieron 23 hombres. Yo el último. Si destruís la gema... seremos libres. Pero el dueño... que pague."*

Os señala la gema y se aparta. Los otros espectros también se retiran.

La gema pulsa más fuerte, como si supiera lo que se avecina.`,
        options: [
          { id: 'opt_destruir', label: '💥 Destruir la Gema Roja', next: 'combate_gema_debil' },
        ],
      },

      ataque_gema: {
        type: 'combate',
        text: '💎 La **Gema Roja** está protegida por la energía de Valdris. ¡Hay que destruirla mientras él ataca!',
        enemies: [
          { name: 'Gema Roja (Ancla)', hp: 30, hpMax: 30, ca: 15, ataque: 0, danio: '0', xpReward: 100,
            description: 'Objetivo inmóvil. Valdris ataca mientras la destruís.' },
          { name: 'Capataz Valdris', hp: 40, hpMax: 40, ca: 13, ataque: 6, danio: '2d8', xpReward: 150,
            description: 'Espectro poderoso. Inmune a daño no mágico.' },
        ],
        nextOnWin: 'victoria_mina',
        nextOnLoss: 'derrota_mina',
      },

      combate_gema_debil: {
        type: 'combate',
        text: '💎 La **Gema Roja** pulsa débilmente. Valdris os observa pero no interviene.',
        enemies: [
          { name: 'Gema Roja (Debilitada)', hp: 15, hpMax: 15, ca: 12, ataque: 3, danio: '1d6', xpReward: 200,
            description: 'La gema lanza pulsos de energía espectral al ser atacada.' },
        ],
        nextOnWin: 'victoria_mina',
        nextOnLoss: 'derrota_mina',
      },

      combate_valdris: {
        type: 'combate',
        text: '👻 El **Capataz Valdris** ruge de furia y se lanza sobre vosotros.',
        enemies: [
          { name: 'Capataz Valdris', hp: 65, hpMax: 65, ca: 14, ataque: 7, danio: '2d8+3', xpReward: 250,
            description: 'Espectro veterano. Inmune a daño no mágico.' },
        ],
        nextOnWin: 'victoria_mina',
        nextOnLoss: 'derrota_mina',
      },

      combate_valdris_dificil: {
        type: 'combate',
        text: '👻 **Valdris y sus espectros** os atacan en masa. ¡Era una trampa!',
        enemies: [
          { name: 'Capataz Valdris', hp: 65, hpMax: 65, ca: 14, ataque: 7, danio: '2d8+3', xpReward: 250 },
          { name: 'Espectro Minero', hp: 22, hpMax: 22, ca: 12, ataque: 4, danio: '1d8', xpReward: 75 },
          { name: 'Espectro Minero', hp: 22, hpMax: 22, ca: 12, ataque: 4, danio: '1d8', xpReward: 75 },
        ],
        nextOnWin: 'victoria_mina',
        nextOnLoss: 'derrota_mina',
      },

      victoria_mina: {
        type: 'fin',
        success: true,
        text: `La gema explota en mil fragmentos de luz roja. Los espectros de los mineros comienzan a disolverse, pero esta vez no con ira... sino en paz.

Valdris os mira por última vez: *"Gracias, viajeros. Decidle al pueblo... que Valdris y sus hombres descansan al fin."*

Desaparece con una sonrisa triste. La mina queda en silencio.

Al salir, el alcalde os espera nervioso. Al oír las noticias, llora de alivio y os paga generosamente.

🏆 **¡AVENTURA COMPLETADA! — La Mina de los Olvidados**`,
        xpReward: 450,
        goldReward: { min: 80, max: 150 },
        lootRolls: 2,
        isBoss: true,
      },

      derrota_mina: {
        type: 'fin',
        success: false,
        text: `Los espectros os superan. Caéis inconscientes y cuando despertáis estáis fuera de la mina, en el frío de la noche.

Los espíritus os dejaron marchar. Por ahora.

*La mina sigue maldita. Los muertos, sin descanso.*`,
        xpReward: 100,
        goldReward: { min: 0, max: 20 },
      },
    },
  },

  // ════════════════════════════════════════════════════════
  //  LARGA (20+ decisiones, ~90-120 min)
  // ════════════════════════════════════════════════════════

  torre_del_lich: {
    id: 'torre_del_lich',
    title: '💀 La Torre del Lich',
    duration: 'larga',
    description: 'Un poderoso Lich amenaza el reino desde su torre. Solo los más valientes pueden detenerle.',
    minPlayers: 3,
    maxPlayers: 6,
    recommendedLevel: 4,
    xpReward: 1200,
    goldReward: { min: 200, max: 500 },
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
        text: `🌑 Las **Tierras Muertas** se extienden ante vosotros. El cielo es siempre gris aquí, el suelo no produce nada, y los cuervos siguen vuestros pasos en silencio.

En el horizonte, la **Torre del Lich Malachar** se eleva como una aguja negra contra las nubes.

El rey os encargó la misión: *"Malachar lleva décadas extendiendo su maldición. Los pueblos fronterizos están muriendo. Id a su torre y acabad con él... o al menos encontrad su **Filacteria** y destruidla."*

Una **Filacteria** es el objeto donde un Lich guarda su alma. Sin ella, es inmortal.

La torre tiene tres plantas antes de llegar a la cima. ¿Cómo queréis aproximaros?`,
        options: [
          { id: 'opt_fuerza', label: '⚔️ Asalto directo por la puerta principal', next: 'entrada_fuerza' },
          { id: 'opt_sigilo', label: '🌑 Rodear la torre buscando entrada secreta', next: 'entrada_secreta' },
          { id: 'opt_parlamento', label: '📜 Enviar mensaje a Malachar para negociar', next: 'parlamento_lich' },
        ],
      },

      entrada_fuerza: {
        type: 'combate',
        text: '💀 La puerta principal está guardada por **dos Caballeros Esqueleto** con armadura completa.',
        enemies: [
          { name: 'Caballero Esqueleto', hp: 52, hpMax: 52, ca: 17, ataque: 6, danio: '1d8+4', xpReward: 200 },
          { name: 'Caballero Esqueleto', hp: 52, hpMax: 52, ca: 17, ataque: 6, danio: '1d8+4', xpReward: 200 },
        ],
        nextOnWin: 'planta_baja',
        nextOnLoss: 'derrota_torre',
      },

      entrada_secreta: {
        type: 'tirada',
        text: `Rodeáis la torre buscando una entrada alternativa.
🎲 **Tirada de PERCEPCIÓN (SAB)** DC 14`,
        skill: 'sabiduria',
        dc: 14,
        successNext: 'entrada_secreta_encontrada',
        failNext: 'entrada_fuerza',
        successText: '✅ Encontráis una trampilla en la base norte. Entráis sin ser vistos.',
        failText: '❌ No encontráis nada. Tendréis que ir por la entrada principal.',
      },

      entrada_secreta_encontrada: {
        type: 'historia',
        text: `La trampilla os lleva a un **pasaje subterráneo** que conecta con el sótano de la torre. Esquiváis a los guardianes de la entrada.

Ganáis acceso directo a la **Planta Baja** sin combate.
🎯 Ventaja en la primera tirada de la Planta Baja.`,
        bonusFlag: { sigilo_torre: true },
        options: [
          { id: 'opt_pb', label: '🏰 Continuar a la Planta Baja', next: 'planta_baja' },
        ],
      },

      parlamento_lich: {
        type: 'tirada',
        text: `Enviáis un mensaje con un cuervo. Sorprendentemente, Malachar responde: *"Venid. Os recibiré."*

Entráis sin resistencia. Pero algo no está bien.
🎲 **Tirada de PERSPICACIA (SAB)** DC 16 para detectar la trampa.`,
        skill: 'sabiduria',
        dc: 16,
        successNext: 'trampa_detectada',
        failNext: 'trampa_activada',
        successText: '✅ Detectáis runas de miedo en la entrada. Las desactiváis antes de activarlas.',
        failText: '❌ Activáis las runas. Cada miembro del grupo sufre el efecto Asustado (-2 ataques) por 2 turnos.',
      },

      trampa_detectada: {
        type: 'historia',
        text: `Desactiváis las runas con cuidado. Malachar os observa desde las sombras.

*"Impresionante. Quizás merezcáis vivir el tiempo suficiente para ser un desafío interesante."*

Entráis a la Planta Baja con ventaja táctica.`,
        bonusFlag: { parlamentado: true },
        options: [
          { id: 'opt_pb2', label: '🏰 Explorar la Planta Baja', next: 'planta_baja' },
        ],
      },

      trampa_activada: {
        type: 'historia',
        text: `Las runas os envuelven en un miedo sobrenatural. Vuestros corazones laten desbocados.

El efecto **Asustado** dura 2 turnos de combate. Avanzáis con precaución hacia la Planta Baja.`,
        tempEffect: 'asustado_2_turnos',
        options: [
          { id: 'opt_pb3', label: '🏰 Continuar a la Planta Baja', next: 'planta_baja' },
        ],
      },

      planta_baja: {
        type: 'historia',
        text: `La **Planta Baja** es una sala circular con cuatro estatuas de guerreros. En el centro, una escalera lleva arriba.

Pero las estatuas se mueven. Sus ojos de piedra se iluminan en rojo.

Un **Golem de Piedra** y dos **Zombis Guerreros** bloquean la escalera.`,
        options: [
          { id: 'opt_combate_pb', label: '⚔️ ¡Luchar para pasar!', next: 'combate_planta_baja' },
          { id: 'opt_flanquear', label: '🧠 Buscar cómo desactivar las estatuas (INT DC15)', next: 'desactivar_estatuas' },
        ],
      },

      desactivar_estatuas: {
        type: 'tirada',
        text: `🎲 **Tirada de ARCANOS (INT)** DC 15`,
        skill: 'inteligencia',
        dc: 15,
        successNext: 'estatuas_desactivadas',
        failNext: 'combate_planta_baja',
        successText: '✅ Encontráis la piedra de control detrás de una estatua. Los zombis se detienen. Solo queda el Golem.',
        failText: '❌ No encontráis cómo detenerlos. ¡Combate!',
      },

      estatuas_desactivadas: {
        type: 'combate',
        text: '🪨 Los zombis se detienen, pero el **Golem de Piedra** continúa avanzando.',
        enemies: [
          { name: 'Golem de Piedra', hp: 60, hpMax: 60, ca: 16, ataque: 7, danio: '2d8+4', xpReward: 250,
            description: 'Inmune a hechizos de encantamiento y veneno.' },
        ],
        nextOnWin: 'planta_2',
        nextOnLoss: 'derrota_torre',
      },

      combate_planta_baja: {
        type: 'combate',
        text: '💀 El **Golem de Piedra** y los **Zombis Guerreros** os atacan.',
        enemies: [
          { name: 'Golem de Piedra', hp: 60, hpMax: 60, ca: 16, ataque: 7, danio: '2d8+4', xpReward: 250 },
          { name: 'Zombi Guerrero', hp: 30, hpMax: 30, ca: 12, ataque: 5, danio: '1d10+2', xpReward: 100 },
          { name: 'Zombi Guerrero', hp: 30, hpMax: 30, ca: 12, ataque: 5, danio: '1d10+2', xpReward: 100 },
        ],
        nextOnWin: 'planta_2',
        nextOnLoss: 'derrota_torre',
      },

      planta_2: {
        type: 'historia',
        text: `La **Biblioteca** ocupa toda la segunda planta. Miles de tomos cubren las paredes del suelo al techo.

En el centro, un **Archimago No-Muerto** lee tranquilamente. Al veros, cierra el libro.

*"Intrusos. Malachar me dijo que llegaríais. Debo evaluaros... con un acertijo. Si fallais, os devoraré."*

**El acertijo del Archimago:**
*"Soy más viejo que el tiempo, más joven que el pensamiento. Los reyes me temen, los sabios me buscan. No tengo forma pero doy forma a todo. ¿Qué soy?"*`,
        options: [
          { id: 'opt_conocimiento', label: '📚 "El Conocimiento"', next: 'acierto_acertijo' },
          { id: 'opt_muerte', label: '💀 "La Muerte"', next: 'fallo_acertijo' },
          { id: 'opt_magia', label: '✨ "La Magia"', next: 'fallo_acertijo' },
          { id: 'opt_atacar_arch', label: '⚔️ Ignorar el acertijo y atacar', next: 'combate_archimago' },
        ],
      },

      acierto_acertijo: {
        type: 'historia',
        text: `El Archimago os mira fijamente. Luego, lentamente, asiente.

*"Correcto. El conocimiento. Es la respuesta que Malachar nunca dio cuando le hice la misma pregunta hace doscientos años."*

Se aparta del camino. *"Pasad. Pero tened cuidado en el Laboratorio. Malachar... ha estado experimentando."*

Os señala hacia la escalera y os deja pasar.`,
        options: [
          { id: 'opt_lab', label: '⚗️ Subir al Laboratorio', next: 'planta_3' },
        ],
      },

      fallo_acertijo: {
        type: 'combate',
        text: '📚 El Archimago suspira: *"Incorrecto. Qué decepción."* — ¡Ataca!',
        enemies: [
          { name: 'Archimago No-Muerto', hp: 70, hpMax: 70, ca: 15, ataque: 8, danio: '4d6', xpReward: 350,
            description: 'Lanza hechizos. Inmune a veneno y encantamiento.' },
        ],
        nextOnWin: 'planta_3',
        nextOnLoss: 'derrota_torre',
      },

      combate_archimago: {
        type: 'combate',
        text: '📚 El Archimago suspira: *"Siempre la violencia."* — ¡Contraataca con todo su poder!',
        enemies: [
          { name: 'Archimago No-Muerto (Enfurecido)', hp: 85, hpMax: 85, ca: 16, ataque: 9, danio: '4d8', xpReward: 350 },
        ],
        nextOnWin: 'planta_3',
        nextOnLoss: 'derrota_torre',
      },

      planta_3: {
        type: 'historia',
        text: `El **Laboratorio** es un infierno de experimentos. Jaulas con criaturas irreconocibles. Frascos con líquidos burbujeantes. El olor es insoportable.

En el centro, una **mesa de disección** con algo que fue humano.

Pero lo más importante: encontráis el diario de Malachar. En él descubrís que **su Filacteria es un anillo negro que siempre lleva puesto**.

Para derrotarle permanentemente, debéis destruir el anillo **durante el combate**.

También encontráis **Pociones de Resistencia** para todo el grupo. (+10 HP temporal cada una)`,
        bonusEffect: 'pocion_resistencia_todos',
        options: [
          { id: 'opt_cima', label: '💀 Subir a la Cima. Enfrentar a Malachar.', next: 'cima_lich' },
        ],
      },

      cima_lich: {
        type: 'historia',
        text: `La **Sala del Lich** es una cámara circular abierta al cielo gris. El viento aúlla. En el centro, sentado en un trono de huesos, está **Malachar**.

Su forma es un esqueleto con túnica negra y ojos que arden como brasas. Lleva un anillo negro en el dedo.

*"Habéis llegado hasta aquí. Interesante. ¿Sabéis cuántos lo intentaron antes? Sus huesos decoran los pisos inferiores."*

Se pone en pie lentamente. *"Pero vosotros... huelo algo diferente. Valentía, quizás. O estupidez. Es difícil distinguirlas."*

**¿Cuál es vuestro movimiento final?**`,
        options: [
          { id: 'opt_atacar_lich', label: '⚔️ ¡Atacar a Malachar!', next: 'combate_lich' },
          { id: 'opt_anillo', label: '💍 Intentar arrebatarle el anillo (DEX DC18)', next: 'robar_anillo' },
          { id: 'opt_hablar_lich', label: '🗣️ Intentar hablar con él (CAR DC20)', next: 'dialogo_lich' },
        ],
      },

      robar_anillo: {
        type: 'tirada',
        text: `🎲 **Tirada de JUEGO DE MANOS (DEX)** DC 18 — Es la acción más arriesgada posible.`,
        skill: 'destreza',
        dc: 18,
        successNext: 'anillo_robado',
        failNext: 'combate_lich',
        successText: '✅ ¡Increíble! Vuestro Pícaro arranca el anillo antes de que Malachar reaccione. El Lich ruge de furia.',
        failText: '❌ Malachar captura vuestra mano. "¿De verdad?" — ¡Combate!',
      },

      anillo_robado: {
        type: 'combate',
        text: '💍 ¡El anillo está en vuestras manos! Malachar sin su Filacteria puede morir permanentemente. Pero aún es poderoso.',
        enemies: [
          { name: 'Malachar el Lich (sin Filacteria)', hp: 100, hpMax: 100, ca: 17, ataque: 9, danio: '3d8+5', xpReward: 800,
            description: 'Sin su filacteria, puede morir. Aún usa hechizos devastadores.' },
        ],
        nextOnWin: 'victoria_lich',
        nextOnLoss: 'derrota_torre',
      },

      dialogo_lich: {
        type: 'tirada',
        text: `🎲 **Tirada de PERSUASIÓN (CAR)** DC 20 — Convencer a un Lich es casi imposible.`,
        skill: 'carisma',
        dc: 20,
        successNext: 'lich_escucha',
        failNext: 'combate_lich',
        successText: '✅ Algo en vuestras palabras llega a lo que queda de humanidad en Malachar.',
        failText: '❌ Malachar ríe: "Las palabras no me interesan." — ¡COMBATE!',
      },

      lich_escucha: {
        type: 'historia',
        text: `Malachar se detiene. Algo cambia en sus ojos ardientes.

*"...doscientos años. Hace doscientos años era como vosotros. Un mago. Un hombre."*

Silencio.

*"Me dije que la inmortalidad era para servir al conocimiento. Pero... ¿qué he creado? Una tierra muerta. Sirvientes sin voluntad."*

Se quita el anillo y lo deja caer al suelo frente a vosotros.

*"Acabadlo. Soy... demasiado cansado para seguir."*

No hay combate. Solo el fin de una historia muy larga.`,
        options: [
          { id: 'opt_destruir_filacteria', label: '💥 Destruir el anillo (la Filacteria)', next: 'victoria_lich_pacifico' },
        ],
      },

      combate_lich: {
        type: 'combate',
        text: '💀 **MALACHAR EL LICH** se levanta de su trono. El suelo tiembla.',
        enemies: [
          { name: 'Malachar el Lich', hp: 135, hpMax: 135, ca: 18, ataque: 10, danio: '4d8+6', xpReward: 1000,
            description: 'JEFE FINAL. Primera vez que cae a 0 HP, se regenera a 50 HP (filacteria). Hay que destruir su anillo en combate para matarle permanentemente.' },
        ],
        nextOnWin: 'victoria_lich',
        nextOnLoss: 'derrota_torre',
      },

      victoria_lich: {
        type: 'fin',
        success: true,
        text: `El anillo se destruye con un destello cegador. Malachar lanza un último grito que sacude la torre hasta los cimientos.

Luego, silencio.

El Lich se desmorona en polvo negro que el viento se lleva. Las **Tierras Muertas** comienzan a cambiar: la tierra oscura se agrieta, y por primera vez en siglos, aparecen brotes de hierba verde.

Cuando regresáis al reino, el rey en persona os recibe. Las campanas suenan en todos los pueblos.

*El nombre de vuestro grupo pasará a los libros de historia.*

🏆 **¡AVENTURA COMPLETADA! — La Torre del Lich**`,
        xpReward: 1500,
        goldReward: { min: 300, max: 600 },
        lootRolls: 3,
        isBoss: true,
      },

      victoria_lich_pacifico: {
        type: 'fin',
        success: true,
        text: `El anillo se rompe en vuestras manos. Malachar suspira... y sonríe por primera vez en doscientos años.

*"Gracias."*

Su forma se desvanece lentamente, como niebla al amanecer. No con violencia. Con paz.

Las **Tierras Muertas** florecen. Los non-muertos caen. El cielo gris se despeja.

El rey os premia generosamente. Pero el mayor premio es saber que devolvisteis la dignidad a un alma perdida.

🕊️🏆 **¡AVENTURA COMPLETADA — Fin Pacífico! — La Torre del Lich**`,
        xpReward: 1800,
        goldReward: { min: 350, max: 700 },
        lootRolls: 4,
        isBoss: true,
      },

      derrota_torre: {
        type: 'fin',
        success: false,
        text: `Caéis ante el poder de Malachar. El Lich os observa en el suelo.

*"Interesantes. Más que la mayoría."*

Ordena a sus sirvientes que os lleven fuera de la torre.

*"Vivid. Y recordad que Malachar el Lich es eterno."*

El reino sigue amenazado. Pero vosotros vivís para intentarlo de nuevo.`,
        xpReward: 200,
        goldReward: { min: 0, max: 50 },
      },
    },
  },
};

module.exports = { ADVENTURES };
