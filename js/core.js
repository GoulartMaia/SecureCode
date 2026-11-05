/* ---------- shared engine: use it for every level (points, timer, hints, chatbot, logging) ---------- */
const params=new URLSearchParams(location.search);
const isLocal=['localhost','127.0.0.1'].includes(location.hostname);
const api=(isLocal&&params.get('api'))||API_URL;
const PREVIEW=['ai','control'].includes(params.get('preview'))?params.get('preview'):null;
const STAGE=params.get('stage');
const app=()=>document.getElementById('app');
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const h=html=>{app().innerHTML=html;window.scrollTo(0,0)};
const fresh=()=>({code:null,group:null,done:{},points:0,q:{},deadline:{},queue:[]});
let P=fresh();
if(PREVIEW){P.code='PREVIEW';P.group=PREVIEW}
else try{P=Object.assign(fresh(),JSON.parse(localStorage.getItem('sc2')||'{}'))}catch(e){}
const save=()=>{if(PREVIEW)return;try{localStorage.setItem('sc2',JSON.stringify(P))}catch(e){}};
const done=id=>!!P.done[id];
const updPts=()=>{$('pts').textContent=P.points};
const addPoints=n=>{P.points+=n;save();updPts()};

/* ---------- logging: events are queued, then sent in batches, because the free storage plan
   allows 1,000 writes per day. Anything not yet stored stays queued and is retried. ---------- */
let flushing=false,flushTimer=null;
function log(type,data={}){
 if(PREVIEW)return;
 P.queue.push({t:new Date().toISOString(),code:P.code,group:P.group,type,...data});save();
 if(P.queue.length>=25||type==='level_done')flush();
 else if(!flushTimer)flushTimer=setTimeout(flush,30000);
}
async function flush(){
 clearTimeout(flushTimer);flushTimer=null;
 if(!api||flushing||!P.queue.length)return;
 flushing=true;const batch=P.queue.slice(0,50);
 try{
  const r=await fetch(api+'/log',{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(batch),keepalive:true});
  if(r.ok){P.queue.splice(0,batch.length);save()}
 }catch(e){}
 flushing=false;
 if(P.queue.length&&!flushTimer)flushTimer=setTimeout(flush,30000);
}
addEventListener('pagehide',flush);

/* ---------- assignment: the server gives the group with fewer students so far, so the groups stay equal.
   If the server can't be reached, it falls back to a coin flip, which is not guaranteed to be balanced. ---------- */
const STUDENT_PASSWORD='student',TEACHER_PASSWORD='teacher';
async function assignGroup(){
 if(api)try{
  const r=await fetch(api+'/assign',{method:'POST'});
  const d=await r.json();
  if(r.ok&&['ai','control'].includes(d.group))return {group:d.group,how:'balanced'};
 }catch(e){}
 return {group:Math.random()<.5?'ai':'control',how:'coin_flip'};
}
const isAI=()=>P.group==='ai';

/* ---------- map ---------- */
const LEVELS=[
 {id:'diary',name:'The open diary',sub:'A small challenge to start with',need:null},
 {id:'refresher',name:'SQL refresher',sub:'Optional reminder, no points',need:'diary'},
 {id:'level1',name:'Level 1: Understand',sub:'How your input changes a query',need:'refresher'},
 {id:'level2',name:'Level 2: Spot',sub:'Find the vulnerable code',need:'level1'},
 {id:'level3',name:'Level 3: Attack',sub:'Write the attacks yourself',need:'level2'},
 {id:'level4',name:'Level 4: Fix',sub:'Repair the code',need:'level3'}
];
const VIEWS={};
function go(id){if(inTeacher||PREVIEW)return;if(!P.code)return welcome();(VIEWS[id]||map)()}
function start(){
 if(PREVIEW)return startPreview();
 if(params.get('reset')==='1'){try{localStorage.removeItem('sc2')}catch(e){}P=fresh()}
 const forced=params.get('group');
 if(['ai','control'].includes(forced)){P.group=forced;P.code=P.code||'TEST'+forced;save()}
 updPts();flush();
 let teacherOn=false;try{teacherOn=sessionStorage.getItem('sc-teacher')==='1'}catch(e){}
 if(teacherOn)return teacher();
 P.code?map():welcome();
}
function welcome(){
 h(`<section class="hero"><h1>Secure<span style="color:var(--teal)">Code</span></h1>
 <p>Learn how SQL injection works by doing it: first you see why the lock opens, then you learn to spot the weak spots, attack them and fix them.</p></section>
 <label for="pw">Password</label><input id="pw" type="password" autocomplete="off">
 <div class="row"><button class="btn" id="go">Start</button></div><div id="out" aria-live="polite"></div>`);
 const submit=async()=>{
  const pw=$('pw').value.trim().toLowerCase();
  if(pw===TEACHER_PASSWORD){try{sessionStorage.setItem('sc-teacher','1')}catch(e){}return teacher()}
  if(pw!==STUDENT_PASSWORD){$('out').innerHTML='<div class="msg bad">That password is not right.</div>';return}
  $('go').disabled=true;
  const {group,how}=await assignGroup();
  P.code='S'+crypto.randomUUID().slice(0,8);P.group=group;save();log('start',{assignment:how});map();
 };
 $('go').onclick=submit;$('pw').onkeydown=e=>{if(e.key==='Enter')submit()};
}

