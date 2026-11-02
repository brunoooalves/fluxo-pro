import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../../context/AuthContext';
import SignUp from '../SignUp';
import LoginModal from '../LoginModal';
import { supabase } from '../../../lib/supabaseClient';

jest.mock('../../../lib/supabaseClient', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));

global.IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Funcionalidade: cadastro no Fluxo Pro. O projeto Supabase é compartilhado com o SPI Pocket,
 * então os dois pontos de entrada de cadastro (página /cadastro e LoginModal em modo cadastro)
 * pedem o link de confirmação de volta para a origem do próprio Fluxo Pro, pela mesma política
 * central do AuthContext.
 */
const ESPERADO = {
  email: 'ana@example.com',
  password: 'senha-segura-123',
  options: { data: { full_name: 'Ana Corretora' }, emailRedirectTo: window.location.origin },
};

let container;
let root;

function renderiza(ui) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<AuthProvider><MemoryRouter>{ui}</MemoryRouter></AuthProvider>));
}

function digita(placeholder, valor) {
  const input = container.querySelector(`input[placeholder="${placeholder}"]`);
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  act(() => {
    setter.call(input, valor);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function preencheEEnvia() {
  digita('Seu nome', 'Ana Corretora');
  digita('voce@email.com', 'ana@example.com');
  digita('mínimo 6 caracteres', 'senha-segura-123');
  await act(async () => {
    container.querySelector('button[type="submit"]').click();
  });
}

describe('Cadastro no Fluxo Pro com Supabase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    supabase.auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } });
    supabase.auth.signUp.mockResolvedValue({ data: { user: { id: 'novo' }, session: null }, error: null });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  test('a página de cadastro pede a confirmação de volta para a origem do Fluxo Pro', async () => {
    renderiza(<SignUp />);

    await preencheEEnvia();

    expect(supabase.auth.signUp).toHaveBeenCalledTimes(1);
    expect(supabase.auth.signUp).toHaveBeenCalledWith(ESPERADO);
  });

  test('o LoginModal em modo cadastro usa a mesma política de retorno', async () => {
    renderiza(<LoginModal open initialMode="signup" onClose={jest.fn()} />);

    await preencheEEnvia();

    expect(supabase.auth.signUp).toHaveBeenCalledTimes(1);
    expect(supabase.auth.signUp).toHaveBeenCalledWith(ESPERADO);
  });
});
