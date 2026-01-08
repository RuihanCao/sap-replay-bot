const { BATTLE_OUTCOMES, LUCK_DRAW_WEIGHT, LUCK_POINTS_MULTIPLIER, LUCK_POINTS_CLIP } = require('./config');

function parsePercentValue(percentText) {
  if (!percentText) {
    return null;
  }
  const value = Number(String(percentText).replace('%', ''));
  return Number.isFinite(value) ? value : null;
}

function getOutcomeChance(winPercent, outcome) {
  if (!winPercent) {
    return null;
  }
  if (outcome === BATTLE_OUTCOMES.WIN) {
    return parsePercentValue(winPercent.player);
  }
  if (outcome === BATTLE_OUTCOMES.LOSS) {
    return parsePercentValue(winPercent.opponent);
  }
  if (outcome === BATTLE_OUTCOMES.TIE) {
    return parsePercentValue(winPercent.draw);
  }
  return null;
}

function calcLuckPoints(winPercent, outcome) {
  if (!winPercent) {
    return null;
  }

  const winValue = parsePercentValue(winPercent.player);
  const lossValue = parsePercentValue(winPercent.opponent);
  const drawValue = parsePercentValue(winPercent.draw);

  if (winValue === null || lossValue === null || drawValue === null) {
    return null;
  }

  const pWin = winValue / 100;
  const pLoss = lossValue / 100;
  const pDraw = drawValue / 100;

  let sign = 0;
  let pOutcome = null;
  let drawWeight = 1;
  if (outcome === BATTLE_OUTCOMES.WIN) {
    sign = 1;
    pOutcome = pWin;
  } else if (outcome === BATTLE_OUTCOMES.LOSS) {
    sign = -1;
    pOutcome = pLoss;
  } else if (outcome === BATTLE_OUTCOMES.TIE) {
    const expectedScore = pWin + 0.5 * pDraw;
    sign = 0.5 - expectedScore >= 0 ? 1 : -1;
    pOutcome = pDraw;
    drawWeight = LUCK_DRAW_WEIGHT;
  }

  if (pOutcome === null || pOutcome <= 0) {
    return null;
  }

  const rawPoints = drawWeight * sign * LUCK_POINTS_MULTIPLIER * Math.log2(1 / pOutcome);
  const clipped = Math.max(-LUCK_POINTS_CLIP, Math.min(LUCK_POINTS_CLIP, rawPoints));
  return {
    raw: rawPoints,
    clipped
  };
}

module.exports = {
  parsePercentValue,
  getOutcomeChance,
  calcLuckPoints
};
