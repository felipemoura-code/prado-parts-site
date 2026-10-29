'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {transition,fromSite,MENU,SERVICES}=require('../flow');
let seq=0;const msg=(text,type='text',extras={})=>({from:'5519983691948',messageId:'test-'+(++seq),type,text,...extras});
const run=(state,text,type='text',extras={})=>transition(state,msg(text,type,extras));

test('cinco serviços elétricos, sem solda e sem ar-condicionado ativo',()=>{
 assert.equal(SERVICES.length,5);
 assert.equal(SERVICES.some(x=>/solda|condicionado/i.test(x)),false);
 assert.match(MENU,/ventiladores/);
 assert.doesNotMatch(MENU,/solda|condicionado/i);
});
test('saudação abre menu, segue serviço, nome, localização, endereço, descrição e finaliza',()=>{
 let a=run(undefined,'Oi');assert.equal(a.state.step,'menu');assert.match(a.reply,/Adriano Soluções/);
 a=run(a.state,'1');assert.equal(a.state.service,'Instalação de ventiladores');assert.equal(a.state.step,'name');
 a=run(a.state,'Cliente Teste');assert.equal(a.state.step,'location');
 a=run(a.state,'Sumaré, Jardim Maria Antônia');assert.equal(a.state.step,'address');
 a=run(a.state,'Rua Exemplo, 123');assert.equal(a.state.step,'details');assert.match(a.state.mapsUrl,/google.com\/maps/);
 a=run(a.state,'Instalar ventilador de teto');assert.equal(a.state.step,'photo');
 a=run(a.state,'finalizar');assert.equal(a.state.step,'done');assert.equal(a.lead.name,'Cliente Teste');assert.equal(a.lead.address,'Rua Exemplo, 123');assert.match(a.lead.mapsUrl,/Rua%20Exemplo/);
});
test('endereço é opcional, sem rota quando o cliente escolhe pular',()=>{
 let a=run(undefined,'2');a=run(a.state,'Maria Lima');a=run(a.state,'Campinas centro');
 a=run(a.state,'pular');assert.equal(a.state.step,'details');assert.equal(a.state.mapsUrl,'');
 a=run(a.state,'Troca de chuveiro');a=run(a.state,'finalizar');
 assert.equal(a.lead.address,'');assert.equal(a.lead.mapsUrl,'');
});
test('pin de localização gera rota; coordenadas inválidas são rejeitadas',()=>{
 let a=run(undefined,'3');a=run(a.state,'Cliente Teste');a=run(a.state,'Campinas SP');
 const bad=run(a.state,'','location',{latitude:91,longitude:-47});assert.equal(bad.state.step,'address');
 a=run(a.state,'','location',{latitude:-22.9,longitude:-47.1});assert.equal(a.state.step,'details');
 assert.match(a.state.mapsUrl,/-22.9%2C-47.1/);
});
test('recebe foto no último passo e registra id de mídia',()=>{
 let a=run(undefined,'4');a=run(a.state,'Cliente Teste');a=run(a.state,'Sumaré SP');
 a=run(a.state,'pular');a=run(a.state,'Trocar interruptores paralelos');
 a=run(a.state,'','image',{mediaId:'img_test_1'});assert.equal(a.lead.photoMediaId,'img_test_1');
});
test('o formulário do site não repete perguntas nem admite solda',()=>{
 const site='Olá, Adriano! Vim pelo site e gostaria de solicitar um orçamento.\n\nNome: Carlos\nServiço: Elétrica em geral\nCidade e bairro: Sumaré\nDetalhes: Instalar luminárias no corredor\nEndereço: Rua A, 123\n\nAguardo seu retorno.';
 const a=run(undefined,site);assert.ok(a.lead);assert.equal(a.lead.source,'site');assert.equal(a.state.mode,'human');
 assert.match(a.lead.mapsUrl,/google.com\/maps/);
 assert.equal(fromSite(site.replace('Elétrica em geral','Solda'),msg(site)),null);
});
test('ar-condicionado em breve não abre pedido',()=>{
 const a=run(undefined,'Quero instalação de ar condicionado');
 assert.match(a.reply,/em breve/i);assert.equal(a.state.step,'menu');assert.equal(a.lead,undefined);
});
test('atendente é contato direto, não transferência fictícia',()=>{
 const a=run(undefined,'6');assert.equal(a.state.mode,'human');
 assert.match(a.reply,/wa\.me\/5519981595823/);
 assert.doesNotMatch(a.reply,/encaminh/);
 const b=run(a.state,'menu');assert.equal(b.state.mode,'bot');
});
test('sessão vencida reinicia após 24 horas',()=>{
 const a=run({step:'name',mode:'bot',service:'Tomadas',updatedAt:Date.now()-25*60*60*1000},'Oi');
 assert.equal(a.state.step,'menu');
});
test('menu e cancelar reiniciam sem perder operação',()=>{
 let a=run(undefined,'1');a=run(a.state,'cancelar');
 assert.equal(a.state.step,'menu');assert.match(a.reply,/Como podemos ajudar/);
});
test('HTTP health é somente diagnóstico; não expõe credenciais nem pedidos',async()=>{
 const {srv}=require('../server');
 await new Promise(resolve=>srv.listen(0,'127.0.0.1',resolve));
 try{
  const base='http://127.0.0.1:'+srv.address().port;
  const health=await fetch(base+'/health');assert.equal(health.status,200);
  const state=await health.json();assert.equal(state.botActive,false);assert.equal(state.twilioSandbox.enabled,false);
  assert.equal(JSON.stringify(state).includes('TWILIO_AUTH_TOKEN'),false);
  const leads=await fetch(base+'/api/leads');assert.equal(leads.status,401);
  const inbound=await fetch(base+'/twilio-sandbox',{method:'POST'});assert.equal(inbound.status,503);
  const meta=await fetch(base+'/webhook',{method:'POST'});assert.equal(meta.status,200);
 }finally{await new Promise(resolve=>srv.close(resolve));}
});
