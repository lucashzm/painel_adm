const SUPABASE_URL='https://hpjiwmmslyvuqrkllmvb.supabase.co';
const SUPABASE_KEY='sb_publishable_bx1NzXS3nlgFK-te-Nuk9g_6n0j4htx';
const db=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const tabelaPedidos=document.getElementById('listaPedidos');
const botaoPesquisar=document.getElementById('pesquisarPedidos');
const botaoLimpar=document.getElementById('limparFiltros');

const formatarBRL=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});

async function confirmarAlteracao(){
 const senha=prompt('Senha para confirmar alteração');
 if(!senha)return false;
 const {data:{user}}=await db.auth.getUser();
 if(!user)return false;
 const r=await db.auth.signInWithPassword({email:user.email,password:senha});
 return !r.error;
}

async function atualizarStatus(id,campo,valor){
 if(!await confirmarAlteracao())return;
 await db.from('pedidos').update({[campo]:valor}).eq('id',id);
 fecharModal();pesquisarPedidos();
}

function abrirModalStatus(id,campo,atual,opcoes){
 const m=document.getElementById('modalStatus');
 m.innerHTML=`<div class="modal-conteudo"><h3>Alterar ${campo==='status_entrega'?'Entrega':'Financeiro'}</h3><p>Atual: ${atual}</p>${opcoes.map(o=>`<button class="acao" onclick="atualizarStatus('${id}','${campo}','${o}')">${o}</button>`).join('')}<button onclick="fecharModal()">Fechar</button></div>`;
 m.style.display='flex';
}
function fecharModal(){document.getElementById('modalStatus').style.display='none';}

async function abrirDetalhesPedido(id){
 const {data,error}=await db.from('pedidos').select('*,clientes(*),pedido_itens(*)').eq('id',id).single();
 if(error)return console.error(error);
 let old=document.getElementById('detalhe-'+id);if(old){old.remove();return;}
 const tr=document.createElement('tr');tr.id='detalhe-'+id;
 tr.innerHTML=`<td colspan="8"><div class="detalhes-pedido"><h3>Pedido ${data.numero_pedido}</h3><b>Cliente</b><br>${data.clientes?.nome||''}<br><br><b>Entrega</b><br>${data.endereco||''}<br>Previsão: ${data.previsao_entrega||''}<br><br><b>Financeiro</b><br>${formatarBRL(data.valor_total)}<br>${data.status_financeiro||''}<br><br><b>Produtos</b><br>${(data.pedido_itens||[]).map(i=>i.produto+' - '+i.quantidade).join('<br>')}</div></td>`;
 document.querySelector(`tr[data-id="${id}"]`).after(tr);
}

function badge(v){return `<span class="status-badge">${v||''}</span>`;}

async function pesquisarPedidos(){
 let numero=document.getElementById('buscaPedido')?.value.trim()||'';
 let q=db.from('pedidos').select('id,numero_pedido,valor_total,status_entrega,status_financeiro,created_at,clientes(nome),users(nome)');
 if(numero)q=q.eq('numero_pedido',numero);
 const {data,error}=await q.order('created_at',{ascending:false});
 if(error)return console.error(error);
 tabelaPedidos.innerHTML='';
 data.forEach(p=>{let tr=document.createElement('tr');tr.dataset.id=p.id;tr.innerHTML=`<td>${p.numero_pedido}</td><td>${p.clientes?.nome||''}</td><td>${p.users?.nome||''}</td><td>${formatarBRL(p.valor_total)}</td><td>${badge(p.status_entrega)}</td><td>${badge(p.status_financeiro)}</td><td>${new Date(p.created_at).toLocaleDateString('pt-BR')}</td><td><button class="acao" onclick="abrirModalStatus('${p.id}','status_entrega','${p.status_entrega}',['Pendente','Reservado','Aguardando entrega','Concluído'])">Entrega</button><button class="acao" onclick="abrirModalStatus('${p.id}','status_financeiro','${p.status_financeiro}',['Pendente','Pagamento na entrega','Pago'])">Financeiro</button><button class="acao" onclick="abrirDetalhesPedido('${p.id}')">+</button></td>`;tabelaPedidos.appendChild(tr);});
}
function limparFiltros(){location.reload();}
window.abrirModalStatus=abrirModalStatus;window.atualizarStatus=atualizarStatus;window.fecharModal=fecharModal;window.abrirDetalhesPedido=abrirDetalhesPedido;window.pesquisarPedidos=pesquisarPedidos;
if(!document.getElementById('modalStatus')){let d=document.createElement('div');d.id='modalStatus';d.style.cssText='display:none;position:fixed;inset:0;background:#0008;align-items:center;justify-content:center';document.body.appendChild(d);}
botaoPesquisar?.addEventListener('click',pesquisarPedidos);botaoLimpar?.addEventListener('click',limparFiltros);