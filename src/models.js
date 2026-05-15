const mongoose = require("mongoose");

// =============================================
//   MODELO DE PERSONAJE
// =============================================
const PersonajeSchema = new mongoose.Schema({
  userId:     { type: String, required: true, unique: true },
  guildId:    { type: String, required: true },
  nombre:     { type: String, required: true },
  clase:      { type: String, required: true },
  nivel:      { type: Number, default: 1 },
  xp:         { type: Number, default: 0 },
  oro:        { type: Number, default: 50 },

  stats: {
    hp:            { type: Number },
    hp_max:        { type: Number },
    mana:          { type: Number },
    mana_max:      { type: Number },
    fuerza:        { type: Number },
    destreza:      { type: Number },
    inteligencia:  { type: Number },
    constitucion:  { type: Number },
  },

  inventario: [{
    itemId:    { type: String },
    nombre:    { type: String },
    tipo:      { type: String },
    raridad:   { type: String },
    cantidad:  { type: Number, default: 1 },
  }],

  equipado: {
    arma:    { type: String, default: null },
    armadura:{ type: String, default: null },
    accesorio:{ type: String, default: null },
    escudo:  { type: String, default: null },
  },

  habilidades_desbloqueadas: [{ type: String }],
  
  misiones_completadas: [{ type: String }],
  logros: [{ type: String }],

  en_aventura:    { type: Boolean, default: false },
  grupo_id:       { type: String, default: null },
  
  historia: [{ 
    rol: { type: String },
    contenido: { type: String },
    fecha: { type: Date, default: Date.now }
  }],

  creado_en: { type: Date, default: Date.now },
  ultima_actividad: { type: Date, default: Date.now },
});

// =============================================
//   MODELO DE MISIÓN
// =============================================
const MisionSchema = new mongoose.Schema({
  titulo:      { type: String, required: true },
  descripcion: { type: String, required: true },
  tipo:        { type: String, enum: ["solitario", "grupo", "ambos"], default: "ambos" },
  dificultad:  { type: String, enum: ["Fácil", "Normal", "Difícil", "Épica", "Legendaria"] },
  
  recompensas: {
    xp:   { type: Number },
    oro:  { type: Number },
    item: { type: String, default: null },
  },

  nivel_minimo:  { type: Number, default: 1 },
  max_jugadores: { type: Number, default: 4 },
  
  estado:  { type: String, enum: ["disponible", "en_curso", "completada", "expirada"], default: "disponible" },
  
  jugadores: [{ 
    userId: String, 
    nombre: String, 
    clase: String,
    unido_en: { type: Date, default: Date.now }
  }],

  lider_id:  { type: String, default: null },
  thread_id: { type: String, default: null },
  
  historia_mision: [{
    rol:       { type: String },
    contenido: { type: String },
    accion_jugador: { type: String, default: null },
    fecha:     { type: Date, default: Date.now }
  }],

  creada_en:    { type: Date, default: Date.now },
  iniciada_en:  { type: Date, default: null },
  completada_en:{ type: Date, default: null },
  expira_en:    { type: Date },
});

// =============================================
//   MODELO DE GRUPO
// =============================================
const GrupoSchema = new mongoose.Schema({
  nombre:      { type: String },
  lider_id:    { type: String, required: true },
  jugadores:   [{ type: String }],
  mision_id:   { type: String, default: null },
  turno_actual:{ type: String, default: null },
  estado:      { type: String, enum: ["formando", "en_aventura", "disuelto"], default: "formando" },
  thread_id:   { type: String, default: null },
  creado_en:   { type: Date, default: Date.now },
});

const Personaje = mongoose.model("Personaje", PersonajeSchema);
const Mision    = mongoose.model("Mision", MisionSchema);
const Grupo     = mongoose.model("Grupo", GrupoSchema);

module.exports = { Personaje, Mision, Grupo };
