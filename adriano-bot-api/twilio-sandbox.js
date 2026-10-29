'use strict';
// Twilio WhatsApp Sandbox adapter for *test phones only*.
// Separate from Meta Cloud API webhook and never enabled by default.
const twilio=require('twilio');
const {transition}=require('./flow');

const endpoint='https://adriano-solucoes-bot-teste.onrender.com/twilio-sandbox';
const sandboxActive=process.env.TWILIO_SANDBOX_ACTIVE==='true';
const authToken=process.env.TWILIO_AUTH_TOKEN||'';
const allowed=new Set((process.env.TWILIO_ALLOWED_NUMBERS||'').split(',').map(s=>s.replace(/\D/g,'')).filter(Boolean));

function xmlText(message){
  const response=new twilio.twiml.MessagingResponse();
  if(message)response.message(message);
  return response.toString();
}
function respond(res,code,content,type='text/plain; charset=utf-8'){
  res.writeHead(code,{'content-type':type,'cache-control':'no-store','x-content-type-options':'nosniff'});
  res.end(content);
}
function config(){
  return {enabled:sandboxActive,configured:Boolean(authToken&&allowed.size),allowlistCount:allowed.size};
}
async function handleSandbox(req,res,db,save){
  if(!sandboxActive)return respond(res,503,'Sandbox inativo');
  if(!authToken||allowed.size===0)return respond(res,503,'Configuração de teste incompleta');
  if(!/^application\/x-www-form-urlencoded(?:;|$)/i.test(req.headers['content-type']||''))return respond(res,415,'Tipo não suportado');
  const chunks=[];let size=0;
  for await(const part of req){
    size+=part.length;
    if(size>65536)return respond(res,413,'Mensagem grande demais');
    chunks.push(part);
  }
  const params=Object.fromEntries(new URLSearchParams(Buffer.concat(chunks).toString('utf8')));
  const sig=String(req.headers['x-twilio-signature']||'');
  if(!sig||!twilio.validateRequest(authToken,sig,endpoint,params))return respond(res,403,'Assinatura inválida');
  const from=String(params.From||'').replace(/\D/g,'');
  if(!allowed.has(from))return respond(res,403,'Número não autorizado para teste');
  if(!/^whatsapp:\+/.test(params.From||''))return respond(res,400,'Canal inválido');
  const sid=String(params.MessageSid||params.SmsMessageSid||'');
  if(!/^SM[a-f0-9]{32}$/i.test(sid))return respond(res,400,'ID de mensagem inválido');
  const id='twilio:'+sid;
  if(db.processed.includes(id))return respond(res,200,xmlText(''),'text/xml; charset=utf-8');

  const type=Number(params.NumMedia||0)>0?'image':params.Latitude&&params.Longitude?'location':'text';
  const m={messageId:id,from,type,text:String(params.Body||''),mediaId:type==='image'?id:null,latitude:type==='location'?Number(params.Latitude):null,longitude:type==='location'?Number(params.Longitude):null};
  const key='twilio:'+from;
  const result=transition(db.sessions[key],m);
  let answer=result.reply||'';
  if(result.state?.mode==='human'){
    // No real escalation or notification exists for the sandbox.
    answer='Atendimento automático pausado. Para falar com Adriano, use o WhatsApp (19) 98159-5823. Digite menu para reiniciar o teste.';
  }
  try{
    const responseBody=xmlText(answer);
    db.sessions[key]=result.state;
    if(result.lead)db.leads.push({...result.lead,source:'twilio-sandbox'});
    db.processed.push(id);
    if(db.processed.length>2000)db.processed=db.processed.slice(-1500);
    save();
    return respond(res,200,responseBody,'text/xml; charset=utf-8');
  }catch(e){
    console.error('Falha ao registrar pedido de teste:',e.message);
    return respond(res,500,'Falha ao salvar atendimento');
  }
}
module.exports={handleSandbox,config};
