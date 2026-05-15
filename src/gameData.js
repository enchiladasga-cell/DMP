// =============================================
//   DATOS DEL JUEGO - Clases, Items, Rarezas
// =============================================

const RARIDADES = {
  COMUN:     { nombre: "Común",     emoji: "⬜", color: "#b0b0b0", multiplicador: 1.0 },
  INUSUAL:   { nombre: "Inusual",   emoji: "🟩", color: "#1eff00", multiplicador: 1.3 },
  RARO:      { nombre: "Raro",      emoji: "🟦", color: "#0070dd", multiplicador: 1.7 },
  EPICO:     { nombre: "Épico",     emoji: "🟪", color: "#a335ee", multiplicador: 2.2 },
  LEGENDARIO:{ nombre: "Legendario",emoji: "🟧", color: "#ff8000", multiplicador: 3.0 },
  MITICO:    { nombre: "Mítico",    emoji: "🔴", color: "#e6cc80", multiplicador: 4.0 },
};

const CLASES = {
  GUERRERO: {
    nombre: "Guerrero",
    emoji: "⚔️",
    descripcion: "Maestro del combate cuerpo a cuerpo. Resistente y devastador.",
    stats_base: { hp: 120, mana: 40, fuerza: 16, destreza: 10, inteligencia: 8, constitucion: 14 },
    habilidades: [
      { nombre: "Golpe Brutal",     nivel: 1,  tipo: "ataque",  dano: "2d8+fue",  cooldown: 0, descripcion: "Un golpe potente que aplasta al enemigo." },
      { nombre: "Postura Defensiva",nivel: 3,  tipo: "buff",    efecto: "+30% defensa 2 turnos", cooldown: 3, descripcion: "Adoptas una postura que reduce el daño recibido." },
      { nombre: "Torbellino",       nivel: 6,  tipo: "ataque",  dano: "3d6+fue",  cooldown: 4, descripcion: "Giras atacando a todos los enemigos cercanos.", aoe: true },
      { nombre: "Grito de Guerra",  nivel: 10, tipo: "buff",    efecto: "+20% daño grupo 3 turnos", cooldown: 5, descripcion: "Inspiras al grupo con un grito feroz.", grupal: true },
      { nombre: "Furia Berserker",  nivel: 15, tipo: "ultimate",dano: "5d10+fue", cooldown: 8, descripcion: "Te dejas llevar por la furia, multiplicando tu poder." },
    ],
    equipo_inicial: ["espada_corta", "escudo_madera"],
  },
  MAGO: {
    nombre: "Mago",
    emoji: "🔮",
    descripcion: "Portador de arcanos. Destruye con hechizos pero es frágil.",
    stats_base: { hp: 70, mana: 140, fuerza: 6, destreza: 12, inteligencia: 18, constitucion: 8 },
    habilidades: [
      { nombre: "Dardo Mágico",    nivel: 1,  tipo: "ataque",  dano: "2d6+int",  cooldown: 0, descripcion: "Un proyectil de energía arcana infalible." },
      { nombre: "Bola de Fuego",   nivel: 3,  tipo: "ataque",  dano: "4d6+int",  cooldown: 3, descripcion: "Una esfera de fuego que explota al impacto.", aoe: true },
      { nombre: "Escudo Arcano",   nivel: 6,  tipo: "buff",    efecto: "absorbe 50 daño", cooldown: 4, descripcion: "Una barrera mágica te protege temporalmente." },
      { nombre: "Rayo de Escarcha",nivel: 10, tipo: "ataque",  dano: "3d8+int",  cooldown: 4, descripcion: "Congela al enemigo, reduciéndole velocidad." },
      { nombre: "Lluvia Meteórica", nivel: 15, tipo: "ultimate",dano: "8d8+int",  cooldown: 8, descripcion: "Invocas meteoros del cielo sobre tus enemigos.", aoe: true },
    ],
    equipo_inicial: ["baston_aprendiz", "tomo_basico"],
  },
  LADRON: {
    nombre: "Ladrón",
    emoji: "🗡️",
    descripcion: "Veloz y letal. Golpea en las sombras antes de ser visto.",
    stats_base: { hp: 85, mana: 70, fuerza: 10, destreza: 18, inteligencia: 12, constitucion: 10 },
    habilidades: [
      { nombre: "Apuñalar",         nivel: 1,  tipo: "ataque",  dano: "2d6+des",  cooldown: 0, descripcion: "Un golpe rápido en un punto vital." },
      { nombre: "Golpe Furtivo",    nivel: 3,  tipo: "ataque",  dano: "4d6+des",  cooldown: 2, descripcion: "Atacas desde las sombras con daño masivo." },
      { nombre: "Humo y Sombras",   nivel: 6,  tipo: "buff",    efecto: "evasión +50% 2 turnos", cooldown: 4, descripcion: "Te ocultas en humo, volviéndote difícil de golpear." },
      { nombre: "Veneno Paralizante",nivel:10, tipo: "debuff",  efecto: "envenena 3 turnos", cooldown: 4, descripcion: "Aplicas un veneno que paraliza al objetivo." },
      { nombre: "Danza de la Muerte",nivel:15, tipo: "ultimate",dano: "6d8+des",  cooldown: 7, descripcion: "Una danza letal de múltiples ataques relámpago." },
    ],
    equipo_inicial: ["daga_herrumbrosa", "capa_sombra"],
  },
  CLERIGO: {
    nombre: "Clérigo",
    emoji: "✨",
    descripcion: "Guardián de la vida. Sana a sus aliados y castiga a los no-muertos.",
    stats_base: { hp: 95, mana: 110, fuerza: 10, destreza: 8, inteligencia: 14, constitucion: 12 },
    habilidades: [
      { nombre: "Golpe Sagrado",    nivel: 1,  tipo: "ataque",  dano: "1d8+int",  cooldown: 0, descripcion: "Un golpe imbuido de energía divina." },
      { nombre: "Curar Heridas",    nivel: 1,  tipo: "curar",   cura: "2d8+int",  cooldown: 2, descripcion: "Canalizas energía curativa hacia un aliado." },
      { nombre: "Bendición",        nivel: 3,  tipo: "buff",    efecto: "+15% daño y defensa grupo", cooldown: 4, descripcion: "Bendices a todo el grupo con poder divino.", grupal: true },
      { nombre: "Luz Purificadora", nivel: 6,  tipo: "ataque",  dano: "3d8+int",  cooldown: 3, descripcion: "Un rayo de luz pura que daña el mal." },
      { nombre: "Resurrección",     nivel: 10, tipo: "revivir", efecto: "revive aliado con 50% HP", cooldown: 8, descripcion: "Traes de vuelta a un aliado caído." },
      { nombre: "Milagro Divino",   nivel: 15, tipo: "ultimate",cura: "full grupo", cooldown: 10, descripcion: "Restauras completamente la vida de todo el grupo.", grupal: true },
    ],
    equipo_inicial: ["maza_sagrada", "escudo_fe"],
  },
  ARQUERO: {
    nombre: "Arquero",
    emoji: "🏹",
    descripcion: "Atacante a distancia. Preciso, ágil y difícil de alcanzar.",
    stats_base: { hp: 90, mana: 60, fuerza: 12, destreza: 16, inteligencia: 10, constitucion: 10 },
    habilidades: [
      { nombre: "Disparo Certero",  nivel: 1,  tipo: "ataque",  dano: "2d6+des",  cooldown: 0, descripcion: "Un disparo preciso al punto débil." },
      { nombre: "Lluvia de Flechas",nivel: 3,  tipo: "ataque",  dano: "3d4+des",  cooldown: 3, descripcion: "Disparas múltiples flechas al aire.", aoe: true },
      { nombre: "Flecha Explosiva", nivel: 6,  tipo: "ataque",  dano: "4d6+des",  cooldown: 4, descripcion: "Una flecha imbuida con pólvora que explota." },
      { nombre: "Ojo de Águila",    nivel: 10, tipo: "buff",    efecto: "+40% daño 3 turnos", cooldown: 5, descripcion: "Tu precisión se vuelve sobrenatural." },
      { nombre: "Disparo Legendario",nivel:15, tipo: "ultimate",dano: "10d6+des", cooldown: 8, descripcion: "El disparo más preciso de tu vida." },
    ],
    equipo_inicial: ["arco_madera", "carcaj_flechas"],
  },
  DRUIDA: {
    nombre: "Druida",
    emoji: "🌿",
    descripcion: "Guardián de la naturaleza. Controla el campo de batalla y cura.",
    stats_base: { hp: 100, mana: 100, fuerza: 10, destreza: 10, inteligencia: 14, constitucion: 14 },
    habilidades: [
      { nombre: "Látigo de Enredaderas",nivel:1, tipo:"ataque", dano:"2d6+int", cooldown:0, descripcion:"Enredaderas te atacan desde el suelo." },
      { nombre: "Regeneración Natural",  nivel:3, tipo:"curar",  cura:"1d6+int por 3 turnos", cooldown:3, descripcion:"La naturaleza sana tus heridas gradualmente." },
      { nombre: "Forma Animal",          nivel:6, tipo:"buff",   efecto:"+50% HP y fuerza 3 turnos", cooldown:6, descripcion:"Te transformas en una bestia poderosa." },
      { nombre: "Tormenta de Espinas",   nivel:10,tipo:"ataque", dano:"4d6+int", cooldown:4, descripcion:"Una tormenta de espinas azota el área.", aoe:true },
      { nombre: "Corazón del Bosque",    nivel:15,tipo:"ultimate",efecto:"cura grupo + invoca guardián", cooldown:9, descripcion:"El espíritu del bosque desciende para protegerte.", grupal:true },
    ],
    equipo_inicial: ["baculo_raiz", "amuleto_hoja"],
  },
};

