import { normalizeText } from '../utils/textUtils';
import rawData from './fipezap-extracted.json';

export const FIPEZAP_DATA = rawData;

const sortedPeriods = Object.keys(rawData).sort();

export function getLatestPeriod() {
  return sortedPeriods[sortedPeriods.length - 1];
}

export function getAllPeriods() {
  return sortedPeriods;
}

const latestPeriod = getLatestPeriod();
const latestCities = rawData[latestPeriod] || {};

export const FIPEZAP_CITIES = new Map(
  Object.entries(latestCities).map(([cityName, info]) => [
    normalizeText(cityName),
    { original: cityName, state: info.s, normalized: normalizeText(cityName) }
  ])
);

export function getCityData(cityName, period) {
  const periodData = rawData[period];
  if (!periodData) return null;
  return periodData[cityName] || null;
}

export function getCityPriceHistory(cityName) {
  return sortedPeriods
    .map(period => {
      const data = rawData[period]?.[cityName];
      if (!data) return null;
      return { period, price: data.p, varMonth: data.vm, var12m: data.v12 };
    })
    .filter(Boolean);
}
