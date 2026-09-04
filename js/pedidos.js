// Pedidos Decoralar

const SUPABASE_URL = 'https://hpjiwmmslyvuqrkllmvb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_bx1NzXS3nlgFK-te-Nuk9g_6n0j4htx';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const botaoPesquisar = document.getElementById('pesquisarPedidos');
const botaoLimpar = document.getElementById('limparFiltros');
const tabelaPedidos = document.getElementById('listaPedidos');

async function atualizarStatus(id,campo,valor){
 const {error}=await db.from('pedidos').update({[campo]:valor}).eq('id',id);
 if(error){
  console.error(error);
  alert('Erro ao atualizar status');
  return;
 }
 pesquisarPedidos();
}

async function pesquisarPedidos(){
 console.log('Busca de pedidos acionada');

 const numero=document.getElementById('buscaPedido')?.value.trim() || '';
 const entrega=document.getElementById('filtroEntrega')?.value || '';
 const financeiro=document.getElementById('filtroFinanceiro')?.value || '';
 const dataInicial=document.getElementById('dataInicial')?.value || '';
 const dataFinal=document.getElementById('dataFinal')?.value || '';

 let query=db
 .from('pedidos')
 .select('id,numero_pedido,valor_total,status_entrega,status_financeiro,created_at');

 if(numero) query=query.eq('numero_pedido',numero);
 if(entrega) query=query.eq('status_entrega',entrega);
 if(financeiro) query=query.eq('status_financeiro',financeiro);
 if(dataInicial) query=query.gte('created_at',dataInicial+'T00:00:00');
 if(dataFinal) query=query.lte('created_at',dataFinal+'T23:59:59');

 const {data,error}=await query.order('created_at',{ascending:false});

 console.log('Filtros:', {numero, entrega, financeiro, dataInicial, dataFinal});
 console.log('Resultado:', data);

 if(error){
  console.error(error);
  alert('Erro ao buscar pedidos');
  return;
 }

 renderizarPedidos(data||[]);
}

function renderizarPedidos(pedidos){
 tabelaPedidos.innerHTML='';
 pedidos.forEach(p=>{
 tabelaPedidos.innerHTML+=`
 <tr>
 <td>${p.numero_pedido}</td>
 <td></td>
 <td></td>
 <td>${p.valor_total||''}</td>
 <td>${p.status_entrega||''}</td>
 <td>${p.status_financeiro||''}</td>
 <td>${p.created_at?new Date(p.created_at).toLocaleDateString('pt-BR'):''}</td>
 <td>
 <button onclick="atualizarStatus('${p.id}','status_entrega','Reservado')">Reservar</button>
 <button onclick="atualizarStatus('${p.id}','status_financeiro','Pago')">Pago</button>
 <button onclick="atualizarStatus('${p.id}','status_financeiro','Pagamento na entrega')">Entrega</button>
 </td>
 </tr>`;
 });
}

function limparFiltros(){
 document.querySelectorAll('.filtros input,.filtros select').forEach(campo=>campo.value='');
 tabelaPedidos.innerHTML='';
}

window.atualizarStatus=atualizarStatus;
window.pesquisarPedidos=pesquisarPedidos;

if(botaoPesquisar){
 botaoPesquisar.addEventListener('click', pesquisarPedidos);
 console.log('Botao pesquisar conectado');
}else{
 console.error('Botao pesquisarPedidos nao encontrado no HTML');
}

botaoLimpar?.addEventListener('click',limparFiltros);
