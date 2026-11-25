import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPhraseDesk } from './test-helpers.mjs';

function fixture() {
  const api = loadPhraseDesk({seed:{bilingualBlur:true, autoMode:'both'}});
  const {sandbox:s, context} = api;
  const callbacks = new Map();
  let serial=0, clock=0, decorations=0, requests=0;
  const schedule=(fn,delay=0)=>{const id=++serial; callbacks.set(id,{fn,at:clock+delay});return id;};
  s.setTimeout=schedule;
  s.clearTimeout=id=>callbacks.delete(id);
  s.requestAnimationFrame=fn=>schedule(fn,16);
  s.cancelAnimationFrame=s.clearTimeout;
  s.performance={now:()=>clock};
  s.logDebug=()=>{};
  const nodes=new Map();
  const chatElement={contains:el=>el?.isConnected===true,querySelector:selector=>s.document.querySelector(selector)};
  s.document.getElementById=id=>id==='chat'?chatElement:null;
  s.document.querySelector=selector=>{
    const id=selector.match(/(?:data-)?mesid="(\d+)"/)?.[1];
    return id!==undefined?nodes.get(Number(id))?.mes:null;
  };
  s.document.querySelectorAll=()=>Array.from(nodes.values(),p=>p.mes);
  const make=(idx, msg)=>{
    const text={nodeType:1,isConnected:true,firstChild:{},lastChild:{},childNodes:{length:2},contains:()=>true,querySelector:()=>null};
    const mes={nodeType:1,isConnected:true,getAttribute:n=>n==='mesid'?String(idx):null,matches:x=>x==='.mes',querySelector:x=>x==='.mes_text'?text:null,closest:()=>mes};
    text.closest=()=>mes;
    const textEl={0:text,length:1,first(){return this;}};
    const p={idx,msg,mes,textEl,text:msg.mes,bodyText:msg.mes};
    nodes.set(idx,p);
    return p;
  };
  s.$=el=>el?.nodeType?{find:()=>nodes.get(Number(el.getAttribute?.('mesid')))?.textEl||{length:0},length:1,hasClass:()=>false}:{length:0};
  s.messagePayloadFromTarget=el=>nodes.get(Number(el?.getAttribute?.('mesid')));
  s.messagePayloadFromChatIndex=idx=>nodes.get(idx);
  s.decorateBilingualTranslationDom=()=>{decorations++;return true;};
  s.ensureMessageTranslateButton=()=>true;
  s.translateMessagePayload=async()=>{requests++;};
  s.variantForPayload=()=>({state:null});
  s.pickCachedMessageTranslation=()=>({text:''});
  context.chatId='A';
  const m={mes:'source',is_user:false,extra:{display_text:'source [번역]',phraseDesk:{showing:true,activeMode:'full',translations:{full:'source [번역]'}}}};
  context.chat.push(m);
  const p=make(0,m);
  const advance=async to=>{
    for (;;) {
      const next=[...callbacks].filter(([,job])=>job.at<=to).sort((a,b)=>a[1].at-b[1].at||a[0]-b[0])[0];
      if(!next)break;
      callbacks.delete(next[0]);clock=next[1].at;next[1].fn();await Promise.resolve();await Promise.resolve();
    }
    clock=to;await Promise.resolve();await Promise.resolve();
  };
  const switchChat=()=>{
    context.chatId='B';
    p.mes.isConnected=false;p.textEl[0].isConnected=false;
    const m2={mes:'other',is_user:false,extra:{}};
    context.chat.splice(0,1,m2);return make(0,m2);
  };
  return {api,s,context,p,make,advance,switchChat,callbacks,get decorations(){return decorations;},get requests(){return requests;}};
}

test('duplicate bilingual schedules decorate unchanged mounted DOM only once',async()=>{
  const t=fixture();
  t.api.scheduleBilingualDomDecoration(t.p,'full');
  t.api.scheduleBilingualDomDecoration(t.p,'full');
  await t.advance(500);
  assert.equal(t.decorations,1);
});

test('bilingual work queued in A cannot decorate B with the same message number',async()=>{
  const t=fixture();
  t.api.scheduleBilingualDomDecoration(t.p,'full');
  const before=t.decorations;
  t.switchChat();
  await t.advance(500);
  assert.equal(t.decorations,before);
});

test('automatic translation queued before a chat switch cannot call the API in the new chat',async()=>{
  const t=fixture();
  delete t.p.msg.extra.phraseDesk;delete t.p.msg.extra.display_text;
  t.api.maybeAutoTranslateRenderedMessage('char',[0]);
  t.switchChat();
  await t.advance(1500);
  assert.equal(t.requests,0);
});

test('an unchanged body stays untouched across later render events',async()=>{
  const t=fixture();
  t.api.scheduleBilingualDomDecoration(t.p,'full');
  await t.advance(20);
  t.api.scheduleBilingualDomDecoration(t.p,'full');
  await t.advance(100);
  assert.equal(t.decorations,1);
  t.p.textEl[0].firstChild={};
  t.p.textEl[0].lastChild={};
  t.api.scheduleBilingualDomDecoration(t.p,'full');
  await t.advance(200);
  assert.equal(t.decorations,2,'ST child replacement must be decorated');
});

