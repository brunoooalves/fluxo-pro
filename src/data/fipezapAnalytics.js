import { getCityPriceHistory, getCityData, getLatestPeriod } from './fipezapData';
import { getInccAnnualized } from './inccData';

const CDI_ANNUAL_RATE = 13.0;

function parseVariation(str) {
  if (!str) return null;
  const cleaned = str.replace('%', '').replace(',', '.').replace('+', '').trim();
  const val = parseFloat(cleaned);
  return isNaN(val) ? null : val;
}

export function computeCityAnalytics(cityName, dataEntrega, valorImovel) {
  const history = getCityPriceHistory(cityName);
  if (!history || history.length < 2) return null;

  const first = history[0];
  const last = history[history.length - 1];

  const totalAppreciation = ((last.price / first.price) - 1) * 100;

  // Valorização: média aritmética das variações mensais de toda a série
  // (usa todos os pontos), depois anualizada.
  const monthlyReturns = [];
  for (let i = 1; i < history.length; i++) {
    monthlyReturns.push(history[i].price / history[i - 1].price - 1);
  }
  const monthlyAvgRate = monthlyReturns.length > 0
    ? monthlyReturns.reduce((a, b) => a + b, 0) / monthlyReturns.length
    : 0;
  const annualizedRate = (Math.pow(1 + monthlyAvgRate, 12) - 1) * 100;

  const inccAnnualized = getInccAnnualized();
  const realGain = annualizedRate - inccAnnualized;

  let projectedValueAtDelivery = null;
  let equityGain = null;
  let mesesAteEntrega = null;

  if (dataEntrega && valorImovel) {
    const entrega = new Date(dataEntrega);
    const now = new Date();
    mesesAteEntrega = Math.max(0, (entrega.getFullYear() - now.getFullYear()) * 12 + (entrega.getMonth() - now.getMonth()));

    if (mesesAteEntrega > 0) {
      const valor = parseFloat(valorImovel);
      projectedValueAtDelivery = valor * Math.pow(1 + monthlyAvgRate, mesesAteEntrega);
      equityGain = projectedValueAtDelivery - valor;
    }
  }

  return {
    totalAppreciation,
    annualizedRate,
    monthlyAvgRate: monthlyAvgRate * 100,
    inccAnnualized,
    realGain,
    projectedValueAtDelivery,
    equityGain,
    mesesAteEntrega,
    priceHistory: history,
    periodRange: { first: first.period, last: last.period },
  };
}

export function computeNeighborhoodAnalytics(cityName, neighborhoodName) {
  const latestPeriod = getLatestPeriod();
  const cityData = getCityData(cityName, latestPeriod);
  if (!cityData) return null;

  const hood = cityData.h.find(h => h.n === neighborhoodName);
  if (!hood) return null;

  const premiumVsCity = cityData.p > 0 ? ((hood.p / cityData.p) - 1) * 100 : 0;

  const cityVar = parseVariation(cityData.v12);
  const hoodVar = parseVariation(hood.v);
  const variationVsCity = (cityVar !== null && hoodVar !== null) ? hoodVar - cityVar : null;

  return {
    price: hood.p,
    variation: hood.v,
    premiumVsCity,
    variationVsCity,
  };
}

export function computeInvestmentComparison(valorImovel, annualizedRate, mesesAteEntrega) {
  if (!valorImovel || !mesesAteEntrega || mesesAteEntrega <= 0) return null;

  const valor = parseFloat(valorImovel);
  const monthlyRealEstate = Math.pow(1 + annualizedRate / 100, 1 / 12) - 1;
  const monthlyCdi = Math.pow(1 + CDI_ANNUAL_RATE / 100, 1 / 12) - 1;

  const realEstateProjected = valor * Math.pow(1 + monthlyRealEstate, mesesAteEntrega);
  const cdiProjected = valor * Math.pow(1 + monthlyCdi, mesesAteEntrega);

  return {
    realEstateProjected,
    realEstateGain: realEstateProjected - valor,
    cdiProjected,
    cdiGain: cdiProjected - valor,
    diff: realEstateProjected - cdiProjected,
    cdiAnnualRate: CDI_ANNUAL_RATE,
  };
}

export function formatPeriod(period) {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const year = period.slice(0, 4);
  const month = parseInt(period.slice(4, 6)) - 1;
  return months[month] + '/' + year;
}
