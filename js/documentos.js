const dbDocumentos = db;

function formatarBRLDocumento(v){return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});}
function formatarDataBRDocumento(d){if(!d)return '';const [a,m,di]=String(d).split('-');return `${di}/${m}/${a}`;}
function textoDocumento(v){return String(v??'');}

async function buscarDadosDocumento(idPedido){
 const {data:pedido,error}=await dbDocumentos.from('pedidos').select('*').eq('id',idPedido).single();
 if(error)throw error;
 const {data:itens,error:errorItens}=await dbDocumentos.from('pedido_itens').select('*').eq('pedido_id',idPedido);
 if(errorItens)throw errorItens;
 const {data:cliente,error:errorCliente}=await dbDocumentos.from('clientes').select('*').eq('id',pedido.cliente_id).single();
 if(errorCliente)throw errorCliente;
 return {pedido,itens:itens||[],cliente};
}

function criarDocumentoVisual(pedido,itens,cliente,tituloDocumento){
 const {jsPDF}=window.jspdf;
 const doc=new jsPDF();
 const margem=18;
 const direita=192;
 let y=18;
 const corTexto=[55,55,55];
 const corCinza=[105,105,105];
 const corLinha=[220,220,220];
 const formatarCampo=(label,valor,x,yPos)=>{
   doc.setFont('helvetica','bold');doc.setFontSize(9.5);doc.setTextColor(...corTexto);doc.text(label,x,yPos);
   const largura=doc.getTextWidth(label);
   doc.setFont('helvetica','normal');doc.text(textoDocumento(valor)||'—',x+largura+3,yPos);
 };
 const secao=t=>{doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(...corCinza);doc.text(t,margem,y);y+=7;};
 const linha=(espaco=8)=>{doc.setDrawColor(...corLinha);doc.setLineWidth(.25);doc.line(margem,y,direita,y);y+=espaco;};

 doc.setFont('helvetica','bold');doc.setFontSize(21);doc.setTextColor(50,50,50);doc.text('DECORALAR',margem,y);
 doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(145,145,145);doc.text(tituloDocumento,direita,y-5,{align:'right'});
 doc.setFont('helvetica','bold');doc.setFontSize(10);doc.setTextColor(55,55,55);doc.text(`Nº ${pedido.numero_pedido}`,direita,y+3,{align:'right'});
 y+=11;doc.setDrawColor(55,55,55);doc.setLineWidth(.55);doc.line(margem,y,direita,y);y+=12;

 secao('DADOS DO CLIENTE');
 doc.setFont('helvetica','bold');doc.setFontSize(12);doc.setTextColor(55,55,55);doc.text(cliente?.nome||'—',margem,y);y+=7;
 formatarCampo('CPF/CNPJ:',cliente?.cpf_cnpj||pedido.cliente_cpf_cnpj||'',margem,y);
 formatarCampo('Telefone:',cliente?.telefone||'',105,y);y+=6;
 formatarCampo('E-mail:',cliente?.email||'',margem,y);y+=11;

 secao('DADOS DE ENTREGA');
 const e=(pedido.endereco||'').split(',').map(x=>x.trim());
 formatarCampo('Endereço:',`${e[1]||''}   Nº ${e[2]||''}`,margem,y);y+=6;
 formatarCampo('Bairro:',e[3]||'',margem,y);y+=6;
 formatarCampo('CEP:',e[0]||'',margem,y);y+=6;
 formatarCampo('Cidade:',e[4]||'',margem,y);y+=6;
 formatarCampo('Referência:',pedido.referencia||'',margem,y);y+=6;
 formatarCampo('Observações:',pedido.observacoes||'',margem,y);y+=8;
 formatarCampo('Previsão de entrega:',formatarDataBRDocumento(pedido.previsao_entrega)||'—',margem,y);y+=13;

 secao('ITENS DO PEDIDO');
 doc.setFillColor(247,247,247);doc.rect(margem,y-4,direita-margem,8,'F');
 doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(...corCinza);doc.text('DESCRIÇÃO',margem+3,y+1);doc.text('QTD',150,y+1);doc.text('VALOR UNIT.',direita-3,y+1,{align:'right'});y+=9;
 itens.forEach((i,idx)=>{
   doc.setFont('helvetica','normal');doc.setFontSize(9.5);doc.setTextColor(55,55,55);
   const l=doc.splitTextToSize(textoDocumento(i.produto),120);
   doc.text(l,margem+3,y);doc.text(String(i.quantidade),150,y);doc.text(formatarBRLDocumento(i.valor_unitario),direita-3,y,{align:'right'});
   y+=(l.length*5)+6;
   if(idx<itens.length-1){doc.setDrawColor(232,232,232);doc.setLineWidth(.2);doc.line(margem,y-3,direita,y-3);}
 });
 y+=2;linha(8);
 return {doc,margem,direita,getY:()=>y,secao,linha};
}

