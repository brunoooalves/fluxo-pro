export function normalizeText(str) {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function matchFipezapCity(input, estado, citiesMap) {
  if (!input || !estado || !citiesMap) return null;

  const normalizedInput = normalizeText(input.trim());
  if (normalizedInput.length < 2) return null;

  const candidates = Array.from(citiesMap.values()).filter(c => c.state === estado);

  for (const candidate of candidates) {
    if (candidate.normalized === normalizedInput) return candidate.original;
  }

  for (const candidate of candidates) {
    if (candidate.normalized.includes(normalizedInput) || normalizedInput.includes(candidate.normalized)) {
      return candidate.original;
    }
  }

  return null;
}
