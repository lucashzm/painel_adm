const SUPABASE_URL='https://hpjiwmmslyvuqrkllmvb.supabase.co';
const SUPABASE_KEY='sb_publishable_bx1NzXS3nlgFK-te-Nuk9g_6n0j4htx';
const db=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);

const listaEl=document.getElementById('listaClientes');
const filtros={
 nome:document.getElementById('filtroNome'),
 cpf:document.getElementById('filtroCpf'),
 telefone:document.getElementById('filtroTelefone'),
 email:document.getElementById('filtroEmail'),
 data:document.getElementById('filtroData')
};

function formatarBRL(valor){return Number(valor||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
function inicial(nome){return (String(nome||'?').trim()[0]||'?').toUpperCase();}
function normalizar(v){return String(v||'').toLowerCase().trim();}

function limparFiltros(){
 Object.values(filtros).forEach(el=>el.value='');
 listaEl.innerHTML='<div class="clientes-vazio">Informe um ou mais campos e clique em Pesquisar.</div>';
}

async function pesquisarClientes(){
 listaEl.innerHTML='<div class="clientes-vazio">Pesquisando clientes...</div>';
 let query=db.from('clientes').select('id,nome,cpf_cnpj,telefone,email,created_at').order('nome');
 if(filtros.nome.value.trim())query=query.ilike('nome',`%${filtros.nome.value.trim()}%`);
 if(filtros.cpf.value.trim())query=query.ilike('cpf_cnpj',`%${filtros.cpf.value.trim()}%`);
 if(filtros.telefone.value.trim())query=query.ilike('telefone',`%${filtros.telefone.value.trim()}%`);
 if(filtros.email.value.trim())query=query.ilike('email',`%${filtros.email.value.trim()}%`);
 if(filtros.data.value)query=query.gte('created_at',`${filtros.data.value}T00:00:00`).lt('created_at',`${filtros.data.value}T23:59:59.999`);
 const {data,error}=await query;
 if(error){console.error(error);listaEl.innerHTML='<div class="erro-tabela">Não foi possível pesquisar os clientes.</div>';return;}
 const clientes=data||[];
 const ids=clientes.map(c=>c.id);
 let pedidos=[];
 if(ids.length){const r=await db.from('pedidos').select('id,cliente_id,valor_total').in('cliente_id',ids);if(!r.error)pedidos=r.data||[];}
 renderizar(clientes,pedidos);
}

function renderizar(clientes,pedidos){
 if(!clientes.length){listaEl.innerHTML='<div class="clientes-vazio"><strong>Nenhum cliente encontrado</strong><span>Tente alterar os filtros da pesquisa.</span></div>';return;}
 listaEl.innerHTML=clientes.map(c=>{
  const ps=pedidos.filter(p=>p.cliente_id===c.id);
  const total=ps.reduce((s,p)=>s+Number(p.valor_total||0),0);
  const dataCadastro=c.created_at?new Date(c.created_at).toLocaleDateString('pt-BR'):'—';
  return `<article class="cliente-card">
 <div class="cliente-identidade"><div class="cliente-avatar">${esc(inicial(c.nome))}</div><div><h3>${esc(c.nome||'Sem nome')}</h3><p>${esc(c.cpf_cnpj||'CPF/CNPJ não informado')}</p></div></div>
 <div class="cliente-info"><div><small>Telefone</small><strong>${esc(c.telefone||'—')}</strong></div><div><small>E-mail</small><strong>${esc(c.email||'—')}</strong></div><div><small>Data de cadastro</small><strong>${dataCadastro}</strong></div></div>
 <div class="cliente-metricas"><div><small>Pedidos</small><strong>${ps.length}</strong></div><div><small>Total comprado</small><strong>${formatarBRL(total)}</strong></div></div>
 <button class="cliente-expandir" data-id="${c.id}" aria-expanded="false">+</button>
 <div class="cliente-detalhes" id="cliente-${c.id}"></div>
 </article>`;
 }).join('');
 document.querySelectorAll('.cliente-expandir').forEach(btn=>btn.addEventListener('click',()=>alternarDetalhes(btn)));
}

async function alternarDetalhes(btn){
 const id=btn.dataset.id;const box=document.getElementById(`cliente-${id}`);const aberto=btn.getAttribute('aria-expanded')==='true';
 if(aberto){btn.textContent='+';btn.setAttribute('aria-expanded','false');box.classList.remove('aberto');return;}
 btn.textContent='−';btn.setAttribute('aria-expanded','true');box.classList.add('aberto');
 if(box.dataset.carregado)return;
 box.innerHTML='<div class="cliente-detalhes-carregando">Carregando histórico...</div>';
 const {data,error}=await db.from('pedidos').select('numero_pedido,valor_total,status_entrega,status_financeiro,created_at').eq('cliente_id',id).order('created_at',{ascending:false});
 if(error){box.innerHTML='<div class="erro-tabela">Não foi possível carregar o histórico.</div>';return;}
 box.innerHTML=data?.length?`<div class="historico-cabecalho"><strong>Histórico de pedidos</strong><span>${data.length} ${data.length===1?'pedido':'pedidos'}</span></div>${data.map(p=>`<div class="historico-linha"><strong>#${esc(p.numero_pedido)}</strong><span>${new Date(p.created_at).toLocaleDateString('pt-BR')}</span><span>${formatarBRL(p.valor_total)}</span><span class="status-badge">${esc(p.status_entrega||'Pendente')}</span></div>`).join('')}`:'<div class="cliente-detalhes-carregando">Este cliente ainda não possui pedidos.</div>';
 box.dataset.carregado='true';
}

document.getElementById('pesquisarClientes').addEventListener('click',pesquisarClientes);
document.getElementById('limparFiltros').addEventListener('click',limparFiltros);
Object.values(filtros).forEach(el=>el.addEventListener('keydown',e=>{if(e.key==='Enter')pesquisarClientes();}));
