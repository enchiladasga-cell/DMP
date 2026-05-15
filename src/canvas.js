const { createCanvas, loadImage } = require("canvas");
const { CLASES, RARIDADES } = require("./gameData");

// =============================================
//   GENERADOR DE FICHA CON CANVAS
// =============================================

async function generarFichaPersonaje(personaje) {
  const W = 800, H = 500;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  const clase = CLASES[personaje.clase];

  // ---- FONDO ----
  const gradFondo = ctx.createLinearGradient(0, 0, W, H);
  gradFondo.addColorStop(0, "#0d0d1a");
  gradFondo.addColorStop(0.5, "#1a0d2e");
  gradFondo.addColorStop(1, "#0d1a1a");
  ctx.fillStyle = gradFondo;
  ctx.fillRect(0, 0, W, H);

  // ---- BORDE DORADO ----
  ctx.strokeStyle = "#c9a84c";
  ctx.lineWidth = 3;
  roundRect(ctx, 10, 10, W - 20, H - 20, 15);
  ctx.stroke();

  // ---- BORDE INTERIOR ----
  ctx.strokeStyle = "rgba(201,168,76,0.3)";
  ctx.lineWidth = 1;
  roundRect(ctx, 18, 18, W - 36, H - 36, 12);
  ctx.stroke();

  // ---- PANEL IZQUIERDO (avatar/clase) ----
  const gradPanel = ctx.createLinearGradient(0, 0, 220, H);
  gradPanel.addColorStop(0, "rgba(201,168,76,0.15)");
  gradPanel.addColorStop(1, "rgba(201,168,76,0.05)");
  ctx.fillStyle = gradPanel;
  ctx.beginPath();
  ctx.roundRect(25, 25, 195, H - 50, [10, 0, 0, 10]);
  ctx.fill();

  // línea divisoria vertical
  ctx.strokeStyle = "rgba(201,168,76,0.4)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(220, 30);
  ctx.lineTo(220, H - 30);
  ctx.stroke();

  // ---- EMOJI DE CLASE (grande) ----
  ctx.font = "80px serif";
  ctx.textAlign = "center";
  ctx.fillText(clase.emoji, 122, 160);

  // ---- NOMBRE DEL PERSONAJE ----
  ctx.fillStyle = "#c9a84c";
  ctx.font = "bold 26px 'serif'";
  ctx.textAlign = "center";
  ctx.fillText(personaje.nombre, 122, 210);

  // ---- CLASE ----
  ctx.fillStyle = "#ffffff";
  ctx.font = "16px serif";
  ctx.fillText(clase.nombre, 122, 235);

  // ---- NIVEL ----
  const gradNivel = ctx.createLinearGradient(40, 260, 200, 295);
  gradNivel.addColorStop(0, "#c9a84c");
  gradNivel.addColorStop(1, "#f0d080");
  ctx.fillStyle = gradNivel;
  roundRect(ctx, 45, 258, 155, 32, 8);
  ctx.fill();
  ctx.fillStyle = "#0d0d1a";
  ctx.font = "bold 16px serif";
  ctx.textAlign = "center";
  ctx.fillText(`⭐ Nivel ${personaje.nivel}`, 122, 279);

  // ---- BARRA XP ----
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  roundRect(ctx, 45, 300, 155, 12, 6);
  ctx.fill();
  const { NIVELES_XP } = require("./gameData");
  const xpActual = personaje.xp - (NIVELES_XP[personaje.nivel - 2] || 0);
  const xpNecesario = (NIVELES_XP[personaje.nivel - 1] || 0) - (NIVELES_XP[personaje.nivel - 2] || 0);
  const pct = Math.min(xpActual / xpNecesario, 1);
  const gradXP = ctx.createLinearGradient(45, 300, 200, 312);
  gradXP.addColorStop(0, "#4CAF50");
  gradXP.addColorStop(1, "#8BC34A");
  ctx.fillStyle = gradXP;
  roundRect(ctx, 45, 300, 155 * pct, 12, 6);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "10px serif";
  ctx.fillText(`XP: ${personaje.xp}`, 122, 325);

  // ---- ORO ----
  ctx.fillStyle = "#c9a84c";
  ctx.font = "bold 18px serif";
  ctx.fillText(`💰 ${personaje.oro} oro`, 122, 360);

  // ---- TÍTULO: NOMBRE + SERVIDOR ----
  ctx.fillStyle = "#c9a84c";
  ctx.font = "bold 32px 'Georgia', serif";
  ctx.textAlign = "left";
  ctx.fillText("⚔️ Ecos de Eldoria", 240, 65);

  // ---- SEPARADOR TÍTULO ----
  ctx.strokeStyle = "rgba(201,168,76,0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(240, 75);
  ctx.lineTo(W - 30, 75);
  ctx.stroke();

  // ---- STATS ----
  const stats = personaje.stats;
  const statItems = [
    { label: "❤️ HP",     val: `${stats.hp_max}`,        x: 240, y: 110 },
    { label: "💧 Maná",   val: `${stats.mana_max}`,      x: 430, y: 110 },
    { label: "⚔️ Fuerza", val: `${stats.fuerza}`,        x: 240, y: 145 },
    { label: "🎯 Destreza",val: `${stats.destreza}`,     x: 430, y: 145 },
    { label: "🔮 Intelig.",val: `${stats.inteligencia}`, x: 240, y: 180 },
    { label: "🛡️ Constit.",val: `${stats.constitucion}`, x: 430, y: 180 },
  ];

  for (const s of statItems) {
    // fondo del stat
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    roundRect(ctx, s.x, s.y - 18, 170, 26, 5);
    ctx.fill();
    ctx.fillStyle = "rgba(201,168,76,0.7)";
    ctx.font = "13px serif";
    ctx.textAlign = "left";
    ctx.fillText(s.label, s.x + 8, s.y);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px serif";
    ctx.textAlign = "right";
    ctx.fillText(s.val, s.x + 162, s.y);
  }

  // ---- SEPARADOR ----
  ctx.strokeStyle = "rgba(201,168,76,0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(240, 200);
  ctx.lineTo(W - 30, 200);
  ctx.stroke();

  // ---- HABILIDADES ----
  ctx.fillStyle = "#c9a84c";
  ctx.font = "bold 14px serif";
  ctx.textAlign = "left";
  ctx.fillText("HABILIDADES DESBLOQUEADAS", 240, 225);

  const habilidades = clase.habilidades.filter(h => personaje.nivel >= h.nivel);
  const cols = 3;
  habilidades.slice(0, 6).forEach((h, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const hx = 240 + col * 180;
    const hy = 240 + row * 40;
    ctx.fillStyle = "rgba(201,168,76,0.1)";
    roundRect(ctx, hx, hy, 170, 32, 6);
    ctx.fill();
    ctx.strokeStyle = "rgba(201,168,76,0.3)";
    ctx.lineWidth = 0.5;
    roundRect(ctx, hx, hy, 170, 32, 6);
    ctx.stroke();
    ctx.fillStyle = "#e0d0a0";
    ctx.font = "12px serif";
    ctx.textAlign = "left";
    ctx.fillText(`${h.nombre}`, hx + 6, hy + 13);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "10px serif";
    ctx.fillText(h.dano || h.efecto || h.cura || "Especial", hx + 6, hy + 26);
  });

  // ---- EQUIPO ----
  ctx.strokeStyle = "rgba(201,168,76,0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(240, 330);
  ctx.lineTo(W - 30, 330);
  ctx.stroke();

  ctx.fillStyle = "#c9a84c";
  ctx.font = "bold 14px serif";
  ctx.textAlign = "left";
  ctx.fillText("EQUIPO", 240, 350);

  const { ARMAS, ARMADURAS } = require("./gameData");
  const equipoItems = [
    { slot: "Arma",    id: personaje.equipado?.arma,     data: ARMAS },
    { slot: "Armadura",id: personaje.equipado?.armadura,  data: ARMADURAS },
    { slot: "Accesorio",id: personaje.equipado?.accesorio,data: ARMADURAS },
  ];

  equipoItems.forEach((e, i) => {
    const ex = 240 + i * 185;
    const ey = 360;
    const item = e.id ? (e.data[e.id]) : null;
    const rarColor = item ? RARIDADES[item.raridad]?.color : "#666";
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    roundRect(ctx, ex, ey, 175, 50, 6);
    ctx.fill();
    if (item) {
      ctx.strokeStyle = rarColor;
      ctx.lineWidth = 1.5;
    } else {
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 0.5;
    }
    roundRect(ctx, ex, ey, 175, 50, 6);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "10px serif";
    ctx.textAlign = "left";
    ctx.fillText(e.slot.toUpperCase(), ex + 6, ey + 14);
    if (item) {
      ctx.fillStyle = rarColor;
      ctx.font = "bold 12px serif";
      ctx.fillText(`${item.emoji} ${item.nombre}`, ex + 6, ey + 32);
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "10px serif";
      ctx.fillText(RARIDADES[item.raridad]?.nombre || "", ex + 6, ey + 45);
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.font = "12px serif";
      ctx.fillText("Sin equipar", ex + 6, ey + 35);
    }
  });

  // ---- MARCA DE AGUA ----
  ctx.fillStyle = "rgba(201,168,76,0.15)";
  ctx.font = "bold 11px serif";
  ctx.textAlign = "right";
  ctx.fillText("Ecos de Eldoria © Bot", W - 25, H - 20);

  return canvas.toBuffer("image/png");
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

module.exports = { generarFichaPersonaje };
