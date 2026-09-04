// Pedidos Decoralar

const SUPABASE_URL = 'https://hpjiwmmslyvuqrkllmvb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_bx1NzXS3nlgFK-te-Nuk9g_6n0j4htx';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const botaoPesquisar = document.getElementById('pesquisarPedidos');
const botaoLimpar = document.getElementById('limparFiltros');
const tabelaPedidos = document.getElementById('listaPedidos');

async function atualizarStatus(id,campo,valor){
 const {error}=await db.from('pedidos').update({[campo]:valor}).eq('id',id);
 if(error){console.error(error);alert('Erro ao atualizar status');return;}
 pesquisarPedidos();
}

async function pesquisarPedidos(){
 const numero=document.getElementById('buscaPedido')?.value.trim() || '';
 const entrega=document.getElementById('filtroEntrega')?.value || '';
 const financeiro=document.getElementById('filtroFinanceiro')?.value || '';
 const dataInicial=document.getElementById('dataInicial')?.value || '';
 const dataFinal=document.getElementById('dataFinal')?.value || '';

 let query=db.from('pedidos').select('id,numero_pedido,valor_total,status_entrega,status_financeiro,created_at,clientes(nome),users(nome)');

 if(numero) query=query.eq('numero_pedido',numero);
 if(entrega) query=query.eq('status_entrega',entrega);
 if(financeiro) query=query.eq('status_financeiro',financeiro);
 if(dataInicial) query=query.gte('created_at',dataInicial+'T00:00:00');
 if(dataFinal) query=query.lte('created_at',dataFinal+'T23:59:59');

 const {data,error}=await query.order('created_at',{ascending:false});
 if(error){console.error(error);alert('Erro ao buscar pedidos');return;}
 renderizarPedidos(data||[]);
}

function statusBadge(valor,tipo){
 return `<span class="status-badge ${tipo}-${String(valor).toLowerCase().replaceAll(' ','-')}">${valor||''}</span>`;
}

function renderizarPedidos(pedidos){
 tabelaPedidos.innerHTML='';
 pedidos.forEach(p=>{
 tabelaPedidos.innerHTML+=`
 <tr>
 <td>${p.numero_pedido}</td>
 <td>${p.clientes?.nome || ''}</td>
 <td>${p.users?.nome || ''}</td>
 <td>${p.valor_total||''}</td>
 <td>${statusBadge(p.status_entrega,'entrega')}</td>
 <td>${statusBadge(p.status_financeiro,'financeiro')}</td>
 <td>${p.created_at?new Date(p.created_at).toLocaleDateString('pt-BR'):''}</td>
 <td>
 <strong>Entrega</strong><br>
 <button onclick="atualizarStatus('${p.id}','status_entrega','Pendente')">Pendente</button>
 <button onclick="atualizarStatus('${p.id}','status_entrega','Reservado')">Reservado</button>
 <button onclick="atualizarStatus('${p.id}','status_entrega','Concluído')">Concluído</button>
 <br><strong>Financeiro</strong><br>
 <button onclick="atualizarStatus('${p.id}','status_financeiro','Pendente')">Pendente</button>
 <button onclick="atualizarStatus('${p.id}','status_financeiro','Pagamento na entrega')">Pagamento entrega</button>
 <button onclick="atualizarStatus('${p.id}','status_financeiro','Pago')">Pago</button>
 </td>
 </tr>`;
 });
}

function limparFiltros(){document.querySelectorAll('.filtros input,.filtros select').forEach(c=>c.value='');tabelaPedidos.innerHTML='';}

window.atualizarStatus=atualizarStatus;
window.pesquisarPedidos=pesquisarPedidos;
botaoPesquisar?.addEventListener('click',pesquisarPedidos);
botaoLimpar?.addEventListener('click',limparFiltros);