test('new display / notes mode is decorated once; ordinary render is not decorated',async()=>{
  const t=fixture();
  t.api.schedulePhraseDeskRenderDecoration(t.p);
  await t.advance(20);
  assert.equal(t.decorations,1);
  t.api.settings.bilingualNotes=true;
  t.api.schedulePhraseDeskRenderDecoration(t.p);
  await t.advance(50);
  assert.equal(t.decorations,2);
  delete t.p.msg.extra.display_text;delete t.p.msg.extra.phraseDesk;
  t.api.schedulePhraseDeskRenderDecoration(t.p);
  await t.advance(500);
  assert.equal(t.decorations,2);
});

test('switching while automatic source stabilization is waiting prevents the request',async()=>{
  const t=fixture();
  delete t.p.msg.extra.display_text;delete t.p.msg.extra.phraseDesk;
  t.api.maybeAutoTranslateRenderedMessage('char',[0]);
  await t.advance(360);
  t.switchChat();
  await t.advance(1600);
  assert.equal(t.requests,0);
});

test('a valid new render still auto-translates once despite duplicate events',async()=>{
  const t=fixture();
  delete t.p.msg.extra.display_text;delete t.p.msg.extra.phraseDesk;
  t.s.queueMessageButtonHydration=()=>{};
  t.api.maybeAutoTranslateRenderedMessage('char',[0]);
  t.api.maybeAutoTranslateRenderedMessage('char',[0]);
  await t.advance(1600);
  assert.equal(t.requests,1);
});

test('a new swipe supersedes the old queued auto job on the same message',async()=>{
  const t=fixture();
  delete t.p.msg.extra.display_text;delete t.p.msg.extra.phraseDesk;
  t.s.queueMessageButtonHydration=()=>{};
  Object.assign(t.p.msg,{swipe_id:0,swipes:['source','another source']});
  t.api.maybeAutoTranslateRenderedMessage('char',[0]);
  t.p.msg.swipe_id=1;t.p.msg.mes='another source';
  t.api.maybeAutoTranslateRenderedMessage('char',[0]);
  await t.advance(1600);
  assert.equal(t.requests,1);
});

test('CHAT_CHANGED invalidates old work even with the same chat and message references',async()=>{
  const t=fixture();
  t.api.scheduleBilingualDomDecoration(t.p,'full');
  t.api.maybeAutoTranslateRenderedMessage('char',[0]);
  t.api.pdCancelDelayedChatWork();
  await t.advance(1600);
  assert.equal(t.decorations,0);
  assert.equal(t.requests,0);
});

function editFixture(){
  const t=fixture();
  let fills=0,fieldSearches=0;
  const text=t.p.textEl[0];
  const field={tagName:'TEXTAREA',value:t.p.msg.extra.display_text,isConnected:true,matches:()=>true,closest:()=>t.p.mes};
  const edit={closest:sel=>sel==='.mes'?t.p.mes:sel==='textarea,input'?null:edit};
  text.querySelector=sel=>{if(sel.includes('curEditTextarea')){fieldSearches++;return field.isConnected?field:null;}return null;};
  t.s.originalTextForEditTarget=()=>({payload:t.p,state:{},original:'source'});
  t.s.setTextArea=(el,value)=>{el.value=value;fills++;};
  return {...t,field,edit,get fills(){return fills;},get fieldSearches(){return fieldSearches;}};
}

test('edit restoration stops all other timers on successful fill and never overwrites typed text',async()=>{
  const t=editFixture();
  t.api.restoreOriginalBeforeEdit(t.edit);
  await t.advance(0);
  assert.equal(t.field.value,'source');
  assert.equal(t.fills,1);
  assert.equal(t.callbacks.size,0);
  const searches=t.fieldSearches;
  t.field.value='user changed this';
  await t.advance(500);
  assert.equal(t.field.value,'user changed this');
  assert.equal(t.fieldSearches,searches);
});

test('an edit fallback cannot fill a different chat after the old editor is detached',async()=>{
  const t=editFixture();
  t.api.restoreOriginalBeforeEdit(t.edit);
  t.switchChat();
  await t.advance(500);
  assert.equal(t.fills,0);
  assert.equal(t.fieldSearches,0);
});

test('message update acts on its exact target immediately, without a 40ms or whole-chat fallback',async()=>{
  const t=fixture();
  const handlers=new Map();
  t.context.eventSource={on:(key,fn)=>handlers.set(key,fn)};
  t.context.event_types={MESSAGE_UPDATED:'update',CHAT_CHANGED:'chat'};
  t.s.setupMessageButtonObserver=()=>{};
  const seen=[];
  t.s.clearPhraseDeskTranslationAfterMessageUpdate=p=>seen.push(p.msg);
  t.s.applyPersistedMessageTranslation=()=>{};
  t.s.queueMessageButtonHydration=()=>{};
  t.s.$=()=>({find(){return this;},first(){return this;},length:1});
  t.api.setupMessageRenderHooks();
  handlers.get('update')(0);
  assert.deepEqual(seen,[t.p.msg]);
  t.switchChat();
  await t.advance(500);
  assert.deepEqual(seen,[t.p.msg]);
});

test('a late edit fallback never overwrites text typed before the first retry',async()=>{
  const t=editFixture();
  t.api.restoreOriginalBeforeEdit(t.edit);
  t.field.value='typed before the fallback';
  await t.advance(500);
  assert.equal(t.field.value,'typed before the fallback');
  assert.equal(t.fills,0);
  assert.equal(t.callbacks.size,0);
});
