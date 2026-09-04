const SUPABASE_URL='https://hpjiwmmslyvuqrkllmvb.supabase.co';
const SUPABASE_KEY='sb_publishable_bx1NzXS3nlgFK-te-Nuk9g_6n0j4htx';
const db=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const botaoPesquisar=document.getElementById('pesquisarPedidos');
const botaoLimpar=document.getElementById('limparFiltros');
const tabelaPedidos=document.getElementById('listaPedidos');

function formatarBRL(v){return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});}

async function confirmarAlteracao(){
 const senha=prompt('Digite sua senha para confirmar a alteração:');
 if(!senha)return false;
 const {data:{user}}=await db.auth.getUser();
 if(!user)return false;
 const login=await db.auth.signInWithPassword({email:user.email,password:senha});
 return !login.error;
}

async function atualizarStatus(id,campo,valor){
 if(!await confirmarAlteracao())return;
 const {error}=await db.from('pedidos').update({[campo]:valor}).eq('id',id);
 if(error)return console.error(error);
 fecharModal();pesquisarPedidos();
}

function abrirModalStatus(id,campo,atual,opcoes){
 const modal=document.getElementById('modalStatus');
 modal.innerHTML=`<div class="modal-conteudo"><button onclick="fecharModal()">X</button><h3>Alterar ${campo==='status_entrega'?'Entrega':'Financeiro'}</h3><p>Atual: <b>${atual}</b></p>${opcoes.map(s=>`<button class="acao" onclick="atualizarStatus('${id}','${campo}','${s}')">${s}</button>`).join('')}</div>`;
 modal.style.display='flex';
}
function fecharModal(){document.getElementById('modalStatus').style.display='none';}

async function pesquisarPedidos(){
 const numero=document.getElementById('buscaPedido')?.value.trim()||'';
 const entrega=document.getElementById('filtroEntrega')?.value||'';
 const financeiro=document.getElementById('filtroFinanceiro')?.value||'';
 const inicio=document.querySelector('input[type=date]')?.value||'';
 const datas=document.querySelectorAll('input[type=date]');
 const fim=datas[1]?.value||'';
 let query=db.from('pedidos').select('id,numero_pedido,valor_total,status_entrega,status_financeiro,created_at,clientes(nome),users(nome)');
 if(numero)query=query.eq('numero_pedido',numero);
 if(entrega)query=query.eq('status_entrega',entrega);
 if(financeiro)query=query.eq('status_financeiro',financeiro);
 if(inicio)query=query.gte('created_at',inicio+'T00:00:00');
 if(fim)query=query.lte('created_at',fim+'T23:59:59');
 const {data,error}=await query.order('created_at',{ascending:false});
 if(error)return console.error(error);
 renderizarPedidos(data||[]);
}

function badge(v){return `<span class="status-badge">${v||''}</span>`;}
function renderizarPedidos(lista){
 tabelaPedidos.innerHTML='';
 lista.forEach(p=>{
 tabelaPedidos.innerHTML+=`<tr><td>${p.numero_pedido}</td><td>${p.clientes?.nome||''}</td><td>${p.users?.nome||''}</td><td>${formatarBRL(p.valor_total)}</td><td>${badge(p.status_entrega)}</td><td>${badge(p.status_financeiro)}</td><td>${new Date(p.created_at).toLocaleDateString('pt-BR')}</td><td><button class="acao entrega" onclick="abrirModalStatus('${p.id}','status_entrega','${p.status_entrega}',${JSON.stringify(['Pendente','Reservado','Aguardando entrega','Concluído'])})">${p.status_entrega}</button><button class="acao financeiro" onclick="abrirModalStatus('${p.id}','status_financeiro','${p.status_financeiro}',${JSON.stringify(['Pendente','Pagamento na entrega','Pago'])})">${p.status_financeiro}</button><button class="acao detalhes" onclick="abrirDetalhesPedido('${p.id}')">+</button></td></tr>`;
 });
}
async function abrirDetalhesPedido(id){const {data,error}=await db.from('pedidos').select('*,clientes(*),pedido_itens(*)').eq('id',id).single();if(!error)alert(JSON.stringify(data,null,2));}
function limparFiltros(){document.querySelectorAll('.filtros input,.filtros select').forEach(x=>x.value='');tabelaPedidos.innerHTML='';}
window.abrirModalStatus=abrirModalStatus;window.fecharModal=fecharModal;window.atualizarStatus=atualizarStatus;window.pesquisarPedidos=pesquisarPedidos;window.abrirDetalhesPedido=abrirDetalhesPedido;
if(!document.getElementById('modalStatus')){const d=document.createElement('div');d.id='modalStatus';d.style.cssText='display:none;position:fixed;inset:0;background:#0006;align-items:center;justify-content:center';document.body.appendChild(d);}
botaoPesquisar?.addEventListener('click',pesquisarPedidos);botaoLimpar?.addEventListener('click',limparFiltros);