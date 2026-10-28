'use strict';
const http=require('node:http'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const {transition}=require('./flow');
const active=process.env.BOT_ACTIVE==='true';
const secret=process.env.META_APP_SECRET||'',verify=process.env.WEBHOOK_VERIFY_TOKEN||'',waToken=process.env.WHATSAPP_ACCESS_TOKEN||'',phoneId=process.env.WHATSAPP_PHONE_NUMBER_ID||'',adminKey=process.env.ADMIN_API_KEY||'';
const version=process.env.WHATSAPP_API_VERSION||'v24.0',storePath=path.resolve(process.env.BOT_STORE_PATH||path.join(__dirname,'data','state.json'));
const configured=Boolean(secret&&verify&&waToken&&phoneId&&adminKey.length>=24);
if(active&&!configured){console.error('Credenciais obrigatórias ausentes; bot não inicia ativo.');process.exit(1);}
let db={sessions:{},leads:[],processed:[]};
try{if(fs.existsSync(storePath)){const a=JSON.parse(fs.readFileSync(storePath,'utf8'));db={sessions:a.sessions||{},leads:a.leads||[],processed:a.processed||[]};}}catch(e){console.error('Falha ao carregar armazenamento.');process.exit(1);}
function save(){fs.mkdirSync(path.dirname(storePath),{recursive:true});const tmp=storePath+'.tmp';fs.writeFileSync(tmp,JSON.stringify(db),{mode:0o600});fs.renameSync(tmp,storePath);}
function fixed(a,b){const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&crypto.timingSafeEqual(x,y);}
function signature(raw,header){if(!secret||!/^sha256=[a-f0-9]{64}$/i.test(header||''))return false;return fixed(header,'sha256='+crypto.createHmac('sha256',secret).update(raw).digest('hex'));}
const reply=(res,status,data,contentType='text/plain; charset=utf-8')=>{res.writeHead(status,{'content-type':contentType,'cache-control':'no-store','x-content-type-options':'nosniff'});res.end(data);};
async function send(to,body){
 const r=await fetch('https://graph.facebook.com/'+encodeURIComponent(version)+'/'+encodeURIComponent(phoneId)+'/messages',{method:'POST',headers:{authorization:'Bearer '+waToken,'content-type':'application/json'},body:JSON.stringify({messaging_product:'whatsapp',to,type:'text',text:{preview_url:false,body}}),signal:AbortSignal.timeout(12000)});
 if(!r.ok){console.error('Meta retornou HTTP',r.status);throw Error('Falha no envio de mensagem');}
}
function events(payload){const out=[];for(const entry of payload.entry||[])for(const change of entry.changes||[]){const v=change.value||{};if(String(v.metadata?.phone_number_id||'')!==phoneId)continue;for(const m of v.messages||[]){if(!m.id||!m.from)continue;out.push({messageId:m.id,from:m.from,type:m.type,text:m.type==='text'?m.text?.body||'':m.type==='interactive'?m.interactive?.button_reply?.id||m.interactive?.list_reply?.id||'':m.type==='button'?m.button?.payload||m.button?.text||'':'',mediaId:m.type==='image'?m.image?.id:null,latitude:m.type==='location'?m.location?.latitude:null,longitude:m.type==='location'?m.location?.longitude:null});}}return out;}
async function processPayload(payload){for(const m of events(payload)){if(db.processed.includes(m.messageId))continue;const result=transition(db.sessions[m.from],m);if(result.reply)await send(m.from,result.reply);db.sessions[m.from]=result.state;if(result.lead)db.leads.push(result.lead);db.processed.push(m.messageId);if(db.processed.length>2000)db.processed=db.processed.slice(-1500);save();}}
const srv=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(req.method==='GET'&&url.pathname==='/health')return reply(res,200,JSON.stringify({ok:true,botActive:active,credentialsConfigured:configured,storage:'ephemeral-until-persistent-volume-configured'}),'application/json');
 if(req.method==='GET'&&url.pathname==='/webhook'){const valid=verify&&url.searchParams.get('hub.mode')==='subscribe'&&fixed(url.searchParams.get('hub.verify_token'),verify);return reply(res,valid?200:403,valid?url.searchParams.get('hub.challenge')||'':'Negado');}
 if(req.method==='GET'&&url.pathname==='/admin')return reply(res,200,fs.readFileSync(path.join(__dirname,'admin.html')),'text/html; charset=utf-8');
 if(req.method==='GET'&&url.pathname==='/api/leads'){const auth=req.headers.authorization||'';if(adminKey.length<24||!auth.startsWith('Bearer ')||!fixed(auth.slice(7),adminKey))return reply(res,401,'Não autorizado');return reply(res,200,JSON.stringify({total:db.leads.length,leads:db.leads.slice(-500).reverse()}),'application/json');}
 if(req.method==='POST'&&url.pathname==='/webhook'){
   if(!active)return reply(res,503,'Bot de testes inativo');
   let parts=[],size=0;for await(const part of req){size+=part.length;if(size>1024*1024)return reply(res,413,'Muito grande');parts.push(part);}
   const raw=Buffer.concat(parts);if(!signature(raw,req.headers['x-hub-signature-256']))return reply(res,401,'Assinatura inválida');
   let payload;try{payload=JSON.parse(raw.toString('utf8'));}catch{return reply(res,400,'JSON inválido');}
   if(payload.object!=='whatsapp_business_account')return reply(res,400,'Evento inválido');
   try{await processPayload(payload);return reply(res,200,'EVENT_RECEIVED');}catch(e){console.error('Erro ao processar webhook:',e.message);return reply(res,500,'Erro temporário');}
 }
 return reply(res,404,'Não encontrado');
});
if(require.main===module)srv.listen(Number(process.env.PORT||3000),'0.0.0.0',()=>console.log('Adriano WhatsApp bot listening; active='+active));
module.exports={srv,signature,events};