async function gerarPedidoVendaPainel(idPedido){
 const {pedido,itens,cliente}=await buscarDadosDocumento(idPedido);
 const base=criarDocumentoVisual(pedido,itens,cliente,'PEDIDO DE VENDA');
 const {doc,margem,direita}=base;
 let y=base.getY();
 base.secao('RESUMO');
 doc.setFont('helvetica','bold');doc.setFontSize(9.5);doc.setTextColor(55,55,55);doc.text('Forma de pagamento:',margem,y);
 const xForma=margem+doc.getTextWidth('Forma de pagamento:');
 doc.setFont('helvetica','normal');doc.text(pedido.forma_pagamento||'—',xForma+3,y);
 doc.text('Frete',125,y);doc.text(formatarBRLDocumento(Math.abs(Number(pedido.frete||0))),direita,y,{align:'right'});y+=7;
 doc.text('Desconto',125,y);doc.text(formatarBRLDocumento(Math.abs(Number(pedido.desconto||0))),direita,y,{align:'right'});y+=13;
 doc.setFillColor(70,70,70);doc.roundedRect(108,y-5,direita-108,18,2,2,'F');
 doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(255,255,255);doc.text('TOTAL DO PEDIDO',114,y+2);
 doc.setFontSize(13);doc.text(formatarBRLDocumento(pedido.valor_total||0),direita-5,y+2,{align:'right'});y+=25;
 doc.setFont('helvetica','normal');doc.setFontSize(7.5);doc.setTextColor(155,155,155);doc.text('Pedido de venda • Decoralar',105,y,{align:'center'});
 doc.save(`Pedido_Venda_${pedido.numero_pedido}.pdf`);
}

async function gerarDocumentoEntregaPainel(idPedido){
 const {pedido,itens,cliente}=await buscarDadosDocumento(idPedido);
 const base=criarDocumentoVisual(pedido,itens,cliente,'DOCUMENTO DE ENTREGA');
 const {doc,margem}=base;
 let y=base.getY();

 base.secao('CONFERÊNCIA NO RECEBIMENTO');
 doc.setFont('helvetica','normal');doc.setFontSize(9.5);doc.setTextColor(70,70,70);
 const conferencia='Declaro que os produtos relacionados acima foram conferidos no momento do recebimento, estando de acordo com o pedido e em condições aparentes de conformidade.';
 const linhasConferencia=doc.splitTextToSize(conferencia,170);
 doc.text(linhasConferencia,margem,y);
 y+=(linhasConferencia.length*5)+11;

 base.secao('DECLARAÇÃO DE RECEBIMENTO');
 doc.setFont('helvetica','normal');doc.setFontSize(9.5);doc.setTextColor(70,70,70);
 const recebimento='Declaro que recebi os produtos relacionados neste documento de entrega, conforme especificações descritas acima.';
 const linhasRecebimento=doc.splitTextToSize(recebimento,170);
 doc.text(linhasRecebimento,margem,y);
 y+=(linhasRecebimento.length*5)+13;

 doc.setDrawColor(180,180,180);doc.setLineWidth(.3);doc.line(30,y,95,y);doc.line(115,y,180,y);y+=6;
 doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.setTextColor(90,90,90);doc.text('Assinatura do cliente',62.5,y,{align:'center'});doc.text('Assinatura do entregador',147.5,y,{align:'center'});y+=11;
 doc.setFont('helvetica','bold');doc.setFontSize(9.5);doc.setTextColor(55,55,55);doc.text('Data do recebimento:',margem,y);
 doc.setFont('helvetica','normal');doc.text('____/____/________',margem+38,y);y+=18;
 doc.setFont('helvetica','normal');doc.setFontSize(7.5);doc.setTextColor(155,155,155);doc.text('Documento de entrega • Decoralar',105,y,{align:'center'});
 doc.save(`Documento_Entrega_${pedido.numero_pedido}.pdf`);
}

window.gerarPedidoVendaPainel=gerarPedidoVendaPainel;
window.gerarDocumentoEntregaPainel=gerarDocumentoEntregaPainel;
