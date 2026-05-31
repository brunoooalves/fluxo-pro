/**
 * Utilities for encoding/decoding calculator simulation data
 * into shareable URLs backed by Netlify Blobs.
 *
 * Flow:
 *   1. encodeSharePayload() → compact Base64 string
 *   2. generateSignedShareUrl() → calls share-create function → URL with ?s=<uuid>.<sig>
 *   3. verifyShareId() → calls share-get function → decoded data or error
 */

const SHARE_VERSION = 1;

const CREATE_ENDPOINT = '/api/share/create';
const GET_ENDPOINT = '/api/share/get';

function compactScenario(opcao) {
  const result = {
    t: opcao.tipo,
    e: Math.round(opcao.entrada),
    mq: opcao.mensais?.quantidade || 0,
    mv: Math.round(opcao.mensais?.valorParcela || 0),
    mt: Math.round(opcao.mensais?.total || 0),
    f: Math.round(opcao.financiamento || 0),
    tt: Math.round(opcao.total || 0),
  };
  if (opcao.intercaladas) {
    result.it = opcao.intercaladas.tipo;
    result.iq = opcao.intercaladas.quantidade;
    result.iv = Math.round(opcao.intercaladas.valorParcela);
    result.iT = Math.round(opcao.intercaladas.total);
  }
  return result;
}

function expandScenario(compact) {
  const result = {
    tipo: compact.t,
    entrada: compact.e,
    mensais: {
      quantidade: compact.mq,
      valorParcela: compact.mv,
      total: compact.mt,
    },
    intercaladas: null,
    financiamento: compact.f,
    total: compact.tt,
  };
  if (compact.it) {
    result.intercaladas = {
      tipo: compact.it,
      quantidade: compact.iq,
      valorParcela: compact.iv,
      total: compact.iT,
    };
  }
  return result;
}

function compactFipezap(fz) {
  if (!fz) return null;
  const result = {
    cn: fz.cityName,
    uf: fz.state,
    p: fz.price,
  };
  if (fz.neighborhood) result.nb = fz.neighborhood;
  if (fz.neighborhoodPrice) result.np = fz.neighborhoodPrice;
  if (fz.var12m) result.v12 = fz.var12m;
  if (fz.annualizedRate != null) result.ar = parseFloat(fz.annualizedRate.toFixed(2));
  if (fz.inccAnnualized != null) result.ir = parseFloat(fz.inccAnnualized.toFixed(2));
  if (fz.realGain != null) result.rg = parseFloat(fz.realGain.toFixed(2));
  if (fz.projectedValueAtDelivery != null) result.pv = fz.projectedValueAtDelivery;
  if (fz.equityGain != null) result.eg = fz.equityGain;
  if (fz.mesesAteEntrega != null) result.me = fz.mesesAteEntrega;
  if (fz.totalAppreciation != null) result.ta = parseFloat(fz.totalAppreciation.toFixed(2));
  if (fz.periodRange) result.pr = { f: fz.periodRange.first, l: fz.periodRange.last };
  if (fz.priceHistory?.length) {
    result.ph = fz.priceHistory.map(h => ({
      p: h.period,
      v: h.price,
    }));
  }
  return result;
}

function expandFipezap(compact) {
  if (!compact) return null;
  const result = {
    cityName: compact.cn,
    state: compact.uf,
    price: compact.p,
  };
  if (compact.nb) result.neighborhood = compact.nb;
  if (compact.np) result.neighborhoodPrice = compact.np;
  if (compact.v12) result.var12m = compact.v12;
  if (compact.ar != null) result.annualizedRate = compact.ar;
  if (compact.ir != null) result.inccAnnualized = compact.ir;
  if (compact.rg != null) result.realGain = compact.rg;
  if (compact.pv != null) result.projectedValueAtDelivery = compact.pv;
  if (compact.eg != null) result.equityGain = compact.eg;
  if (compact.me != null) result.mesesAteEntrega = compact.me;
  if (compact.ta != null) result.totalAppreciation = compact.ta;
  if (compact.pr) result.periodRange = { first: compact.pr.f, last: compact.pr.l };
  if (compact.ph) {
    result.priceHistory = compact.ph.map(h => ({
      period: h.p,
      price: h.v,
    }));
  }
  return result;
}

