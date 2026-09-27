import { supabase } from '../lib/supabaseClient';

/**
 * Dados fiscais do assinante (tabela `billing_profiles`) — usados como tomador
 * na NFS-e emitida a cada cobrança. Leitura/escrita direta via RLS (só a
 * própria linha).
 */

export const onlyDigits = (v = '') => String(v).replace(/\D/g, '');

export function formatTaxId(digits = '') {
  const d = onlyDigits(digits);
  if (d.length <= 11) {
    return d
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1-$2');
  }
  return d
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export function formatCep(v = '') {
  return onlyDigits(v).slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2');
}

export function isValidCPF(value) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  const calc = (len) => {
    let sum = 0;
    for (let i = 0; i < len; i += 1) sum += Number(cpf[i]) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10]);
}

export function isValidCNPJ(value) {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
  const calc = (len) => {
    const weights = len === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < len; i += 1) sum += Number(cnpj[i]) * weights[i];
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return calc(12) === Number(cnpj[12]) && calc(13) === Number(cnpj[13]);
}

export async function fetchBillingProfile() {
  const { data, error } = await supabase
    .from('billing_profiles')
    .select('*')
    .maybeSingle();
  if (error) throw new Error('Não foi possível carregar seus dados fiscais.');
  return data;
}

/**
 * Salva (upsert) o perfil fiscal do usuário logado.
 * @param {object} form - campos do formulário (tax_id pode vir formatado)
 */
export async function saveBillingProfile(userId, form) {
  const taxId = onlyDigits(form.tax_id);
  const row = {
    user_id: userId,
    name: form.name.trim(),
    tax_id: taxId,
    tax_id_type: taxId.length === 14 ? 'cnpj' : 'cpf',
    email: form.email?.trim() || null,
    cep: onlyDigits(form.cep) || null,
    logradouro: form.logradouro?.trim() || null,
    numero: form.numero?.trim() || null,
    complemento: form.complemento?.trim() || null,
    bairro: form.bairro?.trim() || null,
    cidade: form.cidade?.trim() || null,
    uf: form.uf?.trim().toUpperCase() || null,
    ibge_code: form.ibge_code || null,
  };
  const { data, error } = await supabase
    .from('billing_profiles')
    .upsert(row, { onConflict: 'user_id' })
    .select()
    .single();
  if (error) throw new Error('Não foi possível salvar seus dados fiscais. Tente novamente.');
  return data;
}

/** Consulta o ViaCEP e devolve endereço + código IBGE (ou null se não achar). */
export async function lookupCep(cep) {
  const d = onlyDigits(cep);
  if (d.length !== 8) return null;
  try {
    const resp = await fetch(`https://viacep.com.br/ws/${d}/json/`);
    const json = await resp.json();
    if (json.erro) return null;
    return {
      logradouro: json.logradouro || '',
      bairro: json.bairro || '',
      cidade: json.localidade || '',
      uf: json.uf || '',
      ibge_code: json.ibge || '',
    };
  } catch {
    return null;
  }
}
