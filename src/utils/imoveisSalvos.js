/**
 * Empreendimentos salvos no dispositivo.
 *
 * Compartilhado entre a calculadora e o modal de relatório. Guarda APENAS
 * dados de empreendimento reaproveitáveis (nome, endereço, cidade, estado,
 * informações gerais) — metragem, unidade e dados do cliente NÃO são salvos,
 * pois são específicos de cada proposta.
 */

const STORAGE_KEY = 'fluxopro_imoveis_salvos';
const MAX_IMOVEIS = 30;
const TTL_DAYS = 30;

export function carregarImoveisSalvos() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    const now = Date.now();
    const ttlMs = TTL_DAYS * 24 * 60 * 60 * 1000;
    const valid = parsed.filter(
      item => item.savedAt && (now - new Date(item.savedAt).getTime()) < ttlMs
    );
    if (valid.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
    }
    return valid;
  } catch {
    return [];
  }
}

/**
 * Salva um prédio na lista do dispositivo.
 * @returns {{ ok: boolean, reason?: string, imovel?: object }}
 */
export function salvarImovel(imovel) {
  if (!imovel || !imovel.nome || !imovel.localizacao) {
    return { ok: false, reason: 'invalid' };
  }
  const lista = carregarImoveisSalvos();
  if (lista.length >= MAX_IMOVEIS) {
    return { ok: false, reason: 'limit' };
  }
  const novo = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    nome: imovel.nome,
    localizacao: imovel.localizacao,
    cidade: imovel.cidade || '',
    estado: imovel.estado || '',
    informacoesGerais: imovel.informacoesGerais || '',
    savedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...lista, novo]));
  } catch {
    return { ok: false, reason: 'storage' };
  }
  return { ok: true, imovel: novo };
}

/**
 * Remove um empreendimento salvo pelo id.
 * @returns {Array} a lista atualizada.
 */
export function excluirImovel(id) {
  const lista = carregarImoveisSalvos().filter(item => item.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
  } catch {
    /* localStorage indisponível — segue com a lista em memória */
  }
  return lista;
}