/* ---------- teacher view: both versions side by side, one level at a time.
   Each side is this same site in preview mode: nothing is saved or logged, and there are no time limits. ---------- */
let inTeacher=false;
const previewUrl=(v,level,stage)=>{
 const q=new URLSearchParams({preview:v,level,stage});
 if(isLocal&&params.get('api'))q.set('api',params.get('api'));
 return '?'+q;
};
const stagesOf=id=>['diary','refresher'].includes(id)?[]:[['lesson','Lesson'],['questions','Questions']];
function teacher(){
 inTeacher=true;document.body.classList.add('teacher');
 let level='diary',stage='lesson';
 const draw=()=>{
  const stages=stagesOf(level);
  if(stages.length&&!stages.some(x=>x[0]===stage))stage='lesson';
  h(`<div class="tbar"><div class="tabs" role="group" aria-label="Level">${LEVELS.map(l=>`<button class="tab ${l.id===level?'on':''}" data-l="${l.id}" ${VIEWS[l.id]?'':'disabled'}>${l.name.split(':')[0]}</button>`).join('')}</div>
  <div class="tabs" role="group" aria-label="Part">${stages.map(x=>`<button class="tab ${x[0]===stage?'on':''}" data-s="${x[0]}">${x[1]}</button>`).join('')}</div>
  <button class="tab" id="texit">Exit</button></div>
  <div class="split">${[['ai','AI version'],['control','No-AI version']].map(([v,n])=>`<section><h3>${n}</h3><iframe title="${n}" src="${previewUrl(v,level,stage)}"></iframe></section>`).join('')}</div>`);
  app().querySelectorAll('[data-l]').forEach(b=>b.onclick=()=>{level=b.dataset.l;stage='lesson';draw()});
  app().querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{stage=b.dataset.s;draw()});
  $('texit').onclick=()=>{try{sessionStorage.removeItem('sc-teacher')}catch(e){}inTeacher=false;document.body.classList.remove('teacher');P.code?map():welcome()};
 };
 draw();
}
function startPreview(){
 document.body.classList.add('preview');updPts();
 const v=VIEWS[params.get('level')];
 v?v():h('<p class="muted">This level is not built yet.</p>');
}

function map(){
 h(`<h2>SQL Injection</h2><p class="muted">Finish one level to open the next.</p>
 <ul class="path">${LEVELS.map(l=>{
  const open=!l.need||done(l.need),ready=!!VIEWS[l.id],can=open&&ready&&!done(l.id);
  return `<li class="${done(l.id)?'done':open?'open':''}"><button class="node" ${can?`onclick="go('${l.id}')"`:'disabled'}>
  <span style="font-size:1.4rem">${done(l.id)?'✅':open?'🔓':'🔒'}</span><span><b>${l.name}</b><small>${l.sub}</small></span>
  <span class="tag">${done(l.id)?'Done':!ready?'Soon':open?'Play':'Locked'}</span></button></li>`}).join('')}</ul>`);
}
function finishLevel(id,msg=''){
 if(PREVIEW)return h(`<h2>End of this level</h2><p class="muted">Pick another level at the top of the page.</p>`);
 P.done[id]=1;save();log('level_done',{level:id,points:P.points});
 const next=LEVELS[LEVELS.findIndex(l=>l.id===id)+1];
 h(`<h2>${LEVELS.find(l=>l.id===id).name} complete</h2><div class="msg good">${msg||'Nice work.'} You have <b>${P.points}</b> points.</div>
 <div class="row"><button class="btn" onclick="go('${next&&VIEWS[next.id]?next.id:'map'}')">${next&&VIEWS[next.id]?'On to '+next.name:'Back to the map'}</button></div>`);
}

