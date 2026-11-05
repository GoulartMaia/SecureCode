/* ---------- Refresher (no points, can be skipped) ---------- */
const REFRESHER=`<p>A database table holds rows, and a query asks for the rows you want:</p>
<div class="code">SELECT * FROM users WHERE name = 'Leo' AND password = 'pw3'</div>
<ul>
<li><code>SELECT *</code> means "give me all the columns".</li>
<li><code>WHERE</code> keeps only the rows where the condition is true.</li>
<li><code>AND</code> needs both sides to be true, <code>OR</code> needs just one. <b><code>AND</code> is evaluated before <code>OR</code></b>.</li>
<li>Text goes between single quotes: <code>'Leo'</code>.</li>
<li><code>--</code> starts a comment: the database ignores the rest of the line.</li>
</ul>`;
VIEWS.refresher=()=>{
 log('refresher_start');
 h(`<h2>SQL refresher</h2><p class="muted">A quick reminder, with no points and no timer.</p>${REFRESHER}
 <div class="row"><button class="btn" id="r">Continue</button></div>`);
 $('r').onclick=()=>{P.done.refresher=1;save();log('refresher_end');VIEWS.level1()};
};

/* ---------- Level 1: Understand (goal 3: explain) ---------- */
const injected=(u,p)=>{const s=u+'|'+p;return /'\s*or\s+('?)(\w+)\1\s*=\s*'?\2/i.test(p)||/'\s*or\s+1\s*=\s*1/i.test(s)||/^[^']*'\s*(--|#)/.test(u)};
const L1_LESSON=`<div class="lesson"><p>Many programs build a query by gluing what you type into a sentence of SQL:</p>
<div class="code">query = f"SELECT * FROM users WHERE name = '{name}' AND password = '{password}'"</div>
<p>The database only sees the finished sentence. It cannot tell which parts the programmer wrote and which parts you typed. So if your text contains a quote <code>'</code>, it <b>ends the text early</b>, and whatever follows is read as SQL code. That is a <b>SQL injection</b>.</p>
<p>Try it below. Type <code>' OR '1'='1</code> as the password and log in, then flip to the protected version and try the same input.</p></div>`;
const L1_EXAMPLES=`<p><b>Example 1: password is <code>' OR '1'='1</code></b></p>
<div class="code">SELECT * FROM users WHERE name = 'Margaret4233' AND password = '' OR '1'='1'</div>
<p>Step 1: the first quote you typed closes the password text, leaving it empty. Step 2: <code>OR '1'='1</code> is now SQL code. Step 3: <code>AND</code> is evaluated first, then <code>OR</code>. Since <code>'1'='1'</code> is always true, the condition is true for every row, so the query returns every user.</p>
<p><b>Example 2: username is <code>admin'--</code></b></p>
<div class="code">SELECT * FROM users WHERE name = 'admin'--' AND password = 'x'</div>
<p>Step 1: the quote closes the name. Step 2: <code>--</code> turns the rest of the line into a comment, so the password check is never run. Step 3: the query only asks for the user called admin, so you are in as admin.</p>`;
function sandbox(onBothTried){
 let safe=false,broke=false,blocked=false;
 const el=document.createElement('div');
 el.innerHTML=`<div class="row"><span class="switch" role="group" aria-label="Diary version"><button id="v" class="on">Friend's version</button><button id="s">Protected version</button></span></div>
 <label for="u">Username</label><input id="u" type="text" value="Margaret4233" autocomplete="off">
 <label for="p">Password</label><input id="p" type="text" autocomplete="off">
 <p style="margin-bottom:0">The database will run:</p><div class="code" id="sq"></div>
 <div class="row"><button class="btn" id="login">Log in</button></div><div id="sout" aria-live="polite"></div>`;
 const mount=()=>{
  const qshow=()=>{const u=esc($('u').value),p=esc($('p').value);
   $('sq').innerHTML=safe?`SELECT * FROM users WHERE name = ? AND password = ?<br>-- values sent separately: ["${u}", "${p}"]`
   :`SELECT * FROM users WHERE name = '<mark>${u}</mark>' AND password = '<mark>${p}</mark>'`};
  const setMode=m=>{safe=m;$('v').classList.toggle('on',!m);$('s').classList.toggle('on',m);$('sout').innerHTML='';qshow()};
  $('v').onclick=()=>setMode(false);$('s').onclick=()=>setMode(true);
  $('u').oninput=$('p').oninput=qshow;qshow();
  $('login').onclick=()=>{
   const hit=injected($('u').value,$('p').value);
   log('sandbox',{level:'level1',version:safe?'protected':'vulnerable',username:$('u').value,password:$('p').value,injected:hit});
   if(safe){
    $('sout').innerHTML=hit?`<div class="msg good"><b>Blocked.</b> The protected version sends your text separately from the SQL command, so your quote ends nothing. This is called a <i>parameterized query</i>.</div>`:`<div class="msg bad">Access denied: wrong password.</div>`;
    if(hit)blocked=true;
   }else if(hit){broke=true;$('sout').innerHTML=`<div class="msg good"><b>You are in, without the password!</b> Look at the query above: your text changed its meaning. Now flip to the <b>Protected version</b> and try the same input.</div>`}
   else $('sout').innerHTML=`<div class="msg bad">Access denied. Try the input from the lesson above.</div>`;
   if(broke&&blocked)onBothTried();
  };
 };
 return {el,mount};
}
const L1_QUESTIONS=[
 {id:'l1q1',prompt:"With the query SELECT * FROM users WHERE name = '{name}' AND password = '{password}', name is Leo and password is x' OR 'a'='a. What is the final query?",
  key:"SELECT * FROM users WHERE name = 'Leo' AND password = 'x' OR 'a'='a'",
  text:`<p>Same login as in the lesson. Someone types the username <code>Leo</code> and the password <code>x' OR 'a'='a</code>. Which query does the database receive?</p>`,
  options:[`<code>... WHERE name = 'Leo' AND password = 'x OR a=a'</code>`,`<code>... WHERE name = 'Leo' AND password = 'x' OR 'a'='a'</code>`,`<code>... WHERE name = 'Leo' AND password = 'x' OR 'a'='a''</code>`,`<code>... WHERE name = 'Leo' AND password = 'x'' OR ''a''=''a'</code>`],
  plain:['x OR a=a inside the quotes','closes after x, then OR a=a','same with an extra quote at the end','all quotes doubled'],answer:1,
  hints:['Paste the typed text exactly where <code>{password}</code> is. Change nothing else.','The template already has one quote before and one quote after <code>{password}</code>.','The first quote typed closes the password text right after <code>x</code>.','The closing quote from the template lands right after the final <code>a</code>, so it closes that value. No extra quote is added.'],
  explain:`The text is pasted as is. The typed quote closes <code>'x'</code>, and the template's own last quote closes <code>'a'</code>, so the query is still valid SQL.`},
 {id:'l1q2',prompt:"The final query is ... WHERE name = 'Leo' AND password = 'x' OR 'a'='a'. Which rows does it return, and why? Leo's password is not x.",
  key:'Every row: AND is evaluated first, then OR, and a=a is always true.',
  text:`<p>The database receives this query, and Leo's password is not <code>x</code>:</p><div class="code">SELECT * FROM users WHERE name = 'Leo' AND password = 'x' OR 'a'='a'</div><p>Which rows come back?</p>`,
  options:['No rows, because the name and password do not match','Only Leo\'s row, because the name is checked first','Every row, because <code>AND</code> is evaluated first, and then <code>OR \'a\'=\'a\'</code> is true for every row','An SQL error, because the query has too many quotes'],
  plain:['no rows','only Leo','every row','error'],answer:2,
  hints:['Read the condition as two groups joined by <code>OR</code>.','<code>AND</code> is evaluated before <code>OR</code>: <code>(name = \'Leo\' AND password = \'x\') OR \'a\'=\'a\'</code>.','The first group is false here. What about the second group?','<code>\'a\'=\'a\'</code> does not depend on the row at all.'],
  explain:`The condition reads <code>(name = 'Leo' AND password = 'x') OR 'a'='a'</code>. The second part is always true, so every row matches, not only Leo's.`},
 {id:'l1q3',prompt:"Someone types the username Leo'-- and the password anything. What happens?",
  key:"Logs in as Leo: the quote closes the name and -- comments out the password check.",
  text:`<p>Someone types the username <code>Leo'--</code> and the password <code>anything</code>. What happens?</p>`,
  options:['Login fails, because <code>anything</code> is the wrong password','SQL error, because a quote is left open','They get in as Leo, because the password check became a comment','They get every user, because the condition is always true'],
  plain:['login fails','SQL error','in as Leo','every user'],answer:2,
  hints:['Write out the final query first.','The final query starts <code>... WHERE name = \'Leo\'--\' AND ...</code>.','What does the database do with everything after <code>--</code>?','Only <code>name = \'Leo\'</code> is still checked. Which rows match that?'],
  explain:`The query becomes <code>... WHERE name = 'Leo'--' AND password = 'anything'</code>. Everything after <code>--</code> is ignored, including the leftover quote, so only the name is checked.`}
];
VIEWS.level1=()=>{
 const reflect=()=>{
  const fb=['Guessing would take days, but you do not have to guess. There is a shortcut.','Fair. Here is the context: the diary builds a database question out of whatever you type.','Good instinct, and that is why we only practise on a simulation, never on real people.','Good thinking. SQL is the language the diary uses to check your password.'];
  $('out').innerHTML=`<div class="msg bad">Locked out. What do you make of this task?</div>
  ${['Impossible, I would need days','I need more context','I would never do this to a friend','It probably has something to do with SQL'].map((o,i)=>`<button class="opt" data-i="${i}">${o}</button>`).join('')}`;
  $('out').querySelectorAll('.opt').forEach(b=>b.onclick=()=>{
   log('diary_reflection',{level:'level1',choice:b.textContent});
   $('out').querySelectorAll('.opt').forEach(x=>x.disabled=true);
   $('out').insertAdjacentHTML('beforeend',`<div class="msg good">${fb[+b.dataset.i]} By the end of this level you will know how someone could get into Margaret's diary <i>without</i> the password.<div class="row"><button class="btn" id="tolearn">Show me how</button></div></div>`);
   $('tolearn').onclick=learn;
  });
 };
 const diary=()=>{
  let tries=0;log('diary_start',{level:'level1'});
  h(`<h2>Level 1: The open diary</h2><p>Your friend loves writing their own programs. They just left the room with this open on their laptop:</p>
  <div class="diary"><b>Super Secret Diary</b><br>Username: <code>Margaret4233</code><br>Password: ▮▮▮▮▮▮▮▮</div>
  <p>You are curious. Can you guess Margaret's password in <b>3 tries</b>?</p>
  <div class="tries" id="tr" aria-label="Attempts used"><span></span><span></span><span></span></div>
  <label for="g">Password guess</label><input id="g" type="text" autocomplete="off">
  <div class="row"><button class="btn" id="try">Try it</button></div><div id="out" aria-live="polite"></div>`);
  const attempt=()=>{
   const g=$('g');if(!g.value.trim())return;
   tries++;log('diary_guess',{level:'level1',n:tries});g.value='';
   document.querySelectorAll('#tr span')[tries-1].classList.add('used');
   if(tries<3){$('out').innerHTML=`<div class="msg bad">Access denied. ${3-tries} ${tries===2?'try':'tries'} left.</div>`;return}
   $('try').disabled=true;g.disabled=true;reflect();
  };
  $('try').onclick=attempt;$('g').onkeydown=e=>{if(e.key==='Enter')attempt()};
 };
 const learn=()=>{
  const box=sandbox(()=>{P.tried1=1;save();const b=$('learndone');if(b){b.disabled=false;b.textContent="I'm ready for the questions"}});
  learnStage({level:'level1',title:'Level 1: How input becomes code',html:L1_LESSON+'<div id="sandbox"></div>',examples:L1_EXAMPLES,onDone:quiz,
   onMount:b=>{$('sandbox').append(box.el);box.mount();if(!P.tried1){b.disabled=true;b.textContent='Try the attack on both versions first'}}});
 };
 const quiz=()=>runQuiz({level:'level1',title:'Level 1: Understand',questions:L1_QUESTIONS,
  review:()=>L1_LESSON.replace(/<p>Try it below.*?<\/p>/s,'')+(isAI()?'':L1_EXAMPLES)+REFRESHER,
  onDone:()=>finishLevel('level1','You now know how typed text can change a query.')});
 if(P.deadline.level1)Date.now()<P.deadline.level1?learn():quiz();else diary();
};
