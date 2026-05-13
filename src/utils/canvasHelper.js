const { createCanvas } = require('canvas');

async function generarTarjeta(personaje) {
  const width = 600, height = 400;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#2c1e0f';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#c9a45c';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, width - 6, height - 6);

  ctx.fillStyle = '#f0e6d2';
  ctx.font = 'bold 22px "Arial"';
  ctx.fillText(personaje.nombre ?? 'Sin nombre', 30, 50);
  ctx.font = '16px "Arial"';
  ctx.fillText(`${personaje.raza ?? ''} ${personaje.clase ?? ''} - Nivel ${personaje.nivel ?? 1}`, 30, 75);

  const atributos = ['fuerza', 'destreza', 'constitucion', 'inteligencia', 'sabiduria', 'carisma'];
  let y = 110;
  atributos.forEach(attr => {
    const valor = personaje.atributos?.[attr] ?? 5;
    const barWidth = (valor / 10) * 200;
    ctx.fillStyle = '#f0e6d2';
    ctx.font = '14px "Arial"';
    ctx.fillText(attr.toUpperCase(), 30, y + 18);
    ctx.fillStyle = '#3e2a14';
    ctx.fillRect(120, y, 200, 20);
    ctx.fillStyle = '#c9a45c';
    ctx.fillRect(120, y, barWidth, 20);
    y += 30;
  });

  const pv = personaje.pv ?? personaje.pvMax ?? 100;
  const pvMax = personaje.pvMax ?? 100;
  const pm = personaje.pm ?? personaje.pmMax ?? 50;
  const pmMax = personaje.pmMax ?? 50;

  ctx.fillStyle = '#f0e6d2';
  ctx.font = '14px "Arial"';
  ctx.fillText(`PV: ${pv} / ${pvMax}`, 30, y + 10);
  ctx.fillText(`PM: ${pm} / ${pmMax}`, 200, y + 10);
  ctx.fillText(`Oro: ${personaje.oro ?? 0}`, 30, y + 40);
  ctx.fillText(`XP: ${personaje.xp ?? 0} / ${personaje.xpSiguiente ?? 1000}`, 200, y + 40);

  const inventario = personaje.inventario ?? [];
  const arma = inventario.find(i => i.tipo === 'arma');
  const armadura = inventario.find(i => i.tipo === 'armadura');
  ctx.fillText(`Arma: ${arma?.nombre ?? 'Ninguna'}`, 30, y + 70);
  ctx.fillText(`Armadura: ${armadura?.nombre ?? 'Ninguna'}`, 200, y + 70);

  return canvas.toBuffer();
}

module.exports = { generarTarjeta };