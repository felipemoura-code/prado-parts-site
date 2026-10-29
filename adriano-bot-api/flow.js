'use strict';
const SERVICES=['Instalação de ventiladores','Instalação de chuveiro','Colocação de tomadas','Ligações em paralelo','Elétrica em geral'];
const MENU='⚡ *Adriano Soluções*\nServiços elétricos residenciais.\n\nComo podemos ajudar?\n\n1. Instalação de ventiladores\n2. Instalação de chuveiro\n3. Colocação de tomadas\n4. Ligações em paralelo\n5. Elétrica em geral\n6. Falar diretamente com Adriano\n\nResponda com o número. Digite *menu* para recomeçar.';
const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const clean=(s,max=220)=>String(s||'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max);
const initial=()=>({step:'menu',mode:'bot',service:'',name:'',location:'',address:'',mapsUrl:'',details:'',photoId:null,updatedAt:Date.now()});
const maps=(address,city='')=>'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent([address,city,'Brasil'].filter(Boolean).join(', '))+'&travelmode=driving&dir_action=navigate';
function selected(t){const n=norm(t);if(/^[1-5]$/.test(n))return SERVICES[Number(n)-1];if(n.includes('ventilador'))return SERVICES[0];if(n.includes('chuveiro'))return SERVICES[1];if(n.includes('tomada'))return SERVICES[2];if(n.includes('paralelo'))return SERVICES[3];if(n.includes('eletric'))return SERVICES[4];return null;}
function fromSite(raw,msg){
 if(!/^Ol[aá], Adriano! Vim pelo site e gostaria de solicitar um or[cç]amento\./i.test(raw))return null;
 const field=(name,max)=>{const line=raw.split(/\r?\n/).find(s=>s.toLowerCase().startsWith(name.toLowerCase()+':'));return line?clean(line.slice(name.length+1),max):'';};
 const name=field('Nome',70),service=field('Serviço',90),location=field('Cidade e bairro',140),details=field('Detalhes',800);
 if(name.length<2||(!SERVICES.includes(service)&&service!=='Outro assunto')||location.length<3||details.length<5)return null;
 let address=field('Endereço',220);if(norm(address)==='a combinar')address='';
 return {id:msg.messageId,from:msg.from,createdAt:new Date().toISOString(),source:'site',name,service,location,details,address,mapsUrl:address?maps(address,location):'',photoMediaId:null};
}
function transition(previous,msg){
 const old=previous&&Date.now()-Number(previous.updatedAt||0)>24*60*60*1000?null:previous;
 const state={...initial(),...old,updatedAt:Date.now()},raw=String(msg.text||'').trim(),t=norm(raw);
 const isImg=msg.type==='image',isPin=msg.type==='location';
 if(['menu','inicio','reiniciar','0','cancelar'].includes(t))return {state:initial(),reply:MENU};
 if(t.includes('ar condicionado')||t.includes('ar-condicionado'))return {state,reply:'❄️ A instalação de ar-condicionado está *em breve*. Ainda não aceitamos pedidos desse serviço.\n\nPara serviços elétricos disponíveis, digite *menu*.'};
 if(state.mode==='human')return {state,reply:null};
 if(state.step==='menu'||state.step==='done'){
  if(msg.type==='text'){const lead=fromSite(raw,msg);if(lead)return {state:{...state,mode:'human',step:'human'},lead,reply:'✅ *Pedido recebido!* Obrigado, '+lead.name+'. Seu pedido de *'+lead.service+'* já está registrado. Os dados foram registrados para consulta no painel. Para conversar com Adriano, abra https://wa.me/5519981595823 . Digite *menu* para um novo atendimento.'};}
  if(t==='6'||/atendente|humano|falar com (o )?adriano/.test(t))return {state:{...state,mode:'human',step:'human'},reply:'O atendimento automático foi pausado. Para falar com Adriano, abra https://wa.me/5519981595823 . Digite *menu* para recomeçar.'};
  const svc=selected(t);return svc?{state:{...initial(),step:'name',service:svc},reply:'Você escolheu *'+svc+'*. Qual é seu nome?'}:{state:initial(),reply:MENU};
 }
 if(state.step==='name'){const name=clean(raw,70);return isImg||isPin||name.length<2?{state,reply:'Informe seu nome por texto, por favor.'}:{state:{...state,step:'location',name},reply:'Obrigado, '+name+'! Qual é a cidade e o bairro do serviço?'};}
 if(state.step==='location'){const location=clean(raw,140);return isImg||isPin||location.length<3?{state,reply:'Informe cidade e bairro por texto, por favor.'}:{state:{...state,step:'address',location},reply:'Qual é o endereço do serviço? Envie rua, número e bairro, compartilhe a localização ou digite *pular*.'};}
 if(state.step==='address'){
  if(isPin){const lat=Number(msg.latitude),lon=Number(msg.longitude);if(msg.latitude==null||msg.longitude==null||!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return {state,reply:'Localização inválida. Envie novamente ou digite pular.'};const link=maps(lat+','+lon);return {state:{...state,step:'details',address:'Localização compartilhada',mapsUrl:link},reply:'📍 Localização recebida. Rota: '+link+'\n\nAgora descreva o serviço.'};}
  if(isImg)return {state,reply:'Envie o endereço em texto, a localização ou digite pular.'};
  if(['pular','depois','mais tarde','nao'].includes(t))return {state:{...state,step:'details',address:'',mapsUrl:''},reply:'Combinado. Agora descreva o serviço.'};
  const address=clean(raw,220);if(address.length<8)return {state,reply:'Envie um endereço mais completo ou digite pular.'};
  const link=maps(address,state.location);return {state:{...state,step:'details',address,mapsUrl:link},reply:'📍 Endereço recebido. Rota: '+link+'\n\nAgora descreva o serviço.'};
 }
 if(state.step==='details'){const details=clean(raw,800);return isImg||isPin||details.length<5?{state,reply:'Descreva um pouco mais o serviço em texto.'}:{state:{...state,step:'photo',details},reply:'Se quiser, envie uma foto do local ou equipamento. Caso contrário, digite *finalizar*.'};}
 if(state.step==='photo'){
  if(isImg&&!msg.mediaId)return {state,reply:'A imagem não chegou. Envie novamente ou digite finalizar.'};
  if(!isImg&&!['finalizar','concluir','pular','nao','sem foto'].includes(t))return {state,reply:'Envie uma foto ou digite finalizar.'};
  const lead={id:msg.messageId,from:msg.from,createdAt:new Date().toISOString(),source:'whatsapp',name:state.name,service:state.service,location:state.location,address:state.address,mapsUrl:state.mapsUrl,details:state.details,photoMediaId:isImg?msg.mediaId:null};
  return {state:{...state,step:'done'},lead,reply:'✅ *Solicitação registrada!*\nServiço: '+lead.service+'\nCidade/bairro: '+lead.location+'\n'+(lead.mapsUrl?'📍 Rota: '+lead.mapsUrl+'\n':'')+'O pedido foi salvo para consulta. Para falar com Adriano: https://wa.me/5519981595823 . Preço, horário e visita dependem de confirmação. Digite *menu* para outro pedido.'};
 }
 return {state:initial(),reply:MENU};
}
module.exports={SERVICES,MENU,transition,fromSite};
