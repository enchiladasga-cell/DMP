const { rollSkillCheck } = require('./dice');
const { getModifier, CLASSES } = require('../data/classes');

const SYSTEM_PROMPT = `Eres un Dungeon Master experto narrando en español con tono equilibrado: serio y épico pero con humor ocasional y natural.

REGLAS:
1. Narras en segunda persona del plural ("vosotros", "os encontráis")
2. Máximo 280 palabras por respuesta
3. Usas emojis con moderación
4. Siempre terminas invitando a actuar
5. Respetas D&D 5e simplificado
6. Nunca rompes el personaje
7. Si una acción requiere tirada: [TIRADA: stat DC:número]
8. Si hay combate: [COMBATE: nombre HP:número CA:número ATK:número DMG:dados XP:número]
9. Si completan objetivo: [OBJETIVO: descripción]
10. Si hay recompensa: [RECOMPENSA: XP:número ORO:número]

STATS: fuerza, destreza, constitucion, inteligencia, sabiduria, carisma

TONO: Como un buen amigo narrando una aventura. Dramático en momentos clave, ligero cuando corresponde.`;

async function callGPT(messages, maxTokens = 500) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: maxTokens,
      temperature: 0.85,
    }),
  });
  if (!response.ok) throw new Error(`OpenAI error: ${response.status}`);
  const data = await response.json();
  return data.choices[0].message.content;
}

async function narrateScene(context, history, playerNames) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: `Narra esta escena para los jugadores (${playerNames.join(', ')}): ${context}` },
  ];
  return callGPT(messages);
}

async function processGroupActions(actions, context, history, playerChars) {
  const actionsText = actions.map(a => `**${a.name}** (${a.class}): "${a.action}"`).join('\n');
  const charContext = playerChars.map(c => {
    const cls = CLASSES[c.class];
    return `${c.name}: ${cls.name} Nv.${c.level} HP:${c.hp}/${c.hpMax} ${cls.primaryStat}:${c.stats[cls.primaryStat]}`;
  }).join(' | ');

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    {
      role: 'user',
      content: `Contexto: ${context}\nPersonajes: ${charContext}\n\nAcciones:\n${actionsText}\n\nNarra el resultado de todas las acciones. Indica tiradas con [TIRADA: stat DC:n] y combates con [COMBATE: nombre HP:n CA:n ATK:n DMG:dados XP:n].`,
    },
  ];
  return callGPT(messages, 600);
}

async function generateAIAdventure(tema, nivel, numPlayers) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Crea una aventura D&D 5e para ${numPlayers} jugadores nivel ${nivel} sobre: "${tema}".

Responde SOLO con JSON válido sin backticks:
{"title":"título","description":"descripción corta","intro":"narración apertura 150 palabras","scenes":[{"id":"escena_1","title":"nombre","context":"contexto para DM 100 palabras","narration":"texto jugadores 150 palabras","type":"exploracion","challenge":"desafío principal","nextScene":"escena_2"},{"id":"escena_2","title":"nombre","context":"contexto","narration":"texto","type":"social","challenge":"desafío","nextScene":"escena_3"},{"id":"escena_3","title":"nombre","context":"contexto","narration":"texto","type":"misterio","challenge":"desafío","nextScene":"finale"},{"id":"escena_4","title":"nombre","context":"contexto","narration":"texto","type":"combate","challenge":"desafío","nextScene":"finale"}],"finale":{"context":"clímax","narration":"texto épico 200 palabras","boss":{"name":"nombre","hp":80,"hpMax":80,"ca":15,"ataque":7,"danio":"2d8+3","xpReward":500},"victory":"narración victoria 150 palabras","xpReward":800,"goldReward":{"min":100,"max":300}}}`,
    },
  ];
  const raw = await callGPT(messages, 2500);
  const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(clean);
}

async function resolveSkillCheck(stat, dc, playerChars, history, context) {
  let bestMod = -5, bestChar = null;
  for (const c of playerChars) {
    const mod = getModifier(c.stats[stat] || 10);
    if (mod > bestMod) { bestMod = mod; bestChar = c; }
  }
  const result = rollSkillCheck(bestChar.stats[stat] || 10, false, bestChar.bonificadorCompetencia);
  const success = result.total >= dc;

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    {
      role: 'user',
      content: `${bestChar.name} tiró ${stat}: ${result.display} vs DC ${dc} — ${success ? 'EXITO' : 'FALLO'}. Contexto: ${context}. Narra el resultado dramáticamente y continúa la escena (máx 150 palabras).`,
    },
  ];
  const narration = await callGPT(messages, 300);
  return { success, result, bestChar, narration };
}

function parseAIResponse(text) {
  const result = { narration: text, tiradas: [], combates: [], objetivos: [], recompensas: [] };

  const tiradaRe = /\[TIRADA:\s*(\w+)\s+DC:(\d+)\]/gi;
  const combateRe = /\[COMBATE:\s*([^H]+?)\s+HP:(\d+)\s+CA:(\d+)\s+ATK:(\d+)\s+DMG:([\w+\-d]+)\s+XP:(\d+)\]/gi;
  const objRe = /\[OBJETIVO:\s*([^\]]+)\]/gi;
  const recompRe = /\[RECOMPENSA:\s*XP:(\d+)\s+ORO:(\d+)\]/gi;

  let m;
  while ((m = tiradaRe.exec(text)) !== null) result.tiradas.push({ stat: m[1].toLowerCase(), dc: parseInt(m[2]) });
  while ((m = combateRe.exec(text)) !== null) result.combates.push({ name: m[1].trim(), hp: parseInt(m[2]), hpMax: parseInt(m[2]), ca: parseInt(m[3]), ataque: parseInt(m[4]), danio: m[5].trim(), xpReward: parseInt(m[6]) });
  while ((m = objRe.exec(text)) !== null) result.objetivos.push(m[1].trim());
  while ((m = recompRe.exec(text)) !== null) result.recompensas.push({ xp: parseInt(m[1]), oro: parseInt(m[2]) });

  result.narration = text.replace(/\[TIRADA:[^\]]+\]/gi, '').replace(/\[COMBATE:[^\]]+\]/gi, '').replace(/\[OBJETIVO:[^\]]+\]/gi, '').replace(/\[RECOMPENSA:[^\]]+\]/gi, '').trim();
  return result;
}

module.exports = { narrateScene, processGroupActions, generateAIAdventure, resolveSkillCheck, parseAIResponse, callGPT, SYSTEM_PROMPT };
