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

function montarBasePDF(tituloDocumento,pedido,itens,cliente){
 const {jsPDF}=window.jspdf;
 const doc=new jsPDF();
 const margem=15;
 let y=15;
 const titulo=t=>{doc.setFont('helvetica','bold');doc.setFontSize(11);doc.text(t,margem,y);y+=7;};
 const campo=(label,valor)=>{doc.setFont('helvetica','bold');doc.text(label,margem,y);const x=margem+doc.getTextWidth(label);doc.setFont('helvetica','normal');doc.text(textoDocumento(valor),x,y);y+=6;};
 const linha=()=>{doc.line(margem,y,195,y);y+=8;};
 doc.setFont('helvetica','bold');doc.setFontSize(18);doc.text('DECORALAR',margem,y);
 doc.setFontSize(15);doc.text(tituloDocumento,195,y,{align:'right'});y+=10;
 doc.setFontSize(11);doc.text(`Pedido Nº ${pedido.numero_pedido}`,margem,y);y+=8;linha();
 titulo('CLIENTE');doc.setFont('helvetica','normal');doc.setFontSize(10);
 campo('Nome: ',cliente?.nome||'');
 campo('CPF/CNPJ: ',cliente?.cpf_cnpj||pedido.cliente_cpf_cnpj||'');
 campo('Telefone: ',cliente?.telefone||'');
 campo('Email: ',cliente?.email||'');
 y+=4;
 titulo('ENDEREÇO DE ENTREGA');
 const e=(pedido.endereco||'').split(',').map(x=>x.trim());
 campo('Rua: ',`${e[1]||''}   Nº: ${e[2]||''}`);
 campo('Bairro: ',e[3]||'');
 campo('CEP: ',e[0]||'');
 campo('Cidade: ',e[4]||'');
 campo('Referência: ',pedido.referencia||'');
 doc.setFont('helvetica','bold');doc.text('Observações de entrega:',margem,y);y+=5;
 doc.setFont('helvetica','normal');const obsEntrega=doc.splitTextToSize(pedido.observacoes||'',170);doc.text(obsEntrega,margem,y);y+=(obsEntrega.length*4)+5;
 doc.setFont('helvetica','bold');doc.text('Previsão de entrega: ',margem,y);const xPrev=margem+doc.getTextWidth('Previsão de entrega: ');doc.setFont('helvetica','normal');doc.text(formatarDataBRDocumento(pedido.previsao_entrega),xPrev,y);y+=10;
 titulo('PRODUTOS');doc.setFont('helvetica','bold');doc.setFontSize(10);doc.text('Produto',margem,y);doc.text('Qtd',150,y);doc.text('Valor',170,y);y+=6;linha();
 itens.forEach(i=>{doc.setFont('helvetica','bold');const l=doc.splitTextToSize(i.produto,120);doc.text(l,margem,y);doc.setFont('helvetica','normal');doc.text(String(i.quantidade),150,y);doc.text(formatarBRLDocumento(i.valor_unitario),170,y);y+=(l.length*5)+5;});
 linha();titulo('RESUMO FINANCEIRO');campo('Forma de pagamento: ',pedido.forma_pagamento||'');campo('Frete: ',formatarBRLDocumento(Math.abs(Number(pedido.frete||0))));campo('Desconto: ',formatarBRLDocumento(Math.abs(Number(pedido.desconto||0))));
 doc.setFont('helvetica','bold');doc.setFontSize(14);doc.text(`TOTAL DO PEDIDO: ${formatarBRLDocumento(pedido.valor_total||0)}`,margem,y);y+=12;
 return {doc,margem,getY:()=>y};
}

async function gerarPedidoVendaPainel(idPedido){
 const {pedido,itens,cliente}=await buscarDadosDocumento(idPedido);
 const base=montarBasePDF('PEDIDO DE VENDA',pedido,itens,cliente);
 base.doc.setFontSize(8);base.doc.setFont('helvetica','normal');base.doc.text('Documento de pedido de venda - Decoralar',105,base.getY(),{align:'center'});
 base.doc.save(`Pedido_Venda_${pedido.numero_pedido}.pdf`);
}

async function gerarDocumentoEntregaPainel(idPedido){
 const {pedido,itens,cliente}=await buscarDadosDocumento(idPedido);
 const base=montarBasePDF('DOCUMENTO DE ENTREGA',pedido,itens,cliente);
 let y=base.getY();
 const doc=base.doc;
 const margem=base.margem;
 const titulo=t=>{doc.setFont('helvetica','bold');doc.setFontSize(11);doc.text(t,margem,y);y+=7;};
 titulo('DECLARAÇÃO DE RECEBIMENTO');
 doc.setFont('helvetica','normal');doc.setFontSize(9);
 const info=['Declaro que recebi os produtos relacionados neste documento de entrega, conforme especificações descritas acima.','Declaro que os produtos foram conferidos no momento do recebimento, não sendo constatadas avarias aparentes.'];
 info.forEach(t=>{const l=doc.splitTextToSize('• '+t,170);doc.text(l,margem,y);y+=(l.length*4)+3;});
 y+=10;doc.line(30,y,180,y);y+=7;doc.setFontSize(10);doc.text('Assinatura do Cliente',105,y,{align:'center'});y+=10;doc.setFontSize(10);doc.setFont('helvetica','bold');doc.text('Data do recebimento: ',margem,y);const xData=margem+doc.getTextWidth('Data do recebimento: ');doc.setFont('helvetica','normal');doc.text('____/____/________',xData,y);y+=12;doc.setFontSize(8);doc.text('Documento de entrega - Decoralar',105,y,{align:'center'});
 doc.save(`Documento_Entrega_${pedido.numero_pedido}.pdf`);
}

window.gerarPedidoVendaPainel=gerarPedidoVendaPainel;
window.gerarDocumentoEntregaPainel=gerarDocumentoEntregaPainel;
