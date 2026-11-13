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

async function consultarPerfil(userId) {
  const { data, error } = await db.from('users')
    .select('id,nome,cargo,ativo').eq('auth_user_id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

function ehDiretor(staff) {
  return !!staff && staff.ativo !== false &&
    (staff.cargo === 'administrador' || staff.cargo === 'diretor');
}

async function verificarLogin() {
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) {
    const next = encodeURIComponent(window.location.pathname.split('/').pop() || 'index.html');
    window.location.replace(`login.html?next=${next}`);
    return false;
  }

  let staff;
  try { staff = await consultarPerfil(user.id); }
  catch { staff = null; }

  if (!ehDiretor(staff)) {
    await db.auth.signOut();
    window.location.replace('login.html?erro=sem-permissao');
    return false;
  }

  const usuarioEl = document.getElementById('usuarioLogado');
  if (usuarioEl) usuarioEl.textContent = staff.nome || user.email || '';

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
  return true;
}

async function prepararLogin() {
  const erroEl = document.getElementById('loginErro');
  const params = new URLSearchParams(window.location.search);
  if (params.get('erro') === 'sem-permissao' && erroEl) {
    erroEl.textContent = 'Este acesso é exclusivo da direção.';
    erroEl.hidden = false;
  }

  const { data: { user } } = await db.auth.getUser();
  if (user) {
    let staff;
    try { staff = await consultarPerfil(user.id); } catch { staff = null; }
    if (ehDiretor(staff)) {
      window.location.replace(destinoSeguro());
      return;
    }
    await db.auth.signOut();
    if (erroEl) {
      erroEl.textContent = 'Este acesso é exclusivo da direção.';
      erroEl.hidden = false;
    }
  }

  const form = document.getElementById('loginForm');
  if (!form) return;

  const emailEl = document.getElementById('email');
  const senhaEl = document.getElementById('senha');
  const botaoEl = document.getElementById('entrar');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    erroEl.textContent = '';
    erroEl.hidden = true;
    botaoEl.disabled = true;
    botaoEl.textContent = 'Verificando acesso...';

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

    const { data: { user: signedUser } } = await db.auth.getUser();
    let staff;
    try { staff = signedUser ? await consultarPerfil(signedUser.id) : null; } catch { staff = null; }
    if (!ehDiretor(staff)) {
      await db.auth.signOut();
      erroEl.textContent = 'Este acesso é exclusivo da direção.';
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
  window.painelAuthReady = Promise.resolve(false);
} else {
  window.painelAuthReady = verificarLogin();
}
