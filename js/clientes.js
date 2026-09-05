const SUPABASE_URL='https://hpjiwmmslyvuqrkllmvb.supabase.co';
const SUPABASE_KEY='sb_publishable_bx1NzXS3nlgFK-te-Nuk9g_6n0j4htx';
const db=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);

const listaEl=document.getElementById('listaClientes');
const buscaEl=document.getElementById('buscaCliente');
const totalEl=document.getElementById('totalClientes');
let clientes=[];

function formatarBRL(valor){return Number(valor||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
function inicial(nome){return (String(nome||'?').trim()[0]||'?').toUpperCase();}

async function carregarClientes(){
 listaEl.innerHTML='<div class="clientes-vazio">Carregando clientes...</div>';
 const {data,error}=await db.from('clientes').select('id,nome,cpf_cnpj,telefone,email').order('nome');
 if(error){console.error(error);listaEl.innerHTML='<div class="erro-tabela">Não foi possível carregar os clientes.</div>';return;}
 const ids=(data||[]).map(c=>c.id);
 let pedidos=[];
 if(ids.length){const r=await db.from('pedidos').select('id,cliente_id,valor_total').in('cliente_id',ids);if(!r.error)pedidos=r.data||[];}
 clientes=(data||[]).map(c=>{const ps=pedidos.filter(p=>p.cliente_id===c.id);return {...c,pedidos:ps.length,total:ps.reduce((s,p)=>s+Number(p.valor_total||0),0)}});
 renderizar();
}

function renderizar(){
 const termo=buscaEl.value.toLowerCase().trim();
 const filtrados=clientes.filter(c=>[c.nome,c.cpf_cnpj,c.telefone,c.email].some(v=>String(v||'').toLowerCase().includes(termo)));
 totalEl.textContent=`${filtrados.length} ${filtrados.length===1?'cliente':'clientes'}`;
 if(!filtrados.length){listaEl.innerHTML='<div class="clientes-vazio"><strong>Nenhum cliente encontrado</strong><span>Tente buscar por outro nome, CPF/CNPJ, telefone ou e-mail.</span></div>';return;}
 listaEl.innerHTML=filtrados.map(c=>`<article class="cliente-card">
 <div class="cliente-identidade"><div class="cliente-avatar">${esc(inicial(c.nome))}</div><div><h3>${esc(c.nome||'Sem nome')}</h3><p>${esc(c.cpf_cnpj||'CPF/CNPJ não informado')}</p></div></div>
 <div class="cliente-info"><div><small>Telefone</small><strong>${esc(c.telefone||'—')}</strong></div><div><small>E-mail</small><strong>${esc(c.email||'—')}</strong></div></div>
 <div class="cliente-metricas"><div><small>Pedidos</small><strong>${c.pedidos}</strong></div><div><small>Total comprado</small><strong>${formatarBRL(c.total)}</strong></div></div>
 <button class="cliente-expandir" data-id="${c.id}" aria-expanded="false">+</button>
 <div class="cliente-detalhes" id="cliente-${c.id}"></div>
 </article>`).join('');
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

buscaEl.addEventListener('input',renderizar);
carregarClientes();
