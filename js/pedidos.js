// Pedidos Decoralar

const campoPedido = document.getElementById('buscaPedido');
const botaoPesquisar = document.getElementById('pesquisarPedidos');
const botaoLimpar = document.getElementById('limparFiltros');

function pesquisarPedido(){
  const numero = campoPedido.value.trim();

  if(!numero){
    alert('Digite o número do pedido para pesquisar.');
    return;
  }

  console.log('Pesquisar pedido:', numero);
  // Próximo passo: SELECT no Supabase
  // .from('pedidos').select('*').eq('numero_pedido', numero)
}

function limparFiltros(){
  document.querySelectorAll('.filtros input, .filtros select').forEach(campo=>campo.value='');
}

botaoPesquisar?.addEventListener('click', pesquisarPedido);
botaoLimpar?.addEventListener('click', limparFiltros);
