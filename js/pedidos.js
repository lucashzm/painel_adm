const SUPABASE_URL='https://hpjiwmmslyvuqrkllmvb.supabase.co';
const SUPABASE_KEY='sb_publishable_bx1NzXS3nlgFK-te-Nuk9g_6n0j4htx';
const db=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const tabelaPedidos=document.getElementById('listaPedidos');
const botaoPesquisar=document.getElementById('pesquisarPedidos');
const botaoLimpar=document.getElementById('limparFiltros');
const modalStatus=document.getElementById('modalStatus');

const STATUS_ENTREGA=['Pendente','Reservado','Aguardando entrega','Concluído'];
const STATUS_FINANCEIRO=['Pendente','Pagamento na entrega','Pago'];
const formatarBRL=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const escapar=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

function classeStatus(v,tipo){
 const base=String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,'-');
 return `status-badge ${tipo}-${base}`;
}

function mostrarModalStatus(id,campo,atual){
 const entrega=campo==='status_entrega';
 const opcoes=entrega?STATUS_ENTREGA:STATUS_FINANCEIRO;
 modalStatus.innerHTML=`
  <div class="modal-conteudo modal-status-conteudo" role="dialog" aria-modal="true">
    <div class="modal-cabecalho">
      <div><span class="modal-kicker">Pedido #${escapar(id)}</span><h2>Alterar ${entrega?'status de entrega':'status financeiro'}</h2></div>
      <button type="button" class="modal-fechar" data-modal-fechar aria-label="Fechar">×</button>
    </div>
    <p class="modal-atual">Status atual: <strong>${escapar(atual)}</strong></p>
    <div class="opcoes-status">
      ${opcoes.map(o=>`<button type="button" class="opcao-status ${o===atual?'selecionado':''}" data-status-opcao="${escapar(o)}">${escapar(o)}</button>`).join('')}
    </div>
    <label class="campo-senha">Senha para confirmar a alteração
      <input id="senhaStatus" type="password" autocomplete="current-password" placeholder="Digite sua senha">
    </label>
    <div id="erroStatus" class="erro-modal" hidden></div>
    <div class="modal-acoes"><button type="button" class="btn btn-limpar" data-modal-fechar>Cancelar</button><button type="button" class="btn btn-pesquisar" id="confirmarStatus" disabled>Confirmar alteração</button></div>
  </div>`;
 modalStatus.style.display='flex';
 modalStatus.setAttribute('aria-hidden','false');
 let novoStatus='';
 const botoes=modalStatus.querySelectorAll('[data-status-opcao]');
 const senhaInput=modalStatus.querySelector('#senhaStatus');
 const confirmar=modalStatus.querySelector('#confirmarStatus');
 botoes.forEach(b=>b.addEventListener('click',()=>{
   novoStatus=b.dataset.statusOpcao;
   botoes.forEach(x=>x.classList.remove('selecionado'));
   b.classList.add('selecionado');
   confirmar.disabled=!novoStatus||!senhaInput.value;
 }));
 senhaInput.addEventListener('input',()=>{confirmar.disabled=!novoStatus||!senhaInput.value;});
 confirmar.addEventListener('click',()=>confirmarAlteracaoStatus(id,campo,novoStatus,senhaInput.value));
 senhaInput.focus();
}

function fecharModal(){
 modalStatus.style.display='none';
 modalStatus.setAttribute('aria-hidden','true');
 modalStatus.innerHTML='';
}

async function confirmarAlteracaoStatus(id,campo,novoStatus,senha){
 const erro=modalStatus.querySelector('#erroStatus');
 const confirmar=modalStatus.querySelector('#confirmarStatus');
 confirmar.disabled=true;
 erro.hidden=true;
 try{
   const {data:{user},error:userError}=await db.auth.getUser();
   if(userError||!user)throw new Error('Usuário não autenticado.');
   const login=await db.auth.signInWithPassword({email:user.email,password:senha});
   if(login.error)throw new Error('Senha inválida.');
   const {error:updateError}=await db.from('pedidos').update({[campo]:novoStatus}).eq('id',id);
   if(updateError)throw updateError;
   fecharModal();
   await pesquisarPedidos();
 }catch(e){
   console.error('Erro ao alterar status:',e);
   erro.textContent=e.message==='Senha inválida.'?'Senha inválida.':`Não foi possível alterar o status: ${e.message}`;
   erro.hidden=false;
   confirmar.disabled=false;
 }
}

function abrirDetalhesPedido(id){
 const existente=document.getElementById('detalhe-'+id);
 if(existente){existente.remove();const botao=document.querySelector(`button[data-detalhes="${id}"]`);if(botao)botao.textContent='+';return;}
 const linha=document.querySelector(`tr[data-id="${id}"]`);
 if(!linha)return;
 const tr=document.createElement('tr');tr.id='detalhe-'+id;
 tr.innerHTML='<td colspan="8"><div class="detalhes-pedido carregando">Carregando detalhes...</div></td>';
 linha.after(tr);
 const botao=linha.querySelector(`button[data-detalhes="${id}"]`);if(botao)botao.textContent='−';
 carregarDetalhes(id,tr);
}

