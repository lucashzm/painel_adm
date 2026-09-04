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
 if(r.error){alert('Senha inválida');return false;}
 return true;
}

async function atualizarStatus(id,campo,valor){
 if(!await confirmarAlteracao())return;
 const {error}=await db.from('pedidos').update({[campo]:valor}).eq('id',id);
 if(error)return alert('Erro ao atualizar');
 fecharModal();pesquisarPedidos();
}

function abrirModalStatus(id,campo,atual,opcoes){
 const m=document.getElementById('modalStatus');
 m.innerHTML=`<div class="modal-conteudo"><h3>Alterar ${campo==='status_entrega'?'Entrega':'Financeiro'}</h3><p>Status atual: <b>${atual}</b></p>${opcoes.map(o=>`<button class="acao" onclick="atualizarStatus('${id}','${campo}','${o}')">${o}</button>`).join('')}<button onclick="fecharModal()">Cancelar</button></div>`;
 m.style.display='flex';
}
function fecharModal(){document.getElementById('modalStatus').style.display='none';}

async function abrirDetalhesPedido(id){
 const {data,error}=await db.from('pedidos').select('*,clientes(*),pedido_itens(*)').eq('id',id).single();
 if(error)return console.error(error);
 const existente=document.getElementById('detalhe-'+id);
 if(existente){existente.remove();return;}
 const tr=document.createElement('tr');tr.id='detalhe-'+id;
 tr.innerHTML=`<td colspan="8"><div class="detalhes-pedido"><h3>Pedido ${data.numero_pedido}</h3><h4>Cliente</h4>${data.clientes?.nome||''}<br>${data.clientes?.cpf_cnpj||''}<br>${data.clientes?.telefone||''}<h4>Entrega</h4>${data.endereco||''}<br>Previsão: ${data.previsao_entrega||''}<br>Status: ${data.status_entrega||''}<h4>Financeiro</h4>Total: ${formatarBRL(data.valor_total)}<br>${data.forma_pagamento||''}<br>Status: ${data.status_financeiro||''}<h4>Produtos</h4>${(data.pedido_itens||[]).map(i=>`${i.produto} - Qtd ${i.quantidade} - ${formatarBRL(i.valor_unitario)}`).join('<br>')}<h4>Observações</h4>${data.observacoes||''}</div></td>`;
 document.querySelector(`tr[data-id="${id}"]`).after(tr);
}

function badge(v){return `<span class="status-badge">${v||''}</span>`;}

async function pesquisarPedidos(){
 const numero=document.getElementById('buscaPedido')?.value.trim()||'';
 let q=db.from('pedidos').select('id,numero_pedido,valor_total,status_entrega,status_financeiro,created_at,clientes(nome),users(nome)');
 if(numero)q=q.eq('numero_pedido',numero);
 const {data,error}=await q.order('created_at',{ascending:false});
 if(error)return console.error(error);
 tabelaPedidos.innerHTML='';
 data.forEach(p=>{
 const tr=document.createElement('tr');tr.dataset.id=p.id;
 tr.innerHTML=`<td>${p.numero_pedido}</td><td>${p.clientes?.nome||''}</td><td>${p.users?.nome||''}</td><td>${formatarBRL(p.valor_total)}</td><td>${badge(p.status_entrega)}</td><td>${badge(p.status_financeiro)}</td><td>${new Date(p.created_at).toLocaleDateString('pt-BR')}</td><td><button class="acao" onclick="abrirModalStatus('${p.id}','status_entrega','${p.status_entrega||''}',${JSON.stringify(['Pendente','Reservado','Aguardando entrega','Concluído'])})">Entrega</button><button class="acao" onclick="abrirModalStatus('${p.id}','status_financeiro','${p.status_financeiro||''}',${JSON.stringify(['Pendente','Pagamento na entrega','Pago'])})">Financeiro</button><button class="acao detalhes" onclick="abrirDetalhesPedido('${p.id}')">+</button></td>`;
 tabelaPedidos.appendChild(tr);
 });
}
function limparFiltros(){location.reload();}
window.abrirModalStatus=abrirModalStatus;window.fecharModal=fecharModal;window.atualizarStatus=atualizarStatus;window.abrirDetalhesPedido=abrirDetalhesPedido;window.pesquisarPedidos=pesquisarPedidos;
if(!document.getElementById('modalStatus')){let d=document.createElement('div');d.id='modalStatus';d.style.cssText='display:none;position:fixed;inset:0;background:#0008;align-items:center;justify-content:center';document.body.appendChild(d);}
botaoPesquisar?.addEventListener('click',pesquisarPedidos);botaoLimpar?.addEventListener('click',limparFiltros);