function decodeBase64Payload(base64String) {
  try {
    const json = decodeURIComponent(escape(atob(base64String)));
    const payload = JSON.parse(json);

    if (payload.v !== SHARE_VERSION) return null;

    return {
      valorImovel: payload.vi,
      dataEntrega: payload.de,
      mesesAteEntrega: payload.me,
      opcoes: (payload.o || []).map(expandScenario),
      corretor: payload.c ? {
        nome: payload.c.n || '',
        creci: payload.c.cr || '',
        contato: payload.c.ct || '',
      } : null,
      imovel: payload.im ? {
        nome: payload.im.n || '',
        localizacao: payload.im.l || '',
        cidade: payload.im.cd || '',
        estado: payload.im.uf || '',
        metragem: payload.im.m || '',
        informacoesGerais: payload.im.ig || '',
      } : null,
      fipezap: expandFipezap(payload.fz),
      neighborhoods: payload.nbs ? payload.nbs.map(h => ({
        n: h.n,
        p: h.p,
        v: h.v,
      })) : null,
    };
  } catch {
    return null;
  }
}

export function encodeSharePayload({ customOpcoes, calculatorInputs, resultados, reportInfo, selectedForPdf, neighborhoods }) {
  const selectedIndices = Object.entries(selectedForPdf || {})
    .filter(([, v]) => v)
    .map(([k]) => parseInt(k));

  const scenariosToShare = selectedIndices.length > 0
    ? selectedIndices.map(i => customOpcoes[i]).filter(Boolean)
    : customOpcoes;

  const fz = calculatorInputs?.fipezapMatch;

  const payload = {
    v: SHARE_VERSION,
    vi: parseFloat(calculatorInputs?.valorImovel || 0),
    de: calculatorInputs?.dataEntrega || '',
    me: resultados?.mesesAteEntrega || 0,
    o: scenariosToShare.map(compactScenario),
  };

  if (reportInfo?.corretor?.nome) {
    payload.c = {};
    if (reportInfo.corretor.nome) payload.c.n = reportInfo.corretor.nome;
    if (reportInfo.corretor.creci) payload.c.cr = reportInfo.corretor.creci;
    if (reportInfo.corretor.contato) payload.c.ct = reportInfo.corretor.contato;
  }

  if (reportInfo?.imovel?.nome) {
    payload.im = {};
    if (reportInfo.imovel.nome) payload.im.n = reportInfo.imovel.nome;
    if (reportInfo.imovel.localizacao) payload.im.l = reportInfo.imovel.localizacao;
    if (reportInfo.imovel.cidade) payload.im.cd = reportInfo.imovel.cidade;
    if (reportInfo.imovel.estado) payload.im.uf = reportInfo.imovel.estado;
    if (reportInfo.imovel.metragem) payload.im.m = reportInfo.imovel.metragem;
    if (reportInfo.imovel.informacoesGerais) payload.im.ig = reportInfo.imovel.informacoesGerais;
  }

  const compactFz = compactFipezap(fz);
  if (compactFz) {
    payload.fz = compactFz;
    if (neighborhoods?.length) {
      payload.nbs = neighborhoods.map(h => ({ n: h.n, p: h.p, v: h.v }));
    }
  }

  const json = JSON.stringify(payload);
  return btoa(unescape(encodeURIComponent(json)));
}

export async function generateSignedShareUrl(shareData) {
  const base64Payload = encodeSharePayload(shareData);

  const response = await fetch(CREATE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: base64Payload }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || 'Failed to create share');
  }

  const responseBody = await response.json().catch(() => ({}));
  const { id } = responseBody;
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid server response');
  }

  const origin = window.location.origin;
  return `${origin}/relatorio?s=${id}`;
}

export async function verifyShareId(shareId) {
  if (!shareId || typeof shareId !== 'string') {
    return { error: 'invalid' };
  }

  try {
    const response = await fetch(GET_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: shareId }),
    });

    const body = await response.json().catch(() => ({}));

    if (response.ok && body.valid) {
      const decoded = decodeBase64Payload(body.data);
      if (!decoded) return { error: 'invalid' };
      return { data: decoded };
    }

    return { error: body.error || 'invalid' };
  } catch {
    return { error: 'network' };
  }
}