async function carregarDetalhes(id,tr){
 const {data,error}=await db.from('pedidos').select('*,clientes(*),pedido_itens(*)').eq('id',id).single();
 const box=tr.querySelector('.detalhes-pedido');
 if(error){box.innerHTML='<div class="erro-modal">Não foi possível carregar os detalhes do pedido.</div>';console.error(error);return;}
 const itens=data.pedido_itens||[];
 box.classList.remove('carregando');
 box.innerHTML=`
 <div class="detalhes-topo"><div><span class="modal-kicker">DETALHES</span><h3>Pedido #${escapar(data.numero_pedido)}</h3></div><div class="detalhes-total">${formatarBRL(data.valor_total)}</div></div>
 <div class="detalhes-grid">
  <section class="detalhe-card"><h4>Cliente</h4><p><strong>${escapar(data.clientes?.nome)}</strong></p><p>CPF/CNPJ: ${escapar(data.clientes?.cpf_cnpj)}</p><p>Telefone: ${escapar(data.clientes?.telefone)}</p><p>E-mail: ${escapar(data.clientes?.email)}</p></section>
  <section class="detalhe-card"><h4>Entrega</h4><p>${escapar(data.endereco)}</p><p>Referência: ${escapar(data.referencia)}</p><p>Previsão: ${escapar(data.previsao_entrega)}</p><p>Status: <span class="${classeStatus(data.status_entrega,'entrega')}">${escapar(data.status_entrega)}</span></p></section>
  <section class="detalhe-card"><h4>Financeiro</h4><p>Forma de pagamento: ${escapar(data.forma_pagamento)}</p><p>Frete: ${formatarBRL(data.frete)}</p><p>Total: <strong>${formatarBRL(data.valor_total)}</strong></p><p>Status: <span class="${classeStatus(data.status_financeiro,'financeiro')}">${escapar(data.status_financeiro)}</span></p></section>
  <section class="detalhe-card detalhe-produtos"><h4>Produtos</h4>${itens.length?itens.map(i=>`<div class="produto-linha"><span>${escapar(i.produto)}</span><span>Qtd. ${escapar(i.quantidade)} · ${formatarBRL(i.valor_unitario)}</span></div>`).join(''):'<p>Nenhum item encontrado.</p>'}</section>
 </div>
 <section class="detalhe-card detalhe-observacoes"><h4>Observações</h4><p>${escapar(data.observacoes)||'Nenhuma observação.'}</p></section>`;
}

async function pesquisarPedidos(){
 const numero=document.getElementById('buscaPedido')?.value.trim()||'';
 const cliente=document.getElementById('buscaCliente')?.value.trim()||'';
 const vendedor=document.getElementById('filtroVendedor')?.value||'';
 const entrega=document.getElementById('filtroEntrega')?.value||'';
 const financeiro=document.getElementById('filtroFinanceiro')?.value||'';
 const inicio=document.getElementById('dataInicial')?.value||'';
 const fim=document.getElementById('dataFinal')?.value||'';
 let q=db.from('pedidos').select('id,numero_pedido,valor_total,status_entrega,status_financeiro,created_at,cliente_id,user_id,clientes(nome,cpf_cnpj),users(nome)');
 if(numero)q=q.eq('numero_pedido',numero);
 if(cliente)q=q.or(`nome.ilike.%${cliente}%,cpf_cnpj.ilike.%${cliente}%`,{referencedTable:'clientes'});
 if(vendedor)q=q.eq('user_id',vendedor);
 if(entrega)q=q.eq('status_entrega',entrega);
 if(financeiro)q=q.eq('status_financeiro',financeiro);
 if(inicio)q=q.gte('created_at',inicio+'T00:00:00');
 if(fim)q=q.lte('created_at',fim+'T23:59:59');
 const {data,error}=await q.order('created_at',{ascending:false});
 if(error){console.error('Erro na pesquisa:',error);tabelaPedidos.innerHTML='<tr><td colspan="8" class="erro-tabela">Não foi possível consultar os pedidos.</td></tr>';return;}
 tabelaPedidos.innerHTML='';
 (data||[]).forEach(p=>{
   const tr=document.createElement('tr');tr.dataset.id=p.id;
   tr.innerHTML=`<td>${escapar(p.numero_pedido)}</td><td>${escapar(p.clientes?.nome)}</td><td>${escapar(p.users?.nome)}</td><td>${formatarBRL(p.valor_total)}</td><td><span class="${classeStatus(p.status_entrega,'entrega')}">${escapar(p.status_entrega)}</span></td><td><span class="${classeStatus(p.status_financeiro,'financeiro')}">${escapar(p.status_financeiro)}</span></td><td>${new Date(p.created_at).toLocaleDateString('pt-BR')}</td><td class="celula-acoes"><button type="button" class="acao acao-status-entrega" data-status-campo="status_entrega" data-id="${p.id}">Entrega</button><button type="button" class="acao acao-status-financeiro" data-status-campo="status_financeiro" data-id="${p.id}">Financeiro</button><button type="button" class="acao acao-detalhes" data-detalhes="${p.id}" aria-label="Mostrar detalhes">+</button></td>`;
   tabelaPedidos.appendChild(tr);
 });
}

function limparFiltros(){
 document.querySelectorAll('.filtros input,.filtros select').forEach(x=>x.value='');
 tabelaPedidos.innerHTML='';
}

tabelaPedidos.addEventListener('click',e=>{
 const btn=e.target.closest('button');
 if(!btn)return;
 const id=btn.dataset.id||btn.dataset.detalhes;
 if(btn.dataset.statusCampo){
   const linha=btn.closest('tr');
   const coluna=btn.dataset.statusCampo==='status_entrega'?5:6;
   const atual=linha?.cells[coluna]?.querySelector('.status-badge')?.textContent.trim()||'';
   mostrarModalStatus(id,btn.dataset.statusCampo,atual);
 }
 if(btn.dataset.detalhes)abrirDetalhesPedido(btn.dataset.detalhes);
});

modalStatus.addEventListener('click',e=>{if(e.target===modalStatus||e.target.closest('[data-modal-fechar]'))fecharModal();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modalStatus.getAttribute('aria-hidden')==='false')fecharModal();});
botaoPesquisar?.addEventListener('click',pesquisarPedidos);
botaoLimpar?.addEventListener('click',limparFiltros);
window.pesquisarPedidos=pesquisarPedidos;