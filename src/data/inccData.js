// INCC-M (Índice Nacional de Custo da Construção – Mercado), apurado pela
// FGV/IBRE. Valores = variação mensal (%). Meses futuros ficam como `null`.
// Fonte: série histórica oficial da FGV (planilha INCC-M).
// Última atualização: dados até abril/2026.
export const INCC_DATA = {
  2019: [0.40, 0.19, 0.19, 0.49, 0.09, 0.44, 0.91, 0.34, 0.60, 0.12, 0.15, 0.14],
  2020: [0.26, 0.35, 0.38, 0.18, 0.21, 0.32, 0.84, 0.82, 1.15, 1.69, 1.29, 0.88],
  2021: [0.93, 1.07, 2.00, 0.95, 1.80, 2.30, 1.24, 0.56, 0.56, 0.80, 0.71, 0.30],
  2022: [0.64, 0.48, 0.73, 0.87, 1.49, 2.81, 1.16, 0.33, 0.10, 0.04, 0.14, 0.27],
  2023: [0.32, 0.21, 0.18, 0.23, 0.40, 0.85, 0.06, 0.24, 0.24, 0.20, 0.10, 0.26],
  2024: [0.23, 0.20, 0.24, 0.41, 0.59, 0.93, 0.69, 0.64, 0.61, 0.67, 0.44, 0.51],
  2025: [0.71, 0.51, 0.38, 0.59, 0.26, 0.96, 0.91, 0.70, 0.21, 0.21, 0.28, 0.21],
  2026: [0.63, 0.34, 0.36, 1.04, null, null, null, null, null, null, null, null]
};

// Year 2021 is treated as an outlier ("ponto fora da curva") and is excluded
// from the average INCC calculation, consistent with the rest of the system.
export const INCC_OUTLIER_YEAR = 2021;

export function getInccMonthlyAverage() {
  let sum = 0;
  let count = 0;
  for (const [year, rates] of Object.entries(INCC_DATA)) {
    if (Number(year) === INCC_OUTLIER_YEAR) continue;
    for (const rate of rates) {
      if (rate !== null) {
        sum += rate;
        count++;
      }
    }
  }
  return count > 0 ? sum / count : 0;
}

export function getInccAnnualized() {
  const monthly = getInccMonthlyAverage();
  return (Math.pow(1 + monthly / 100, 12) - 1) * 100;
}

export function getInccAccumulatedForYear(year) {
  const rates = INCC_DATA[year];
  if (!rates) return 0;
  let factor = 1;
  for (const rate of rates) {
    if (rate !== null) {
      factor *= (1 + rate / 100);
    }
  }
  return (factor - 1) * 100;
}
