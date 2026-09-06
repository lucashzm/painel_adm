const dataInicial = document.getElementById('dataInicial');
const dataFinal = document.getElementById('dataFinal');
const aplicarFiltro = document.getElementById('aplicarFiltro');
const ultimos30 = document.getElementById('ultimos30');

const STATUS_ENTREGA = ['Pendente', 'Reservado', 'Aguardando entrega', 'Concluído'];
const STATUS_FINANCEIRO = ['Pendente', 'Pagamento na entrega', 'Pago'];

function dataLocalISO(data = new Date()) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function configurarUltimos30Dias() {
  const hoje = new Date();
  const inicio = new Date(hoje);
  inicio.setDate(hoje.getDate() - 29);
  dataInicial.value = dataLocalISO(inicio);
  dataFinal.value = dataLocalISO(hoje);
}

function contarPorStatus(pedidos, campo, status) {
  return pedidos.filter(p => p[campo] === status).length;
}

function renderizar() {
  const linhasEntrega = document.querySelectorAll('#statusEntrega .dashboard-status-row');
  STATUS_ENTREGA.forEach((status, i) => {
    linhasEntrega[i].querySelector('strong').textContent = contarPorStatus(window.pedidosDashboard, 'status_entrega', status);
  });

  const linhasFinanceiro = document.querySelectorAll('#statusFinanceiro .dashboard-status-row');
  STATUS_FINANCEIRO.forEach((status, i) => {
    linhasFinanceiro[i].querySelector('strong').textContent = contarPorStatus(window.pedidosDashboard, 'status_financeiro', status);
  });

  document.getElementById('totalEntrega').textContent = window.pedidosDashboard.length;
  document.getElementById('totalFinanceiro').textContent = window.pedidosDashboard.length;
}

async function carregarDashboard() {
  const inicio = dataInicial.value;
  const fim = dataFinal.value;

  if (!inicio || !fim) return;
  if (inicio > fim) {
    alert('A data inicial não pode ser maior que a data final.');
    return;
  }

  aplicarFiltro.disabled = true;
  aplicarFiltro.textContent = 'Carregando...';

  try {
    const fimExclusivo = new Date(`${fim}T00:00:00`);
    fimExclusivo.setDate(fimExclusivo.getDate() + 1);

    const { data, error } = await db
      .from('pedidos')
      .select('status_entrega,status_financeiro,created_at')
      .gte('created_at', `${inicio}T00:00:00`)
      .lt('created_at', fimExclusivo.toISOString());

    if (error) throw error;

    window.pedidosDashboard = data || [];
    renderizar();
  } catch (erro) {
    console.error('Erro ao carregar dashboard:', erro);
    alert('Não foi possível carregar os dados do dashboard. Veja o console.');
  } finally {
    aplicarFiltro.disabled = false;
    aplicarFiltro.textContent = 'Aplicar';
  }
}

aplicarFiltro.addEventListener('click', carregarDashboard);
ultimos30.addEventListener('click', () => {
  configurarUltimos30Dias();
  carregarDashboard();
});

dataInicial.addEventListener('change', () => {
  if (dataFinal.value && dataInicial.value > dataFinal.value) dataFinal.value = dataInicial.value;
});

dataFinal.addEventListener('change', () => {
  if (dataInicial.value && dataFinal.value < dataInicial.value) dataInicial.value = dataFinal.value;
});

window.pedidosDashboard = [];
configurarUltimos30Dias();
carregarDashboard();
