// Pedidos Decoralar

const SUPABASE_URL = 'https://hpjiwmmslyvuqrkllmvb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_bx1NzXS3nlgFK-teNuk9g_6n0j4htx';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const botaoPesquisar = document.getElementById('pesquisarPedidos');
const botaoLimpar = document.getElementById('limparFiltros');
const tabelaPedidos = document.getElementById('listaPedidos');

async function pesquisarPedidos(){

 const numero = document.getElementById('buscaPedido').value.trim();
 const cliente = document.getElementById('buscaCliente').value.trim();
 const vendedor = document.getElementById('filtroVendedor').value;
 const entrega = document.getElementById('filtroEntrega').value;
 const financeiro = document.getElementById('filtroFinanceiro').value;
 const dataInicial = document.getElementById('dataInicial')?.value;
 const dataFinal = document.getElementById('dataFinal')?.value;

 let query = db
  .from('pedidos')
  .select(`
    numero_pedido,
    valor_total,
    status_entrega,
    status_financeiro,
    created_at,
    clientes(nome, cpf_cnpj),
    users(nome)
  `);

 if(numero) query = query.eq('numero_pedido', numero);
 if(entrega) query = query.eq('status_entrega', entrega);
 if(financeiro) query = query.eq('status_financeiro', financeiro);
 if(vendedor) query = query.eq('user_id', vendedor);
 if(dataInicial) query = query.gte('created_at', dataInicial);
 if(dataFinal) query = query.lte('created_at', dataFinal + 'T23:59:59');

 const {data,error}=await query.order('created_at',{ascending:false});

 if(error){
   console.error(error);
   alert('Erro ao buscar pedidos.');
   return;
 }

 renderizarPedidos(data || []);
}

function renderizarPedidos(pedidos){
 tabelaPedidos.innerHTML='';

 pedidos.forEach(p=>{
  tabelaPedidos.innerHTML += `
   <tr>
    <td>${p.numero_pedido}</td>
    <td>${p.clientes?.nome || ''}</td>
    <td>${p.users?.nome || ''}</td>
    <td>${p.valor_total || ''}</td>
    <td>${p.status_entrega || ''}</td>
    <td>${p.status_financeiro || ''}</td>
    <td>${p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : ''}</td>
   </tr>`;
 });
}

function limparFiltros(){
 document.querySelectorAll('.filtros input, .filtros select')
 .forEach(campo=>campo.value='');
 tabelaPedidos.innerHTML='';
}

botaoPesquisar?.addEventListener('click', pesquisarPedidos);
botaoLimpar?.addEventListener('click', limparFiltros);
