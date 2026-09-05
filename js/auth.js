const SUPABASE_URL = 'https://hpjiwmmslyvuqrkllmvb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_bx1NzXS3nlgFK-te-Nuk9g_6n0j4htx';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const paginaAtual = window.location.pathname.split('/').pop() || 'index.html';
const paginaLogin = 'login.html';

function destinoSeguro() {
  const destino = new URLSearchParams(window.location.search).get('next');
  if (!destino || destino.includes('://') || destino.startsWith('//')) return 'index.html';
  return destino.endsWith('.html') ? destino : 'index.html';
}

async function verificarLogin() {
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) {
    const next = encodeURIComponent(window.location.pathname.split('/').pop() || 'index.html');
    window.location.replace(`login.html?next=${next}`);
    return null;
  }

  const usuarioEl = document.getElementById('usuarioLogado');
  if (usuarioEl) usuarioEl.textContent = data.user.email || '';

  const logoutEl = document.getElementById('logoutBtn');
  if (logoutEl) {
    logoutEl.addEventListener('click', async () => {
      logoutEl.disabled = true;
      const { error: logoutError } = await db.auth.signOut();
      if (logoutError) {
        console.error(logoutError);
        logoutEl.disabled = false;
        return;
      }
      window.location.replace('login.html');
    });
  }

  return data.user;
}

async function prepararLogin() {
  const { data } = await db.auth.getSession();
  if (data.session) window.location.replace(destinoSeguro());

  const form = document.getElementById('loginForm');
  if (!form) return;

  const emailEl = document.getElementById('email');
  const senhaEl = document.getElementById('senha');
  const erroEl = document.getElementById('loginErro');
  const botaoEl = document.getElementById('entrar');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    erroEl.textContent = '';
    erroEl.hidden = true;
    botaoEl.disabled = true;
    botaoEl.textContent = 'Entrando...';

    const { error } = await db.auth.signInWithPassword({
      email: emailEl.value.trim(),
      password: senhaEl.value
    });

    if (error) {
      erroEl.textContent = 'E-mail ou senha inválidos.';
      erroEl.hidden = false;
      botaoEl.disabled = false;
      botaoEl.textContent = 'Entrar';
      return;
    }

    window.location.replace(destinoSeguro());
  });
}

if (paginaAtual === paginaLogin) {
  prepararLogin();
} else {
  verificarLogin();
}
