// ─── SISTEMA DE DADOS D&D 5e ─────────────────────────────────────────────────

function roll(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

function rollDice(notation) {
  // Soporta: "2d6", "1d8+3", "3d6", "d20"
  const match = notation.match(/^(\d*)d(\d+)([+-]\d+)?$/i);
  if (!match) return 0;

  const count = parseInt(match[1]) || 1;
  const sides = parseInt(match[2]);
  const modifier = parseInt(match[3]) || 0;

  let total = 0;
  const rolls = [];
  for (let i = 0; i < count; i++) {
    const r = roll(sides);
    rolls.push(r);
    total += r;
  }
  total += modifier;

  return {
    total: Math.max(1, total),
    rolls,
    notation,
    modifier,
    display: `[${rolls.join(', ')}]${modifier !== 0 ? (modifier > 0 ? `+${modifier}` : modifier) : ''} = **${Math.max(1, total)}**`,
  };
}

function rollD20() {
  return roll(20);
}

function rollD20WithAdvantage() {
  const r1 = roll(20);
  const r2 = roll(20);
  return { result: Math.max(r1, r2), rolls: [r1, r2], type: 'ventaja' };
}

function rollD20WithDisadvantage() {
  const r1 = roll(20);
  const r2 = roll(20);
  return { result: Math.min(r1, r2), rolls: [r1, r2], type: 'desventaja' };
}

function rollInitiative(dexModifier) {
  const r = roll(20);
  return { total: r + dexModifier, roll: r, modifier: dexModifier };
}

function rollSkillCheck(stat, proficient = false, profBonus = 2, advantage = false, disadvantage = false) {
  const modifier = Math.floor((stat - 10) / 2);
  const bonus = modifier + (proficient ? profBonus : 0);

  let rollResult, rolls;
  if (advantage && !disadvantage) {
    const r = rollD20WithAdvantage();
    rollResult = r.result;
    rolls = r.rolls;
  } else if (disadvantage && !advantage) {
    const r = rollD20WithDisadvantage();
    rollResult = r.result;
    rolls = r.rolls;
  } else {
    rollResult = rollD20();
    rolls = [rollResult];
  }

  const total = rollResult + bonus;
  return {
    total,
    roll: rollResult,
    rolls,
    modifier: bonus,
    display: `🎲 d20: [${rolls.join('/')}] + ${bonus >= 0 ? '+' : ''}${bonus} = **${total}**`,
  };
}

function rollAttack(attackBonus, advantage = false) {
  let d20roll, rolls;
  if (advantage) {
    const r = rollD20WithAdvantage();
    d20roll = r.result;
    rolls = r.rolls;
  } else {
    d20roll = rollD20();
    rolls = [d20roll];
  }

  const isCrit = d20roll === 20;
  const isFumble = d20roll === 1;
  const total = d20roll + attackBonus;

  return { total, d20: d20roll, rolls, bonus: attackBonus, isCrit, isFumble };
}

function rollDamage(notation, isCrit = false) {
  // En crítico se doblan los dados
  if (isCrit) {
    const match = notation.match(/^(\d*)d(\d+)([+-]\d+)?$/i);
    if (match) {
      const count = parseInt(match[1]) || 1;
      const sides = parseInt(match[2]);
      const modifier = parseInt(match[3]) || 0;
      const critNotation = `${count * 2}d${sides}${match[3] || ''}`;
      const result = rollDice(critNotation);
      return { ...result, isCrit: true };
    }
  }
  return rollDice(notation);
}

module.exports = { roll, rollDice, rollD20, rollD20WithAdvantage, rollD20WithDisadvantage, rollInitiative, rollSkillCheck, rollAttack, rollDamage };
