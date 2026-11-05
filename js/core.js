/* ---------- shared engine: use it for every level (points, timer, hints, chatbot, logging) ---------- */
const params=new URLSearchParams(location.search);
const isLocal=['localhost','127.0.0.1'].includes(location.hostname);
const api=(isLocal&&params.get('api'))||API_URL;
const app=()=>document.getElementById('app');
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const h=html=>{app().innerHTML=html;window.scrollTo(0,0)};
const fresh=()=>({code:null,group:null,done:{},points:0,q:{},deadline:{},queue:[]});
let P=fresh();
try{P=Object.assign(fresh(),JSON.parse(localStorage.getItem('sc2')||'{}'))}catch(e){}
const save=()=>{try{localStorage.setItem('sc2',JSON.stringify(P))}catch(e){}};
const done=id=>!!P.done[id];
const updPts=()=>{$('pts').textContent=P.points};
const addPoints=n=>{P.points+=n;save();updPts()};

/* ---------- logging: every event stays queued until the server has stored it ---------- */
function log(type,data={}){
 P.queue.push({t:new Date().toISOString(),code:P.code,group:P.group,type,...data});save();flush();
}
let flushing=false;
async function flush(){
 if(!api||flushing||!P.queue.length)return;
 flushing=true;const batch=P.queue.slice(0,50);let sent=false;
 try{
  const r=await fetch(api+'/log',{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(batch),keepalive:true});
  if(r.ok){P.queue.splice(0,batch.length);save();sent=true}
 }catch(e){}
 flushing=false;if(sent&&P.queue.length)flush();
}
addEventListener('pagehide',flush);

/* ---------- group from the participant code: odd = AI, even = no AI.
   Hand the codes out in shuffled order, so that the assignment is random and balanced 10/10. ---------- */
const groupOf=code=>parseInt(code.match(/\d+$/)[0],10)%2?'ai':'control';
const isAI=()=>P.group==='ai';

/* ---------- map ---------- */
const LEVELS=[
 {id:'refresher',name:'SQL refresher',sub:'Optional reminder, no points',need:null},
 {id:'level1',name:'Level 1: Understand',sub:'How your input changes a query',need:'refresher'},
 {id:'level2',name:'Level 2: Spot',sub:'Find the vulnerable code',need:'level1'},
 {id:'level3',name:'Level 3: Attack',sub:'Write the attacks yourself',need:'level2'},
 {id:'level4',name:'Level 4: Fix',sub:'Repair the code',need:'level3'}
];
const VIEWS={};
function go(id){(VIEWS[id]||map)()}
function start(){
 if(params.get('reset')==='1'){try{localStorage.removeItem('sc2')}catch(e){}P=fresh()}
 const forced=params.get('group');
 if(['ai','control'].includes(forced)){P.group=forced;P.code=P.code||'TEST'+forced;save()}
 updPts();flush();P.code?map():welcome();
}
function welcome(){
 h(`<section class="hero"><h1>Secure<span style="color:var(--teal)">Code</span></h1>
 <p>Learn how SQL injection works by doing it: first you see why the lock opens, then you learn to spot the weak spots, attack them and fix them.</p></section>
 <label for="pc">Your participant code</label><input id="pc" type="text" autocomplete="off" placeholder="e.g. SC07">
 <div class="row"><button class="btn" id="go">Start</button></div><div id="out" aria-live="polite"></div>`);
 const submit=()=>{
  const c=$('pc').value.trim();
  if(!/^[A-Za-z]{0,6}\d{1,4}$/.test(c)){$('out').innerHTML='<div class="msg bad">Please enter the code you were given.</div>';return}
  P.code=c.toUpperCase();P.group=groupOf(c);save();log('start');map();
 };
 $('go').onclick=submit;$('pc').onkeydown=e=>{if(e.key==='Enter')submit()};
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
 P.done[id]=1;save();log('level_done',{level:id,points:P.points});
 const next=LEVELS[LEVELS.findIndex(l=>l.id===id)+1];
 h(`<h2>${LEVELS.find(l=>l.id===id).name} complete</h2><div class="msg good">${msg||'Nice work.'} You have <b>${P.points}</b> points.</div>
 <div class="row"><button class="btn" onclick="go('${next&&VIEWS[next.id]?next.id:'map'}')">${next&&VIEWS[next.id]?'On to '+next.name:'Back to the map'}</button></div>`);
}

/* ---------- learning stage: same text for everyone, with a time limit.
   no-AI group: text + worked examples. AI group: text + chatbot. ---------- */
function learnStage({level,title,html,examples,seconds,onDone,onMount}){
 seconds=seconds||LEARN_SECONDS[level];
 if(!P.deadline[level]){P.deadline[level]=Date.now()+seconds*1000;save();log('learn_start',{level})}
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
  const s=left(),el=$('timer');
  if(!el){clearInterval(tick);return}
  el.textContent=`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;el.classList.toggle('low',s<=20);
  if(s<=0)finish('timeout');
 };
 const tick=setInterval(show,500);show();
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
  <div class="row"><button class="btn" id="check" disabled>Check answer</button></div>
  <div id="out" aria-live="polite"></div><div id="qhelp"></div>
  <details><summary>Review the lesson</summary>${review()}</details>`);
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
   over=true;lock();$('check').remove();
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