const ARMAS = {
  // COMUNES
  espada_corta:    { nombre: "Espada Corta",      tipo: "espada",  raridad: "COMUN",     dano: "1d6",  precio: 50,  emoji: "🗡️",  descripcion: "Una espada básica de hierro." },
  daga_herrumbrosa:{ nombre: "Daga Herrumbrosa",  tipo: "daga",    raridad: "COMUN",     dano: "1d4",  precio: 30,  emoji: "🔪",  descripcion: "Una daga vieja pero funcional." },
  baston_aprendiz: { nombre: "Bastón de Aprendiz",tipo: "baston",  raridad: "COMUN",     dano: "1d4",  precio: 40,  emoji: "🪄",  descripcion: "Un bastón de madera para iniciados." },
  arco_madera:     { nombre: "Arco de Madera",    tipo: "arco",    raridad: "COMUN",     dano: "1d6",  precio: 45,  emoji: "🏹",  descripcion: "Un arco simple pero efectivo." },
  maza_sagrada:    { nombre: "Maza Sagrada",       tipo: "maza",    raridad: "COMUN",     dano: "1d6",  precio: 50,  emoji: "🔨",  descripcion: "Una maza bendecida con energía divina." },
  baculo_raiz:     { nombre: "Báculo de Raíz",    tipo: "baculo",  raridad: "COMUN",     dano: "1d4",  precio: 40,  emoji: "🌿",  descripcion: "Un báculo hecho de raíces antiguas." },
  
  // INUSUALES
  espada_larga:    { nombre: "Espada Larga",       tipo: "espada",  raridad: "INUSUAL",   dano: "1d8",  precio: 150, emoji: "⚔️",  descripcion: "Una espada de buen acero." },
  arco_compuesto:  { nombre: "Arco Compuesto",     tipo: "arco",    raridad: "INUSUAL",   dano: "1d8",  precio: 180, emoji: "🏹",  descripcion: "Mayor potencia y alcance." },
  baston_arcano:   { nombre: "Bastón Arcano",      tipo: "baston",  raridad: "INUSUAL",   dano: "1d6",  precio: 200, emoji: "🪄",  descripcion: "Canaliza mejor la energía mágica." },
  
  // RAROS
  espadón_acero:   { nombre: "Espadón de Acero",  tipo: "espadagrande", raridad: "RARO",  dano: "2d6",  precio: 500, emoji: "🗡️", descripcion: "Un arma de dos manos devastadora." },
  arco_elfos:      { nombre: "Arco Élfico",        tipo: "arco",    raridad: "RARO",      dano: "2d6",  precio: 600, emoji: "🏹",  descripcion: "Forjado por elfos, increíblemente preciso." },
  cetro_llamas:    { nombre: "Cetro de Llamas",    tipo: "cetro",   raridad: "RARO",      dano: "2d8",  precio: 700, emoji: "🔥",  descripcion: "Arde con fuego eterno." },
  
  // ÉPICOS
  hoja_sombra:     { nombre: "Hoja de Sombra",     tipo: "daga",    raridad: "EPICO",     dano: "3d6",  precio: 1500,emoji: "🌑",  descripcion: "Una daga que corta la misma oscuridad." },
  arco_tormenta:   { nombre: "Arco de Tormenta",   tipo: "arco",    raridad: "EPICO",     dano: "3d8",  precio: 2000,emoji: "⚡",  descripcion: "Cada flecha lleva el poder del rayo." },
  baston_glacial:  { nombre: "Bastón Glacial",      tipo: "baston",  raridad: "EPICO",     dano: "3d8",  precio: 2200,emoji: "❄️",  descripcion: "Congela lo que toca." },
  
  // LEGENDARIOS
  excalibur:       { nombre: "Excalibur",           tipo: "espada",  raridad: "LEGENDARIO",dano: "4d10", precio: 8000,emoji: "✨",  descripcion: "La espada de los reyes. Solo los dignos pueden empuñarla." },
  arco_cosmos:     { nombre: "Arco del Cosmos",     tipo: "arco",    raridad: "LEGENDARIO",dano: "4d10", precio: 9000,emoji: "🌟",  descripcion: "Flechas que atraviesan el tiempo y el espacio." },
  
  // MÍTICOS
  ragnarok_blade:  { nombre: "Filo del Ragnarök",   tipo: "espadagrande", raridad: "MITICO", dano: "6d10",precio: 25000,emoji:"🔴", descripcion: "El arma que partirá el mundo al final de los tiempos." },
};

