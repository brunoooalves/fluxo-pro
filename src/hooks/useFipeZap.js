import { useState, useMemo } from 'react';
import { matchFipezapCity, normalizeText } from '../utils/textUtils';
import { FIPEZAP_CITIES, getCityData, getLatestPeriod } from '../data/fipezapData';
import { computeCityAnalytics } from '../data/fipezapAnalytics';
import { getInccAnnualized } from '../data/inccData';

export function useFipeZap(cidade, estado, dataEntrega, valorImovel, initialNeighborhood = '') {
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(initialNeighborhood);

  const match = useMemo(() => {
    const cityName = matchFipezapCity(cidade, estado, FIPEZAP_CITIES);
    if (!cityName) return null;

    const latestPeriod = getLatestPeriod();
    const data = getCityData(cityName, latestPeriod);
    if (!data) return null;

    return {
      cityName,
      state: data.s,
      price: data.p,
      varMonth: data.vm,
      var12m: data.v12,
      neighborhoods: data.h || [],
      period: latestPeriod,
    };
  }, [cidade, estado]);

  const analytics = useMemo(() => {
    if (!match) return null;
    return computeCityAnalytics(match.cityName, dataEntrega, valorImovel);
  }, [match, dataEntrega, valorImovel]);

  const neighborhoodData = useMemo(() => {
    if (!match || !selectedNeighborhood) return null;
    return match.neighborhoods.find(h => h.n === selectedNeighborhood) || null;
  }, [match, selectedNeighborhood]);

  const suggestions = useMemo(() => {
    if (!estado) return [];
    const candidates = Array.from(FIPEZAP_CITIES.values()).filter(c => c.state === estado);
    if (!cidade || cidade.trim().length < 1) return candidates.map(c => c.original);

    const normalizedInput = normalizeText(cidade.trim());
    return candidates
      .filter(c => c.normalized.includes(normalizedInput) || normalizedInput.includes(c.normalized))
      .map(c => c.original);
  }, [cidade, estado]);

  const inccAnnualized = useMemo(() => getInccAnnualized(), []);

  const fipezapMatch = useMemo(() => {
    if (!match) return null;
    return {
      cityName: match.cityName,
      state: match.state,
      price: match.price,
      varMonth: match.varMonth,
      var12m: match.var12m,
      neighborhood: selectedNeighborhood || null,
      neighborhoodPrice: neighborhoodData?.p || null,
      neighborhoodVar: neighborhoodData?.v || null,
      annualizedRate: analytics?.annualizedRate || null,
      inccAnnualized,
      realGain: analytics ? analytics.annualizedRate - inccAnnualized : null,
      totalAppreciation: analytics?.totalAppreciation || null,
      projectedValueAtDelivery: analytics?.projectedValueAtDelivery || null,
      equityGain: analytics?.equityGain || null,
      mesesAteEntrega: analytics?.mesesAteEntrega || null,
    };
  }, [match, selectedNeighborhood, neighborhoodData, analytics, inccAnnualized]);

  return {
    matched: !!match,
    currentPrice: match?.price || null,
    neighborhoods: match?.neighborhoods || [],
    selectedNeighborhood,
    setSelectedNeighborhood,
    suggestions,
    fipezapMatch,
  };
}
