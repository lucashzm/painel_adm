// Pedidos Decoralar

const SUPABASE_URL = 'https://hpjiwmmslyvuqrkllmvb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_bx1NzXS3nlgFK-te-Nuk9g_6n0j4htx';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const botaoPesquisar = document.getElementById('pesquisarPedidos');
const botaoLimpar = document.getElementById('limparFiltros');
const tabelaPedidos = document.getElementById('listaPedidos');

function formatarBRL(valor){
 return Number(valor||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
}

async function confirmarAlteracao(){
 const senha=prompt('Digite sua senha para confirmar a alteração:');
 if(!senha)return false;
 const {data:{user}}=await db.auth.getUser();
 if(!user)return false;
 const login=await db.auth.signInWithPassword({email:user.email,password:senha});
 if(login.error){alert('Senha inválida');return false;}
 return true;
}

async function atualizarStatus(id,campo,valor){
 if(!await confirmarAlteracao())return;
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

function opcoesStatus(id,campo,atual,opcoes){
 const escolha=prompt(`Status atual: ${atual}\n\nEscolha o novo status:\n${opcoes.map((x,i)=>`${i+1} - ${x}`).join('\n')}`);
 const indice=Number(escolha)-1;
 if(opcoes[indice]) atualizarStatus(id,campo,opcoes[indice]);
}

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
 <button onclick="opcoesStatus('${p.id}','status_entrega','${p.status_entrega||''}', ['Pendente','Aguardando entrega','Reservado','Concluído','Cancelado'])">Entrega</button>
 <button onclick="opcoesStatus('${p.id}','status_financeiro','${p.status_financeiro||''}', ['Pendente','Pagamento na entrega','Pago','Cancelado'])">Financeiro</button>
 <button onclick="abrirDetalhesPedido('${p.id}')">+ Dados do pedido</button>
 </td></tr>`;
 });
}

function limparFiltros(){document.querySelectorAll('.filtros input,.filtros select').forEach(c=>c.value='');tabelaPedidos.innerHTML='';}

window.abrirDetalhesPedido=abrirDetalhesPedido;
window.opcoesStatus=opcoesStatus;
window.atualizarStatus=atualizarStatus;
window.pesquisarPedidos=pesquisarPedidos;
botaoPesquisar?.addEventListener('click',pesquisarPedidos);
botaoLimpar?.addEventListener('click',limparFiltros);
