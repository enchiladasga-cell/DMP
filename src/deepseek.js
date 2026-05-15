const axios = require("axios");

const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";

const SYSTEM_PROMPT = `Eres el Maestro de Dungeon de "Ecos de Eldoria", un mundo de fantasía épica medieval.
Tu misión es narrar aventuras inmersivas, dinámicas y emocionantes para los jugadores de Discord.

REGLAS DE NARRACIÓN:
- Escribe en español, con un tono épico pero accesible
- Adapta la dificultad al nivel del personaje
- Describe el entorno con detalle sensorial (sonidos, olores, texturas)
- Presenta elecciones claras al final de cada escena
- Cuando haya combate, narra las acciones dramáticamente
- Incluye personajes secundarios memorables (NPCs)
- Mantén la coherencia con lo que ya ocurrió en la aventura
- Las respuestas deben ser de 2-4 párrafos máximo
- Termina SIEMPRE con opciones numeradas de qué puede hacer el jugador (3-4 opciones)
- Sé creativo con los items y recompensas según la rareza

FORMATO DE RESPUESTA:
[Narración dramática de 2-3 párrafos]

**¿Qué haces?**
1. [Opción de acción]
2. [Opción de acción]  
3. [Opción de acción]
4. [Opción libre / Otra acción]`;

async function llamarDeepSeek(historial, mensajeNuevo, contextoPersonaje = null) {
  const mensajes = [];
  
  let systemExtra = "";
  if (contextoPersonaje) {
    systemExtra = `\n\nPERSONAJE ACTUAL:\n- Nombre: ${contextoPersonaje.nombre}\n- Clase: ${contextoPersonaje.clase} (Nivel ${contextoPersonaje.nivel})\n- HP: ${contextoPersonaje.stats.hp}/${contextoPersonaje.stats.hp_max}\n- Habilidades disponibles: ${contextoPersonaje.habilidades_desbloqueadas?.join(", ") || "básicas"}\n- Misiones completadas: ${contextoPersonaje.misiones_completadas?.length || 0}`;
  }

  mensajes.push({ role: "system", content: SYSTEM_PROMPT + systemExtra });

  // Historial (últimos 10 mensajes para no exceder tokens)
  const historialReciente = historial.slice(-10);
  for (const msg of historialReciente) {
    mensajes.push({ role: msg.rol, content: msg.contenido });
  }

  mensajes.push({ role: "user", content: mensajeNuevo });

  try {
    const resp = await axios.post(
      DEEPSEEK_URL,
      {
        model: "deepseek-chat",
        messages: mensajes,
        max_tokens: 800,
        temperature: 0.85,
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    return resp.data.choices[0].message.content;
  } catch (err) {
    console.error("Error DeepSeek:", err.response?.data || err.message);
    if (err.response?.status === 429) {
      return "⏳ El oráculo está meditando... Intenta en unos segundos.";
    }
    return "🌫️ Una niebla misteriosa interrumpe la visión. El Maestro de Dungeon descansa brevemente...";
  }
}

async function generarMision(nivel, tipo) {
  const prompt = `Genera una misión de D&D para nivel ${nivel} de tipo "${tipo}".
  
Responde SOLO con JSON válido con esta estructura exacta:
{
  "titulo": "Nombre épico de la misión",
  "descripcion": "Descripción de 2-3 oraciones que engancha al jugador",
  "dificultad": "${nivel <= 3 ? "Fácil" : nivel <= 7 ? "Normal" : nivel <= 12 ? "Difícil" : nivel <= 17 ? "Épica" : "Legendaria"}",
  "recompensas": {
    "xp": ${nivel * 80},
    "oro": ${nivel * 50},
    "item": null
  },
  "introduccion": "El párrafo inicial narrativo de la aventura (2-3 párrafos con opciones al final)"
}`;

  try {
    const resp = await axios.post(
      DEEPSEEK_URL,
      {
        model: "deepseek-chat",
        messages: [
          { role: "system", content: "Eres un generador de misiones D&D. Responde SOLO con JSON válido, sin markdown, sin explicaciones." },
          { role: "user", content: prompt }
        ],
        max_tokens: 600,
        temperature: 0.9,
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 25000,
      }
    );

    const texto = resp.data.choices[0].message.content.trim();
    const clean = texto.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error("Error generando misión:", err.message);
    return null;
  }
}

module.exports = { llamarDeepSeek, generarMision };
