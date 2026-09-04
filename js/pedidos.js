// Pedidos Decoralar

const SUPABASE_URL = 'https://hpjiwmmslyvuqrkllmvb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_bx1NzXS3nlgFK-te-Nuk9g_6n0j4htx';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const botaoPesquisar = document.getElementById('pesquisarPedidos');
const botaoLimpar = document.getElementById('limparFiltros');
const tabelaPedidos = document.getElementById('listaPedidos');

function formatarBRL(valor){return Number(valor||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});}

async function atualizarStatus(id,campo,valor){
 const {error}=await db.from('pedidos').update({[campo]:valor}).eq('id',id);
 if(error){console.error(error);alert('Erro ao atualizar status');return;}
 pesquisarPedidos();
}

async function abrirDetalhesPedido(id){
 const {data,error}=await db.from('pedidos').select('*,clientes(*),pedido_itens(*)').eq('id',id).single();
 if(error){console.error(error);alert('Erro ao carregar detalhes');return;}

 alert(`Pedido ${data.numero_pedido}\n\nCliente: ${data.clientes?.nome||''}\nPagamento: ${data.forma_pagamento||''}\nEntrega prevista: ${data.previsao_entrega||''}\nValor: ${formatarBRL(data.valor_total)}`);
}

async function pesquisarPedidos(){
 const numero=document.getElementById('buscaPedido')?.value.trim() || '';
 const entrega=document.getElementById('filtroEntrega')?.value || '';
 const financeiro=document.getElementById('filtroFinanceiro')?.value || '';
 let query=db.from('pedidos').select('id,numero_pedido,valor_total,status_entrega,status_financeiro,created_at,clientes(nome),users(nome)');
 if(numero)query=query.eq('numero_pedido',numero);
 if(entrega)query=query.eq('status_entrega',entrega);
 if(financeiro)query=query.eq('status_financeiro',financeiro);
 const {data,error}=await query.order('created_at',{ascending:false});
 if(error){console.error(error);return;}
 renderizarPedidos(data||[]);
}

function statusBadge(valor,tipo){return `<span class="status-badge ${tipo}">${valor||''}</span>`;}

function renderizarPedidos(pedidos){
 tabelaPedidos.innerHTML='';
 pedidos.forEach(p=>{
 tabelaPedidos.innerHTML+=`<tr>
 <td>${p.numero_pedido}</td>
 <td>${p.clientes?.nome||''}</td>
 <td>${p.users?.nome||''}</td>
 <td>${formatarBRL(p.valor_total)}</td>
 <td>${statusBadge(p.status_entrega,'entrega')}</td>
 <td>${statusBadge(p.status_financeiro,'financeiro')}</td>
 <td>${p.created_at?new Date(p.created_at).toLocaleDateString('pt-BR'):''}</td>
 <td>
 <button onclick="abrirDetalhesPedido('${p.id}')">+ Dados do pedido</button>
 <button onclick="atualizarStatus('${p.id}','status_entrega','Concluído')">Concluir entrega</button>
 <button onclick="atualizarStatus('${p.id}','status_financeiro','Pago')">Pago</button>
 </td></tr>`;
 });
}

function limparFiltros(){document.querySelectorAll('.filtros input,.filtros select').forEach(c=>c.value='');tabelaPedidos.innerHTML='';}

window.abrirDetalhesPedido=abrirDetalhesPedido;
window.atualizarStatus=atualizarStatus;
window.pesquisarPedidos=pesquisarPedidos;
botaoPesquisar?.addEventListener('click',pesquisarPedidos);
botaoLimpar?.addEventListener('click',limparFiltros);
