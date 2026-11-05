/* ---------- Study flow: consent, participant code, technical pre-test and post-test, optional experience questions.
   The tests are identical for both groups and show no hints, assistant, lesson links, answer feedback or scores.
   Responses go through studyStore (js/study-storage.js), which also sends finished answers to the team's server. ---------- */
const DEMO_NOTICE=api?'Your answers to the checks and the questionnaire are sent to the team’s server when you submit them, along with your lesson activity. They are linked to your participant code, not your name.':'Milestone demo: your answers are stored only in this browser. They are not sent to the research team and will not sync to another device.';
const TEST_INTRO='This short check asks what you can currently do with database-query code. It is not a course grade. Answer without AI, notes, or outside help. If you do not know an answer, select “I don’t know” rather than looking it up. No answer feedback will be shown during this activity.';
const TEST_ASSUMPTIONS='All examples are fictional and must stay inside this learning activity. Python examples use Python’s sqlite3 interface. SQL uses SQLite syntax. Names and inputs shown in examples are case-sensitive for this activity.';
const TIMING_NOTE='There is no time limit. You can go back and change answers until you submit.';
const PHASE_FORM={pre:'pre-v1',post:'post-v1'};
const PHASE_NAME={pre:'Starting check',post:'Final check'};
const notice=()=>`<p class="notice" role="note">${DEMO_NOTICE}</p>`;
const fmt=s=>esc(s).replace(/`([^`]+)`/g,'<code>$1</code>');
const assessing=()=>document.body.classList.add('assessing');

/* Forms are separate files, so the post-test is not even loaded while someone takes the pre-test.
   On a static site a determined visitor could still open the file directly; the backend should serve forms by state. */
const formCache={};
function loadForm(version){
 if(window.SC_FORMS?.[version])return Promise.resolve(window.SC_FORMS[version]);
 if(formCache[version])return formCache[version];
 return formCache[version]=new Promise((ok,fail)=>{
  const s=document.createElement('script');s.src=`js/forms/${version}.js`;
  s.onload=()=>window.SC_FORMS?.[version]?ok(window.SC_FORMS[version]):fail(new Error('form missing'));
  s.onerror=()=>{delete formCache[version];fail(new Error('could not load form'))};document.head.append(s);
 });
}

/* Keeps the lesson state with the participant record, so a code can be resumed in this browser. */
window.onLessonSave=state=>{if(state.code)studyStore.saveLessonState(state.code,state)};

/* ---------- first page: the password decides what you see. Students go on to consent and get one assigned
   version; the group is only assigned after consent. The teacher sees both versions side by side. ---------- */
function passwordGate(){
 h(`<section class="hero"><h1>Secure<span style="color:var(--teal)">Code</span></h1>
 <p>A short study about learning how SQL injection works and how to prevent it.</p></section>
 <section class="card"><p style="margin-top:0">If you are a student, write <b>student</b>. If you are a teacher, write <b>teacher</b>.</p>
 <label for="pw">Password</label><input id="pw" type="password" autocomplete="off">
 <div class="row"><button class="btn" id="pgo">Continue</button></div><div id="pout" aria-live="polite"></div></section>`);
 const submit=()=>{
  const pw=$('pw').value.trim().toLowerCase();
  if(pw===STUDENT_PASSWORD)return studyWelcome();
  if(pw===TEACHER_PASSWORD){try{sessionStorage.setItem('sc-teacher','1')}catch(e){}return teacher()}
  $('pout').innerHTML='<div class="msg bad">That password is not right.</div>';
 };
 $('pgo').onclick=submit;$('pw').onkeydown=e=>{if(e.key==='Enter')submit()};
 $('pw').focus();
}
/* ---------- start page for students: study information and consent ---------- */
function studyWelcome(){
 h(`<section class="hero"><h1>Secure<span style="color:var(--teal)">Code</span></h1>
 <p>A short study about learning how SQL injection works and how to prevent it.</p></section>
 ${notice()}
 <section class="card" aria-labelledby="infoh"><h2 id="infoh">Study information</h2>
 <p class="muted" style="margin-top:-6px">Draft text for the milestone. It must be reviewed before any real participant takes part.</p>
 <ul class="info">
 <li><b>What you will do:</b> a short starting check, an interactive lesson with practice exercises, a short final check and an optional questionnaire about your experience.</li>
 <li><b>Duration:</b> to be confirmed after piloting.</li>
 <li><b>Your choice:</b> taking part is voluntary, is not graded, and you can stop at any time by closing the page. How to withdraw data will be described in the final information sheet.</li>
 <li><b>Device:</b> a phone works, but writing code may be easier on a laptop.</li></ul>
 <h3 id="datah">Data we collect</h3>
 <p>If you take part, we collect the following data for this study:</p>
 <ul class="info" aria-labelledby="datah">
 <li><b>Your code and lesson version:</b> a random participant code and the version of the lesson you are given. Some versions include an assistant.</li>
 <li><b>Your answers:</b> your answers to the starting check, the lesson exercises, the final check and the optional questionnaire.</li>
 <li><b>What you type in the lesson:</b> this includes the practice login boxes and, if your version has an assistant, your messages and its replies.</li>
 <li><b>Your activity:</b> how long each part takes, your attempts, the help you use and your points.</li></ul>
 <p><b>Where it goes:</b> ${api?'your answers and lesson activity are sent to the team’s server, hosted by Cloudflare. Answers to the checks and the questionnaire are sent when you submit them, and unfinished answers stay in this browser. Messages to the assistant also go to Cloudflare’s AI service, which writes the replies.':'in this demo, your data stays in this browser.'}</p>
 <p><b>What we do not ask for:</b> your name, email or student number. Our study records do not include your IP address, but the services that host the site (GitHub and Cloudflare) handle it to deliver the pages. <b>Please do not type personal information or a real password anywhere,</b> including the practice login boxes.</p>
 <p><b>How it is used:</b> the research team uses the data for a CS-411 Digital Education course project at EPFL. Your records are linked by your participant code, so they are pseudonymous, not fully anonymous. How long data is kept and who to contact will be described in the final information sheet.</p>
 <h3>Your consent</h3>
 <p>To continue, we need your consent to collect this data. If you do not agree, you will not take part, and nothing will be recorded.</p>
 <label class="check"><input type="checkbox" id="consent"> I have read the study information. I agree to take part and consent to the collection and use of my data as described above.</label>
 <div class="row"><button class="btn" id="begin" disabled>Agree and continue</button><button class="btn alt" id="decline">I do not agree</button></div><div id="out" aria-live="polite"></div></section>
 <details class="card"><summary>I already have a participant code</summary>
 <label for="rc">Participant code</label><input id="rc" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="SC-XXXX-XXXX">
 <div class="row"><button class="btn alt" id="resume">Continue</button></div><div id="rout" aria-live="polite"></div></details>
 <p class="muted small"><a href="?demo-data=1">Milestone demo data in this browser (export or clear)</a></p>`);
 $('consent').onchange=()=>{$('begin').disabled=!$('consent').checked};
 $('decline').onclick=consentDeclined;
 $('begin').onclick=async()=>{
  if(!$('consent').checked)return;
  if(!studyStore.available()){$('out').innerHTML='<div class="msg bad">This browser does not allow local storage, so the demo cannot save answers. Try another browser or turn off private mode.</div>';return}
  $('begin').disabled=true;
  const p=await studyStore.createParticipant({consentVersion:CONSENT_VERSION,assign:assignGroup});
  P=fresh();P.code=p.participant_code;P.group=p.assigned_condition;save();
  log('start',{assignment:p.assignment_method,consent:CONSENT_VERSION});
  showCode(p.participant_code);
 };
 const resume=async()=>{
  const code=normalizeCode($('rc').value);
  if(!code){$('rout').innerHTML='<div class="msg bad">That does not look like a participant code. It has the form SC-XXXX-XXXX.</div>';return}
  const p=await studyStore.findParticipant(code);
  if(!p){$('rout').innerHTML=`<div class="msg bad">This code is not stored in this browser. In this milestone demo, progress is saved only in the browser where it started, so a code from another device cannot be restored yet. Please continue on the original device or ask a researcher.</div>`;return}
  P=Object.assign(fresh(),p.lesson_state||{},{code:p.participant_code,group:p.assigned_condition});save();updPts();
  resumeStudy()||map();
 };
 $('resume').onclick=resume;$('rc').onkeydown=e=>{if(e.key==='Enter')resume()};
}
/* Declining creates no participant and logs nothing. */
function consentDeclined(){
 h(`<h2 tabindex="-1" id="ch">Thank you for considering the study</h2>
 <p>You chose not to take part, so no participant code was created and nothing was recorded. You can close this page.</p>
 <div class="row"><button class="btn alt" id="reread">Back to the study information</button></div>`);
 $('ch').focus();$('reread').onclick=studyWelcome;
}
function showCode(code){
 h(`<h2 tabindex="-1" id="ch">Your participant code</h2>
 <p class="pcode" aria-label="Participant code ${code.split('').join(' ')}">${code}</p>
 <p>Please write this code down or take a photo of it. It links your starting check, lesson and final check without using your name.</p>
 <p class="muted">In this milestone demo, the code can restore your progress only in this same browser.</p>
 ${notice()}<div class="row"><button class="btn" id="cgo">Continue to the starting check</button></div>`);
 $('ch').focus();$('cgo').onclick=()=>VIEWS.pretest();
}
/* Called on page load: reopens an unfinished test so a refresh does not lose the place. */
function resumeStudy(){
 if(!P.code)return false;
 const db=studyStore._read();
 if(!db.participants[P.code])studyStore.ensureParticipant(P.code,P.group,'forced_test_param');
 /* The pre-test comes before any lesson content, and an unfinished post-test is reopened where it was left. */
 if(!done('pretest')){VIEWS.pretest();return true}
 if(done('level4')&&!done('posttest')){VIEWS.posttest();return true}
 return false;
}

/* ---------- test runner, shared by both phases ---------- */
const DUMMY={a:'Dummy text for the preview.',b:'Dummy explanation for the preview.'};
let activeRunner=null;
async function runTest(phase){
 assessing();
 if(!PREVIEW&&(done(phase==='pre'?'pretest':'posttest')))return map();
 if(!PREVIEW&&phase==='post'&&!done('level4'))return map();
 h('<p class="muted">Loading…</p>');assessing();
 let form;try{form=await loadForm(PHASE_FORM[phase])}catch(e){h(`<div class="msg bad">The questions could not be loaded. Check the connection and reload the page.</div>`);return}
 const qs=form.questions,N=qs.length;
 let attempt=null,d;
 if(PREVIEW){
  d={screen:'intro',answers:{},durations:{}};
  qs.forEach((q,i)=>{d.answers[q.id]=i===2?{idk:true}:Object.fromEntries(q.fields.map(f=>[f.key,f.kind==='number'?'':DUMMY[f.key]]))});
 }else{
  attempt=await studyStore.getAttempt(P.code,phase);
  if(attempt?.status==='submitted'){P.done[phase==='pre'?'pretest':'posttest']=1;save();return map()}
  d=attempt?attempt.draft:{screen:'intro',answers:{},durations:{}};
 }
 let shownAt=null,cur=null;
 const persist=()=>{if(!PREVIEW&&attempt)studyStore.saveDraft(attempt.attempt_id,d)};
 const stopClock=()=>{if(cur&&shownAt!==null){d.durations[cur]=(d.durations[cur]||0)+Math.round(performance.now()-shownAt);shownAt=null}};
 const startClock=key=>{stopClock();cur=key;shownAt=document.hidden?null:performance.now()};
 const onVis=()=>{if(document.hidden){stopClock();persist()}else if(cur)shownAt=performance.now()};
 activeRunner?.();document.addEventListener('visibilitychange',onVis);addEventListener('pagehide',onVis);
 activeRunner=()=>{document.removeEventListener('visibilitychange',onVis);removeEventListener('pagehide',onVis)};
 const leaveTo=screen=>{stopClock();d.screen=screen;persist();draw()};
 const ans=q=>d.answers[q.id]||(d.answers[q.id]={});
 const hasText=(q,a)=>q.fields.some(f=>String(a[f.key]||'').trim()!=='');
 const status=q=>{const a=ans(q);return a.idk?'dont_know':hasText(q,a)?'answered':'skipped'};
 const banner=()=>PREVIEW?'<p class="notice" role="note">Team preview with dummy answers. Nothing is saved, and these are not model answers.</p>':notice();

 function draw(){
  assessing();
  const s=d.screen;
  if(s==='intro')return intro();
  if(s==='review')return review();
  return question(+s);
 }
 function intro(){
  h(`<p class="eyebrow">${PHASE_NAME[phase]}</p><h2 tabindex="-1" id="qh">Before you start</h2>
  <p>${TEST_INTRO}</p><p>${TEST_ASSUMPTIONS}</p><p>${TIMING_NOTE}</p><p class="muted">${N} questions.</p>${banner()}
  <div class="row"><button class="btn" id="tstart">Start</button></div>`);
  assessing();$('qh').focus();
  $('tstart').onclick=async()=>{
   if(!PREVIEW&&!attempt){attempt=await studyStore.startAttempt(P.code,phase,form.version);attempt.draft.answers=d.answers;d=attempt.draft}
   leaveTo('0');
  };
 }
 function fieldHtml(q,f,a,i){
  const id=`f-${f.key}`,v=esc(a[f.key]||''),dis=a.idk?'disabled':'';
  const common=`id="${id}" data-k="${f.key}" ${dis} autocomplete="off" spellcheck="false" autocapitalize="off" autocorrect="off"`;
  let input;
  if(f.kind==='line')input=`<input type="text" class="mono" ${common} value="${v}">`;
  else if(f.kind==='number')input=`<input type="text" inputmode="numeric" class="num" ${common} value="${v}">`;
  else input=`<textarea class="${f.kind==='code'?'mono':''}" rows="${f.rows||3}" ${common}>${v}</textarea>`;
  const copy=f.kind==='code'?`<button type="button" class="btn alt small" id="copy-${f.key}" ${dis}>Copy the original two lines into the box</button>`:'';
  return `<div class="field"><label for="${id}">${esc(f.label)}</label>${input}${copy}</div>`;
 }
 function question(i){
  const q=qs[i],a=ans(q);
  h(`<p class="eyebrow" id="qprog">Question ${i+1} of ${N}</p>
  <div class="progress" role="progressbar" aria-labelledby="qprog" aria-valuemin="0" aria-valuemax="${N}" aria-valuenow="${i+1}"><span style="width:${(i+1)/N*100}%"></span></div>
  <h2 tabindex="-1" id="qh">${esc(q.title)}</h2>
  <div class="qbody">${q.body.map(b=>b.p?`<p>${fmt(b.p)}</p>`:`<pre class="qcode" tabindex="0" aria-label="${esc(b.lang)} code">${esc(b.code)}</pre>`).join('')}</div>
  <div class="fields">${q.fields.map(f=>fieldHtml(q,f,a,i)).join('')}</div>
  <div class="idk"><label class="check"><input type="checkbox" id="idk" ${a.idk?'checked':''}> I don’t know</label>
  <p class="muted small" id="idknote" ${a.idk?'':'hidden'}>While “I don’t know” is selected, anything typed above is kept on screen but will not be submitted.</p></div>
  <div class="row nav">${i>0?'<button class="btn alt" id="back">Back</button>':'<button class="btn alt" id="back">Back to instructions</button>'}
  <button class="btn" id="next">${i+1<N?'Next':'Review answers'}</button>${d.fromReview?'<button class="btn alt" id="torev">Return to review</button>':''}</div>
  ${banner()}`);
  assessing();$('qh').focus();startClock(q.id);
  const orig=q.body.find(b=>b.code)?.code||'';
  const syncCopy=()=>q.fields.forEach(f=>{const b=$('copy-'+f.key);if(b)b.hidden=!!String(a[f.key]||'').trim()});
  app().querySelectorAll('[data-k]').forEach(el=>el.oninput=()=>{a[el.dataset.k]=el.value;syncCopy();persist()});
  q.fields.forEach(f=>{const b=$('copy-'+f.key);if(b)b.onclick=()=>{const t=$('f-'+f.key);t.value=orig;a[f.key]=orig;syncCopy();persist();t.focus()}});
  syncCopy();
  $('idk').onchange=()=>{a.idk=$('idk').checked;app().querySelectorAll('[data-k],.fields .btn').forEach(el=>el.disabled=a.idk);$('idknote').hidden=!a.idk;persist()};
  $('back').onclick=()=>leaveTo(i>0?String(i-1):'intro');
  $('next').onclick=()=>{d.fromReview=false;leaveTo(i+1<N?String(i+1):'review')};
  if($('torev'))$('torev').onclick=()=>{d.fromReview=false;leaveTo('review')};
 }
 function shown(q){
  const a=ans(q),st=status(q);
  if(st==='dont_know')return '<p class="tagline">I don’t know</p>';
  if(st==='skipped')return '<p class="tagline">No answer</p>';
  return q.fields.map(f=>`<p class="muted small" style="margin:6px 0 2px">${esc(f.label)}</p>${String(a[f.key]||'').trim()?`<pre class="ans">${esc(a[f.key])}</pre>`:'<p class="tagline">Left empty</p>'}`).join('');
 }
 function review(){
  startClock('review');
  const skipped=qs.filter(q=>status(q)==='skipped').length;
  h(`<p class="eyebrow">${PHASE_NAME[phase]}</p><h2 tabindex="-1" id="qh">Review your answers</h2>
  <p>Check your answers before you submit. After submitting, they cannot be changed.</p>
  ${skipped?`<p class="msg">${skipped} ${skipped===1?'question has':'questions have'} no answer. You can submit anyway, or go back and answer or choose “I don’t know”.</p>`:''}
  <ol class="review">${qs.map((q,i)=>`<li class="card"><div class="revhead"><b>Question ${i+1}: ${esc(q.title)}</b><button class="btn alt small" data-edit="${i}" aria-label="Change answer to question ${i+1}">Change</button></div>${shown(q)}</li>`).join('')}</ol>
  ${banner()}
  <div class="row nav"><button class="btn alt" id="back">Back</button><button class="btn" id="submit">${PREVIEW?'Submit (disabled in preview)':'Submit answers'}</button></div><div id="out" aria-live="polite"></div>`);
  assessing();$('qh').focus();
  app().querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{d.fromReview=true;leaveTo(b.dataset.edit)});
  $('back').onclick=()=>leaveTo(String(N-1));
  if(PREVIEW){$('submit').disabled=true;return}
  $('submit').onclick=async()=>{
   const btn=$('submit');if(btn.disabled)return;btn.disabled=true;btn.textContent='Submitting…';
   stopClock();d.submission_key=d.submission_key||crypto.randomUUID();persist();
   const responses=qs.map(q=>{const a=ans(q),st=status(q),keep=st==='answered';
    return {question_id:q.id,response_status:st,dont_know:st==='dont_know',
     part_a:keep?(a.a??''):null,part_b:keep&&q.fields.length>1?(a.b??''):null,
     duration_ms:d.durations[q.id]||0,grading_status:'not graded',score:null,rubric_version:null}});
   try{
    const r=await studyStore.submitAttempt(attempt.attempt_id,{review_duration_ms:d.durations.review||0,items:responses},d.submission_key);
    P.done[phase==='pre'?'pretest':'posttest']=1;save();activeRunner?.();activeRunner=null;
    if(phase==='post')markFinished();
    acknowledge(r.duplicate);
   }catch(e){btn.disabled=false;btn.textContent='Submit answers';$('out').innerHTML='<div class="msg bad">The answers could not be saved. Please try again.</div>'}
  };
 }
 function acknowledge(duplicate){
  h(`<h2 tabindex="-1" id="qh">Thank you</h2>
  <p>${duplicate?'These answers had already been submitted, so nothing was changed.':'Your answers have been submitted.'}</p>
  ${notice()}
  <div class="row"><button class="btn" id="cont">${phase==='pre'?'Continue to the lesson':'Continue'}</button></div>`);
  $('qh').focus();
  $('cont').onclick=()=>phase==='pre'?VIEWS.diary():VIEWS.experience();
 }
 draw();
}
VIEWS.pretest=()=>runTest('pre');
VIEWS.posttest=()=>runTest('post');

/* ---------- optional experience questions (same for both groups) ---------- */
const EXP=[
 {id:'EXP-01',text:'The lesson explanations were clear.',scale:['Strongly disagree','Disagree','Neither agree nor disagree','Agree','Strongly agree']},
 {id:'EXP-02',text:'The lesson was engaging.',scale:['Strongly disagree','Disagree','Neither agree nor disagree','Agree','Strongly agree']},
 {id:'EXP-03',text:'How difficult did the exercises feel?',scale:['Very easy','Easy','Neither easy nor difficult','Difficult','Very difficult']},
 {id:'EXP-04',text:'When I got stuck, I felt supported by the help available in the lesson.',scale:['Strongly disagree','Disagree','Neither agree nor disagree','Agree','Strongly agree'],extra:'I did not get stuck'}
];
/* Open-ended question for the qualitative analysis, from the M4 slides. Shown first so it is less likely to be skipped. */
const EXP_OPEN={id:'EXP-06',text:'Where, if anywhere, did you encounter difficulty?',sub:'What did you do next?'};
VIEWS.experience=()=>{
 if(!PREVIEW&&!done('posttest'))return map();
 h(`<h2 tabindex="-1" id="qh">Your experience (optional)</h2><p class="muted">Every question is optional. Your answers here are separate from the technical checks.</p>
 <form id="exp"><div class="field"><label for="${EXP_OPEN.id}">${esc(EXP_OPEN.text)} ${esc(EXP_OPEN.sub)}</label><textarea id="${EXP_OPEN.id}" rows="4"></textarea></div>
 ${EXP.map(q=>`<fieldset class="card"><legend>${esc(q.text)}</legend><div class="scale">
 ${q.scale.map((s,i)=>`<label class="pt"><input type="radio" name="${q.id}" value="${i+1}"><span><b>${i+1}</b> ${esc(s)}</span></label>`).join('')}
 ${q.extra?`<label class="pt"><input type="radio" name="${q.id}" value="not_stuck"><span>${esc(q.extra)}</span></label>`:''}</div></fieldset>`).join('')}
 <div class="field"><label for="EXP-05">Anything else you would like to tell us about the lesson? (optional)</label><textarea id="EXP-05" rows="3"></textarea>
 <p class="muted small">Please do not include personal information.</p></div>
 <div class="row"><button type="submit" class="btn" id="esub">${PREVIEW?'Submit (disabled in preview)':'Submit'}</button>${PREVIEW?'':'<button type="button" class="btn alt" id="eskip">Skip</button>'}</div></form>${PREVIEW?'':notice()}`);
 $('qh').focus();
 if(PREVIEW){$('esub').disabled=true;return}
 const finish=async(answers)=>{$('esub').disabled=true;markFinished();await studyStore.saveExperience(P.code,answers);P.done.experience=1;save();complete()};
 $('exp').onsubmit=e=>{e.preventDefault();const fd=new FormData($('exp'));
  finish(Object.fromEntries([[EXP_OPEN.id,$(EXP_OPEN.id).value||null],...EXP.map(q=>[q.id,fd.get(q.id)||null]),['EXP-05',$('EXP-05').value||null]]))};
 $('eskip').onclick=()=>finish({skipped:true});
};
function complete(){
 const waiting=()=>studyStore.pending?.()>0;
 h(`<h2 tabindex="-1" id="qh">Thank you for taking part</h2><p id="closing">${waiting()?'Your last answers have not reached the team’s server yet. Please keep this page open and check your connection.':'You have finished the study activity. You can close this page.'}</p>
 <p>Your participant code: <b class="mono">${esc(P.code)}</b></p>${notice()}`);$('qh').focus();
 if(waiting()){const t=setInterval(async()=>{await studyStore.flushUploads();
  if(!waiting()){clearInterval(t);const c=$('closing');if(c)c.textContent='You have finished the study activity. You can close this page.'}},5000)}
}

/* ---------- milestone demo data: this browser only, manual export ---------- */
const csvCell=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
const toCsv=rows=>'\ufeff'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n')+'\r\n';
function download(name,text,type){
 const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
function responseRows(db){
 const head=['participant_code','assigned_condition','assignment_method','consent_version','study_version','attempt_id','phase','form_version','attempt_status','started_at','submitted_at','question_id','response_status','dont_know','part_a','part_b','duration_ms','grading_status','score','rubric_version'];
 const rows=[head];
 for(const a of Object.values(db.attempts)){const p=db.participants[a.participant_code]||{};
  const items=a.responses?.items||[];
  if(!items.length)rows.push([a.participant_code,p.assigned_condition,p.assignment_method,p.consent_version,p.study_version,a.attempt_id,a.phase,a.form_version,a.status,a.started_at,a.submitted_at,'','','','','','','','','']);
  for(const r of items)rows.push([a.participant_code,p.assigned_condition,p.assignment_method,p.consent_version,p.study_version,a.attempt_id,a.phase,a.form_version,a.status,a.started_at,a.submitted_at,r.question_id,r.response_status,r.dont_know,r.part_a,r.part_b,r.duration_ms,r.grading_status,r.score,r.rubric_version]);
 }
 return rows;
}
async function demoDataPage(){
 const db=await studyStore.exportAll();
 const ps=Object.values(db.participants),as=Object.values(db.attempts);
 const st=(c,ph)=>as.find(a=>a.participant_code===c&&a.phase===ph)?.status||'not started';
 h(`<h2>Milestone demo data</h2>${notice()}
 <p>This page shows only what is stored in <b>this browser</b>. Export is a manual copy for demonstrating the format with dummy data; it is not centralized collection, and browser storage can be cleared at any time. Do not use this demo with real participants.</p>
 <p class="muted small">CSV cells keep the exact typed text, including quotes, line breaks and leading symbols. Import the CSV as text in a spreadsheet so that answers starting with = + - or @ are not read as formulas.</p>
 <div class="tablewrap"><table><caption class="muted small">${ps.length} participant ${ps.length===1?'record':'records'} in this browser</caption><thead><tr><th scope="col">Participant code</th><th scope="col">Condition</th><th scope="col">Pre-test</th><th scope="col">Post-test</th><th scope="col">Experience</th></tr></thead>
 <tbody>${ps.map(p=>`<tr><td class="mono">${esc(p.participant_code)}</td><td>${esc(p.assigned_condition)}</td><td>${st(p.participant_code,'pre')}</td><td>${st(p.participant_code,'post')}</td><td>${db.experience[p.participant_code]?'submitted':'none'}</td></tr>`).join('')||'<tr><td colspan="5" class="muted">No demo data yet.</td></tr>'}</tbody></table></div>
 <div class="row"><button class="btn" id="xjson">Export JSON</button><button class="btn" id="xcsv">Export responses CSV</button><button class="btn alt" id="xexp">Export experience CSV</button><button class="btn alt" id="xshow">Show JSON on this page</button></div>
 <pre id="jsonout" hidden></pre>
 <div class="card" style="margin-top:24px"><h3>Clear demo data</h3><p class="muted">Deletes every demo participant, attempt and response stored in this browser, and the current lesson progress.</p>
 <label class="check"><input type="checkbox" id="sure"> I understand this cannot be undone.</label><div class="row"><button class="btn alt" id="xclear" disabled>Clear demo data</button></div><div id="cout" aria-live="polite"></div></div>
 <p><a href="./">Back to the start page</a></p>`);
 const stamp=new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
 const json=JSON.stringify({exported_at:new Date().toISOString(),storage:'local-demo-browser-only',...db},null,2);
 $('xjson').onclick=()=>download(`securecode-demo-${stamp}.json`,json,'application/json');
 $('xcsv').onclick=()=>download(`securecode-demo-responses-${stamp}.csv`,toCsv(responseRows(db)),'text/csv;charset=utf-8');
 $('xexp').onclick=()=>download(`securecode-demo-experience-${stamp}.csv`,toCsv([['participant_code','submitted_at','skipped',EXP_OPEN.id,...EXP.map(q=>q.id),'EXP-05'],...Object.values(db.experience).map(e=>[e.participant_code,e.submitted_at,!!e.answers.skipped,e.answers[EXP_OPEN.id],...EXP.map(q=>e.answers[q.id]),e.answers['EXP-05']])]),'text/csv;charset=utf-8');
 $('xshow').onclick=()=>{$('jsonout').hidden=false;$('jsonout').textContent=json};
 $('sure').onchange=()=>{$('xclear').disabled=!$('sure').checked};
 $('xclear').onclick=async()=>{await studyStore.clearAll();try{localStorage.removeItem('sc2')}catch(e){}P=fresh();$('cout').innerHTML='<div class="msg good">Demo data cleared.</div>';setTimeout(demoDataPage,600)};
}