/* ---------- learning stage: same text for everyone, with a time limit.
   no-AI group: text + worked examples. AI group: text + chatbot. ---------- */
function learnStage({level,title,html,examples,seconds,onDone,onMount}){
 seconds=seconds||LEARN_SECONDS[level];
 if(PREVIEW&&STAGE==='questions')return onDone();
 if(!PREVIEW&&!P.deadline[level]){P.deadline[level]=Date.now()+seconds*1000;save();log('learn_start',{level})}
 const left=()=>Math.max(0,Math.round((P.deadline[level]-Date.now())/1000));
 h(`<div class="toprow"><h2 style="margin:0">${title}</h2><span class="timer" id="timer" role="timer"></span></div>
 ${html}
 ${isAI()?'':`<h3 style="margin-top:24px">Worked examples</h3>${examples}`}
 <div id="learnhelp"></div>
 <div class="row"><button class="btn" id="learndone">I'm ready for the questions</button></div>`);
 if(isAI())chatBox($('learnhelp'),{level,stage:'learn',limit:MAX_LEARN_CHAT,context:()=>({stage:'learn',level,lesson:app().querySelector('.lesson')?.innerText.slice(0,1800)})});
 let over=false;
 const finish=(why)=>{if(over)return;over=true;clearInterval(tick);log('learn_end',{level,why,secondsLeft:left()});onDone()};
 const show=()=>{
  if(PREVIEW){$('timer').textContent=`Limit: ${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;return}
  const s=left(),el=$('timer');
  if(!el){clearInterval(tick);return}
  el.textContent=`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;el.classList.toggle('low',s<=20);
  if(s<=0)finish('timeout');
 };
 const tick=PREVIEW?null:setInterval(show,500);show();
 $('learndone').onclick=()=>finish('button');
 if(onMount)onMount($('learndone'));
}

/* ---------- fixed hints for the no-AI group ---------- */
function hintBox(mount,{hints,onUse}){
 let used=0;
 mount.innerHTML=`<div class="help"><div id="hintlist"></div><button class="btn alt" id="hintbtn">Hint (−1 point)</button></div>`;
 $('hintbtn').onclick=()=>{
  $('hintlist').insertAdjacentHTML('beforeend',`<div class="bubble"><b>Hint ${used+1}:</b> ${hints[used]}</div>`);
  used++;onUse(used);
  if(used>=Math.min(hints.length,MAX_HELP)){$('hintbtn').disabled=true;$('hintbtn').textContent='No more hints'}
 };
}

/* ---------- chatbot for the AI group ---------- */
function chatBox(mount,{level,stage,limit,cost,context,onUse,history}){
 const msgs=history||[];let used=0,busy=false;
 const label=cost?'Ask the assistant (−1 point per question)':'Ask the assistant anything about the lesson';
 mount.innerHTML=`<div class="help"><h3>${label}</h3><p class="muted" style="margin:0 0 6px">Your messages are saved for the study. Please don't include personal information.</p>
 <div class="cb"></div><div class="chatrow"><label class="muted" style="position:absolute;left:-9999px" for="cbq">Your question</label>
 <input id="cbq" type="text" autocomplete="off" maxlength="600" placeholder="Type your question"><button class="btn alt" id="cbs">Ask</button></div></div>`;
 const box=mount.querySelector('.cb'),q=mount.querySelector('#cbq'),b=mount.querySelector('#cbs');
 const add=(t,me)=>{const d=document.createElement('div');d.className='bubble'+(me?' me':'');d.textContent=t;box.append(d);return d};
 msgs.forEach(m=>add(m.content,m.role==='user'));
 const send=async()=>{
  const text=q.value.trim();if(!text||busy)return;
  if(!api){add('The assistant is not connected yet.');return}
  busy=true;b.disabled=true;q.value='';add(text,true);const wait=add('…');
  msgs.push({role:'user',content:text});
  log('chat_user',{level,stage,text});
  try{
   const r=await fetch(api+'/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:msgs,context:context()})});
   const data=await r.json();
   if(!r.ok||!data.reply)throw new Error(data.error||'failed');
   wait.textContent=data.reply;msgs.push({role:'assistant',content:data.reply});
   used++;log('chat_ai',{level,stage,text:data.reply,refused:!!data.refused});
   if(onUse&&!data.refused)onUse(used);
  }catch(e){
   msgs.pop();wait.textContent='The assistant could not answer. You were not charged, so please try again.';log('chat_error',{level,stage,error:String(e.message||e)});
  }
  busy=false;
  if(used>=limit){q.disabled=b.disabled=true;q.placeholder='No more questions available here'}else{b.disabled=false;q.focus()}
 };
 b.onclick=send;q.onkeydown=e=>{if(e.key==='Enter')send()};
}

/* ---------- quiz engine. A question: {id,text,hints[4],explain, ...} plus either
   options[]+answer (multiple choice) or render(mount,api) for a custom answer widget.
   5 points, minus 1 per hint or chatbot question and minus 1 for a second attempt; never below 1 if correct.
   Two wrong attempts: 0 points and the explanation is shown. ---------- */
function runQuiz({level,title,questions,review,onDone}){
 const next=()=>{
  const i=questions.findIndex(q=>!(q.id in P.q));
  if(i<0)return onDone();
  showQuestion(questions[i],i);
 };
 function showQuestion(q,i){
  let attempts=0,help=0,over=false,started=Date.now();const tried=[],history=[];
  log('q_start',{level,q:q.id});
  h(`<div class="toprow"><h2 style="margin:0">${title}</h2><span class="muted">Question ${i+1} of ${questions.length}</span></div>
  <div class="q">${q.text}</div><div id="ans"></div>
  <div class="row"><button class="btn" id="check" disabled>Check answer</button>${PREVIEW?'<button class="btn alt" id="skipq">Skip to next question</button>':''}</div>
  <div id="out" aria-live="polite"></div><div id="qhelp"></div>
  <details><summary>Review the lesson</summary>${review()}</details>`);
  if(PREVIEW)$('skipq').onclick=()=>{P.q[q.id]=0;next()};
  let current=null;
  const setAnswer=(v)=>{current=v;$('check').disabled=v===null||v===undefined};
  if(q.options){
   $('ans').innerHTML=q.options.map((o,k)=>`<button class="opt" data-k="${k}">${o}</button>`).join('');
   $('ans').querySelectorAll('.opt').forEach(b=>b.onclick=()=>{$('ans').querySelectorAll('.opt').forEach(x=>x.classList.remove('sel'));b.classList.add('sel');setAnswer(+b.dataset.k)});
  }else q.render($('ans'),setAnswer);
  const isRight=a=>q.options?a===q.answer:q.isCorrect(a);
  const describe=a=>q.options?q.plain[a]:q.describe(a);
  const ctx=()=>({stage:over?'after':'question',level,question:q.prompt,answerKey:q.key,attempts:tried,help});
  const onUse=n=>{help=n;log('help',{level,q:q.id,kind:isAI()?'chat':'hint',n});};
  const mountHelp=()=>{
   if(isAI())chatBox($('qhelp'),{level,stage:'question',limit:MAX_HELP,cost:true,context:ctx,onUse,history});
   else hintBox($('qhelp'),{hints:q.hints,onUse});
  };
  mountHelp();
  const lock=()=>{$('ans').querySelectorAll('button').forEach(b=>b.disabled=true)};
  $('check').onclick=()=>{
   attempts++;const right=isRight(current);tried.push(describe(current));
   log('q_attempt',{level,q:q.id,attempt:attempts,answer:describe(current),right,help});
   if(!right&&attempts<MAX_ATTEMPTS){$('out').innerHTML=`<div class="msg bad">Not quite. You have one more try.</div>`;return}
   over=true;lock();$('check').remove();$('skipq')?.remove();
   const pts=right?Math.max(1,POINTS_PER_QUESTION-help-(attempts-1)):0;
   P.q[q.id]=pts;addPoints(pts);
   log('q_end',{level,q:q.id,right,attempts,help,points:pts,seconds:Math.round((Date.now()-started)/1000)});
   $('out').innerHTML=`<div class="msg ${right?'good':'bad'}"><b>${right?`Correct, +${pts} ${pts===1?'point':'points'}.`:'That was your last try, 0 points.'}</b><br>${q.explain}</div>
   <div class="row"><button class="btn" id="nextq">${i+1<questions.length?'Next question':'Finish level'}</button></div>`;
   $('nextq').onclick=next;
   if(isAI()){chatBox($('qhelp'),{level,stage:'after',limit:MAX_HELP,context:ctx,history});
    $('qhelp').querySelector('h3').textContent='Still unsure? Ask the assistant to explain it or give you a similar exercise (free)'}
   else $('qhelp').innerHTML='';
  };
 }
 next();
}

/* Code shown line by line, where each line can be clicked. */
function codeLines(lines){return `<pre class="lines">${lines.map((l,i)=>`<button class="line" data-i="${i}">${esc(l)||' '}</button>`).join('')}</pre>`}