const ARMADURAS = {
  // COMUNES
  armadura_cuero:  { nombre: "Armadura de Cuero",  tipo: "ligera",  raridad: "COMUN",     defensa: 5,   precio: 60,  emoji: "🥋",  descripcion: "Protección básica de cuero." },
  escudo_madera:   { nombre: "Escudo de Madera",   tipo: "escudo",  raridad: "COMUN",     defensa: 3,   precio: 40,  emoji: "🛡️",  descripcion: "Un escudo rudimentario de madera." },
  capa_sombra:     { nombre: "Capa de Sombra",     tipo: "ligera",  raridad: "COMUN",     defensa: 2,   evasion: 5,  precio: 55,  emoji: "🧥",  descripcion: "Ayuda a mezclarse con las sombras." },
  tomo_basico:     { nombre: "Tomo Básico",         tipo: "accesorio",raridad:"COMUN",     magia: 10,    precio: 50,  emoji: "📖",  descripcion: "Amplifica levemente el poder mágico." },
  escudo_fe:       { nombre: "Escudo de la Fe",    tipo: "escudo",  raridad: "COMUN",     defensa: 4,   precio: 60,  emoji: "✝️",  descripcion: "Un escudo con símbolos sagrados." },
  amuleto_hoja:    { nombre: "Amuleto de Hoja",    tipo: "accesorio",raridad:"COMUN",     magia: 8,     precio: 45,  emoji: "🍃",  descripcion: "Un amuleto druídico básico." },
  carcaj_flechas:  { nombre: "Carcaj de Flechas",  tipo: "accesorio",raridad:"COMUN",     bonus_dano: 2,precio: 30,  emoji: "🏹",  descripcion: "Carcaj con flechas de madera." },
  
  // INUSUALES
  cota_malla:      { nombre: "Cota de Malla",      tipo: "media",   raridad: "INUSUAL",   defensa: 12,  precio: 300, emoji: "⛓️",  descripcion: "Anillos de metal entrelazados." },
  escudo_hierro:   { nombre: "Escudo de Hierro",   tipo: "escudo",  raridad: "INUSUAL",   defensa: 8,   precio: 250, emoji: "🛡️",  descripcion: "Escudo sólido de hierro forjado." },
  
  // RAROS
  armadura_placas: { nombre: "Armadura de Placas", tipo: "pesada",  raridad: "RARO",      defensa: 22,  precio: 800, emoji: "🏛️",  descripcion: "Armadura completa de metal pesado." },
  manto_arcano:    { nombre: "Manto Arcano",        tipo: "ligera",  raridad: "RARO",      defensa: 8,   magia: 30,   precio: 900, emoji: "🔮",  descripcion: "Tejido con hilos mágicos." },
  
  // ÉPICOS
  armadura_dragon: { nombre: "Armadura de Dragón", tipo: "pesada",  raridad: "EPICO",     defensa: 40,  precio: 3000,emoji: "🐉",  descripcion: "Escamas de dragón, indestructible." },
  manto_sombras:   { nombre: "Manto de Sombras",   tipo: "ligera",  raridad: "EPICO",     defensa: 20,  evasion: 25, precio: 3500,emoji: "🌑",  descripcion: "Te vuelve casi invisible en la oscuridad." },
  
  // LEGENDARIOS
  aegis:           { nombre: "Égida Divina",        tipo: "escudo",  raridad: "LEGENDARIO",defensa: 60,  precio: 12000,emoji:"⚜️", descripcion: "El escudo de los dioses. Casi impenetrable." },
};

const NIVELES_XP = [
  0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200,    // 1-10
  4000, 4900, 5900, 7000, 8200, 9500, 11000, 12600, 14300, 16100, // 11-20
];

function xpParaNivel(nivel) {
  return NIVELES_XP[nivel] || NIVELES_XP[NIVELES_XP.length - 1];
}

function calcularNivel(xp) {
  for (let i = NIVELES_XP.length - 1; i >= 0; i--) {
    if (xp >= NIVELES_XP[i]) return i + 1;
  }
  return 1;
}

module.exports = { RARIDADES, CLASES, ARMAS, ARMADURAS, NIVELES_XP, xpParaNivel, calcularNivel };
