/* ---------- Level 4: Fix (goals 2 and 3: repair and explain) ---------- */
const L4_BODY=`<p>The fix for every attack so far is the same: <b>never put user input into the SQL text.</b></p>
<ul><li>Write the SQL as fixed text, with a placeholder <code>?</code> where each value goes.</li>
<li>Pass the values separately, as the second argument of <code>execute</code>, in the same order as the placeholders.</li></ul>
<p>The database reads the SQL first, so its meaning is settled before any value arrives. A quote or a <code>--</code> inside a value stays plain text.</p>
<p>Watch for these mistakes:</p>
<ul><li><code>'?'</code> with quotes is just text containing a question mark, not a placeholder.</li>
<li>In a <code>LIKE</code> search, the <code>%</code> signs belong in the value, not in the SQL.</li>
<li>A single value still needs a comma to be a tuple: <code>(term,)</code>.</li>
<li>Removing quotes is not a fix. It doesn't stop attacks on number fields, and it changes real names like O'Brien.</li></ul>`;
const L4_EXAMPLES=`<p><b>Example 1: one value</b></p>
<div class="code">cursor.execute("SELECT * FROM books WHERE shelf = ?", (shelf,))</div>
<p>One placeholder and one value. The comma makes <code>(shelf,)</code> a tuple.</p>
<p><b>Example 2: two values, in order</b></p>
<div class="code">cursor.execute("SELECT * FROM books WHERE shelf = ? AND year = ?", (shelf, year))</div>
<p>The first <code>?</code> takes <code>shelf</code> and the second takes <code>year</code>. Swapping them would compare the wrong columns.</p>
<p><b>Example 3: a LIKE search</b></p>
<div class="code">cursor.execute("SELECT * FROM books WHERE author LIKE ?", (word + "%",))</div>
<p>This finds authors starting with <code>word</code>. The <code>%</code> is added to the value in Python, and the SQL keeps a bare <code>?</code>.</p>
<p><b>Contrast: looks like a fix, but isn't</b></p>
<div class="code">word = word.replace("'", "")
cursor.execute("SELECT * FROM books WHERE year = " + word)</div>
<p>The input is still part of the SQL text, and <code>2020 OR 1=1</code> has no quotes to remove.</p>`;

/* Code with blanks: click a block to fill the next blank, click a filled blank to empty it. Blocks can be reused. */
function blankQuestion({id,text,parts,options,answer,why,prompt,key,hints,explain}){
 return {id,hints,explain,prompt,key,text,
  render(mount,set){
   const slots=parts.filter(x=>x===null).map(()=>null);
   let panel=null;
   const draw=()=>{
    let n=0;
    mount.innerHTML=`<div class="code">${parts.map(x=>{
     if(x!==null)return esc(x);
     const i=n++;
     return `<button class="tile ${slots[i]===null?'empty':''}" data-slot="${i}" aria-label="Blank ${i+1}">${slots[i]===null?`blank ${i+1}`:esc(options[slots[i]])}</button>`;
    }).join('')}</div>
    <p class="blocklabel">Blocks <span class="muted" style="font-weight:400">(click to fill the next blank)</span></p>
    <div class="blocks tray">${options.map((o,i)=>`<button class="tile" data-opt="${i}">${esc(o)}</button>`).join('')}</div>
    <div class="blockresult"></div>`;
    panel=mount.querySelector('.blockresult');
    mount.querySelectorAll('[data-opt]').forEach(b=>b.onclick=()=>{const free=slots.indexOf(null);if(free<0)return;slots[free]=+b.dataset.opt;draw()});
    mount.querySelectorAll('[data-slot]').forEach(b=>b.onclick=()=>{slots[+b.dataset.slot]=null;draw()});
    set(slots.includes(null)?null:{chosen:slots.map(i=>options[i]),show:m=>{panel.innerHTML=m}});
   };
   draw();
  },
  /* Rule-based check: the blocks must keep the input out of the SQL text and pass the right values, in order. */
  isCorrect(a){
   const wrong=a.chosen.findIndex((c,i)=>c!==answer[i]);
   if(wrong>=0)a.show(`<div class="msg"><b>Blank ${wrong+1}:</b> ${why[a.chosen[wrong]]||'This is not what goes here.'}</div>`);
   return wrong<0;
  },
  describe:a=>a.chosen.join(' | ')};
}

const L4_QUESTIONS=[
 blankQuestion({id:'l4q1',
  text:`<p>Repair this login so that <code>admin'--</code> no longer works and normal logins still do.</p><div class="code">cursor.execute("SELECT * FROM users WHERE name = '" + name + "' AND password = '" + password + "'")</div>`,
  parts:['cursor.execute("SELECT * FROM users WHERE name = ',null,' AND password = ',null,'", ',null,')'],
  options:['?',"'?'",`'" + name + "'`,'(name, password)','(password, name)','name + password'],
  answer:['?','?','(name, password)'],
  why:{"'?'":'With quotes, this is the text "?", not a placeholder.',[`'" + name + "'`]:'This still puts the input into the SQL text.','(password, name)':'The values fill the placeholders in order, so this compares the name to the password.','name + password':'This joins both values into one piece of text. Each placeholder needs its own value.','(name, password)':'That is the values, and this blank needs a placeholder.','?':'That is a placeholder, and this blank needs the values.'},
  prompt:`Fix the login: cursor.execute("SELECT * FROM users WHERE name = [blank 1] AND password = [blank 2]", [blank 3]). Blocks: ?, '?', '" + name + "', (name, password), (password, name), name + password.`,
  key:'cursor.execute("SELECT * FROM users WHERE name = ? AND password = ?", (name, password))',
  hints:['Each blank in the SQL needs a placeholder, and nothing from the user.','Does a placeholder need quotes around it?','The last blank holds the values. How many are needed?','Values fill the placeholders from left to right. Which one comes first in the query?'],
  explain:`The fix: <div class="code">cursor.execute("SELECT * FROM users WHERE name = ? AND password = ?", (name, password))</div> The SQL text never changes, so <code>admin'--</code> is only a strange name that matches nobody, and normal logins still work.`}),
 blankQuestion({id:'l4q2',
  text:`<p>Repair this search. It must still find any title that <b>contains</b> the word, but it must not allow an attack.</p><div class="code">cursor.execute("SELECT title, body FROM notes WHERE title LIKE '%" + term + "%'")</div>`,
  parts:['cursor.execute("SELECT title, body FROM notes WHERE title LIKE ',null,'", ',null,')'],
  options:['?',"'%?%'",`'%" + term + "%'`,'("%" + term + "%",)','("%" + term + "%")','(term,)'],
  answer:['?','("%" + term + "%",)'],
  why:{"'%?%'":'Inside quotes, the ? is plain text and not a placeholder.',[`'%" + term + "%'`]:'This still puts the input into the SQL text.','("%" + term + "%")':'Without a comma this is plain text and not a tuple, so each letter would count as a separate value.','(term,)':'This is safe, but without the % signs it only finds titles exactly equal to the word.','("%" + term + "%",)':'That is the value, and this blank needs a placeholder.','?':'That is a placeholder, and this blank needs the value.'},
  prompt:`Fix the search: cursor.execute("SELECT title, body FROM notes WHERE title LIKE [blank 1]", [blank 2]). Blocks: ?, '%?%', '%" + term + "%', ("%" + term + "%",), ("%" + term + "%"), (term,).`,
  key:'cursor.execute("SELECT title, body FROM notes WHERE title LIKE ?", ("%" + term + "%",))',
  hints:['The SQL should contain only a placeholder here. Where do the <code>%</code> signs go then?','The <code>%</code> signs are part of the value.','Without <code>%</code>, does the search still find titles that contain the word?','How do you write a tuple with only one value?'],
  explain:`The fix: <div class="code">cursor.execute("SELECT title, body FROM notes WHERE title LIKE ?", ("%" + term + "%",))</div> The <code>%</code> signs are added to the value in Python, and the comma makes it a tuple. Whatever the user types stays part of the search word.`})
];

/* Final check: no hints and no chatbot in either version, so the score shows what students can do alone.
   This keeps the engine's scoring and logging, and hides its help panel and lesson review for this question only. */
const NO_HELP='<style>#qhelp,#app details{display:none}</style>';
const FINAL_CODE=`def login(name, password):
    name = name.replace("'", "")
    sql = "SELECT * FROM users WHERE name = '" + name + "' AND password = '" + password + "'"
    row = cursor.execute(sql).fetchone()
    return row is not None`;

/* Reads Python well enough to find strings, names and brackets. Comments are dropped. */
function pyTokens(code){
 const out=[];let i=0,depth=0;
 while(i<code.length){
  const c=code[i],rest=code.slice(i);let m;
  if(c==='#'){while(i<code.length&&code[i]!=='\n')i++;continue}
  if(c==='\n'){if(depth===0)out.push({k:'nl'});i++;continue}
  if(/\s/.test(c)){i++;continue}
  if((m=/^([rRbBuUfF]{0,2})("""|'''|"|')/.exec(rest))){
   const q=m[2];let j=i+m[0].length,s='';
   for(;;){
    if(j>=code.length||(q.length===1&&code[j]==='\n'))return null;
    if(code.startsWith(q,j)){j+=q.length;break}
    if(code[j]==='\\'&&j+1<code.length){s+=code[j+1];j+=2;continue}
    s+=code[j++];
   }
   out.push({k:'str',v:s,f:/f/i.test(m[1])});i=j;continue;
  }
  if((m=/^[A-Za-z_]\w*/.exec(rest))){out.push({k:'id',v:m[0]});i+=m[0].length;continue}
  if('([{'.includes(c))depth++;
  if(')]}'.includes(c))depth--;
  out.push({k:'op',v:c});i++;
 }
 return depth===0?out:null;
}
const FIX_DB={...L3_DB,users:{...L3_DB.users,rows:[...L3_DB.users.rows,[4,"O'Brien",'ob1']]}};
/* Rule-based check of a student's repaired login, since Python can't easily run in the browser. Input must stay out
   of the SQL text. The SQL is then run on the simulated database, so attacks must fail and real logins must work.
   Returns '' when the fix passes, or the first problem found. Checked against real Python: see TEAM_NOTES.md. */
function checkLoginFix(raw){
 const code=raw.replace(/[‘’]/g,"'").replace(/[“”]/g,'"');
 const lines=code.split('\n').filter(l=>l.trim()&&!l.trim().startsWith('#'));
 const STRUCTURE='Keep the function working: it still has to start with <code>def login(name, password):</code>, indent its lines, set <code>row</code> with <code>fetchone()</code> and end with <code>return row is not None</code>.';
 if(!/^def\s+login\s*\(\s*name\s*,\s*password\s*\)\s*:\s*$/.test(lines[0]||'')||lines.slice(1).some(l=>!/^\s/.test(l)))return STRUCTURE;
 const t=pyTokens(code);
 if(!t)return 'A quote or a bracket is not closed, so this code would not run.';
 const isOp=(i,v)=>t[i]&&t[i].k==='op'&&t[i].v===v;
 const isId=(i,v)=>t[i]&&t[i].k==='id'&&t[i].v===v;
 /* Everything assigned to a name, as lists of tokens. */
 const assigned=name=>{
  const found=[];
  t.forEach((x,i)=>{
   if(!isId(i,name)||isOp(i-1,'.')||!(i===0||t[i-1].k==='nl'))return;
   if(isOp(i+1,'+')&&isOp(i+2,'=')){found.push(null);return}
   if(!isOp(i+1,'=')||isOp(i+2,'='))return;
   let j=i+2;const rhs=[];
   while(j<t.length&&t[j].k!=='nl')rhs.push(t[j++]);
   found.push(rhs);
  });
  return found;
 };
 const QUOTES="Removing or changing the input isn't needed once the values are passed separately, and it would change names like O'Brien. Leave <code>name</code> and <code>password</code> as they are.";
 if(t.some((x,i)=>x.k==='id'&&x.v==='replace'&&isOp(i-1,'.'))||assigned('name').length||assigned('password').length)return QUOTES;
 const calls=t.map((x,i)=>isId(i,'cursor')&&isOp(i+1,'.')&&isId(i+2,'execute')&&isOp(i+3,'(')?i:-1).filter(i=>i>=0);
 if(calls.length!==1)return 'The code needs exactly one <code>cursor.execute(...)</code>.';
 /* Split the arguments of execute at its top-level commas. */
 const start=calls[0],args=[[]];let d=1,j=start+4;
 for(;j<t.length&&d>0;j++){
  const x=t[j];
  if(x.k==='op'&&'([{'.includes(x.v))d++;
  if(x.k==='op'&&')]}'.includes(x.v)){d--;if(!d)break}
  if(x.k==='op'&&x.v===','&&d===1)args.push([]);else args[args.length-1].push(x);
 }
 const end=j;
 if(args.length<2||!args[1].length)return 'The values are not passed separately. Give them to <code>execute</code> as a second argument.';
 if(args.length>2)return 'Give <code>execute</code> two arguments: the SQL and one tuple with the values.';
 /* The SQL must be fixed text: only plain string literals, and no input anywhere. */
 let sqlArg=args[0];
 const SQLTEXT='User input is still part of the SQL text. Keep the SQL as fixed text with <code>?</code> placeholders.';
 if(sqlArg.length===1&&sqlArg[0].k==='id'){
  const a=assigned(sqlArg[0].v);
  if(a.length!==1||!a[0])return SQLTEXT;
  sqlArg=a[0];
 }
 if(!sqlArg.length||!sqlArg.every((x,i)=>i%2?x.k==='op'&&x.v==='+'||x.k==='str':x.k==='str'&&!x.f)||sqlArg.some(x=>x.f))return SQLTEXT;
 const sql=sqlArg.filter(x=>x.k==='str').map(x=>x.v).join('').trim().replace(/;$/,'');
 /* The values must be exactly the two names, in a tuple or list. */
 let valArg=args[1];
 if(valArg.length===1&&valArg[0].k==='id'&&!['name','password'].includes(valArg[0].v)){
  const a=assigned(valArg[0].v);
  if(a.length===1&&a[0])valArg=a[0];
 }
 const VALUES='Pass the values as a tuple, one for each <code>?</code>, like <code>(name, password)</code>.';
 const open=valArg[0],close=valArg[valArg.length-1];
 if(!open||!close||open.k!=='op'||close.k!=='op'||!((open.v==='('&&close.v===')')||(open.v==='['&&close.v===']')))return VALUES;
 const names=valArg.slice(1,-1).filter(x=>!(x.k==='op'&&x.v===','));
 if(!names.every(x=>x.k==='id'&&['name','password'].includes(x.v))||valArg.slice(1,-1).some((x,i)=>i%2?!(x.k==='op'&&x.v===','):x.k!=='id'))return VALUES;
 /* The rest of the function must still set row and return it. */
 const after=t.slice(end+1);
 const inline=t[start-1]&&isOp(start-1,'=')&&isId(start-2,'row')&&(start-2===0||t[start-3].k==='nl')&&after[0]?.v==='.'&&after[1]?.v==='fetchone'&&after[2]?.v==='('&&after[3]?.v===')';
 const apart=t.some((x,i)=>isId(i,'row')&&isOp(i+1,'=')&&isId(i+2,'cursor')&&isOp(i+3,'.')&&isId(i+4,'fetchone')&&isOp(i+5,'(')&&isOp(i+6,')')&&i>end);
 const ret=t.some((x,i)=>isId(i,'return')&&isId(i+1,'row')&&isId(i+2,'is')&&isId(i+3,'not')&&isId(i+4,'None')&&(!t[i+5]||t[i+5].k==='nl'));
 if(!(inline||apart)||!ret)return STRUCTURE;
 /* Run the query on the simulated database, with values bound the way a real placeholder does it. */
 const login=(name,password)=>{
  const vals=names.map(x=>x.v==='name'?name:password);
  let n=0,q=false,bound='';
  for(const c of sql){
   if(c==="'")q=!q;
   if(c==='?'&&!q){const v=vals[n++];bound+=v===undefined?'?':"'"+v.replace(/'/g,"''")+"'"}
   else bound+=c;
  }
  if(n!==vals.length)throw {count:true};
  return runSQL(bound,FIX_DB).rows.length>0;
 };
 try{
  if(!/\?/.test(sql)||!login('Leo','pw3'))return /\?/.test(sql)?'A normal login no longer works: Leo with the right password is refused. Check that each value matches its placeholder.':'The SQL needs a <code>?</code> placeholder for each value.';
  if(login('Leo','wrong'))return 'A wrong password still logs in. The query has to check both the name and the password.';
  if(login("admin'--",'x'))return "The attack <code>admin'--</code> still logs in.";
  if(login("O'Brien",'ob1')!==true)return "O'Brien can't log in with the right password.";
 }catch(e){
  if(e&&e.count)return 'The number of <code>?</code> placeholders must match the number of values. A <code>?</code> inside quotes is not a placeholder.';
  return 'The database could not read this SQL. Keep the same query, and change only what is needed to make it safe.';
 }
 return '';
}

const L4_FINAL=[{id:'l4q3',hints:[],prompt:'',key:'',
 text:`${NO_HELP}<p><b>Final check: no help is available on this page.</b></p><p>This login can be attacked. <b>Change the code yourself until it is safe.</b> Normal logins must still work, including for people with names like O'Brien. Edit the code directly in the box. You have two tries.</p>`,
 render(mount,set){
  mount.innerHTML=`<label for="fixcode">Your code</label><textarea class="editor" id="fixcode" spellcheck="false" autocomplete="off" autocapitalize="off" autocorrect="off" wrap="off" maxlength="1500"></textarea>
  <div class="row"><button class="btn alt" id="fixreset">Start over</button></div><div class="blockresult"></div>`;
  const box=mount.querySelector('#fixcode'),panel=mount.querySelector('.blockresult');
  let tries=0;
  const update=()=>{panel.innerHTML='';set(box.value.trim()&&box.value!==FINAL_CODE?{code:box.value,show:(m,last)=>{panel.innerHTML=m;if(last)box.readOnly=true},tried:()=>++tries}:null)};
  box.value=FINAL_CODE;box.oninput=update;
  mount.querySelector('#fixreset').onclick=()=>{box.value=FINAL_CODE;update()};
  update();
 },
 isCorrect(a){
  const problem=checkLoginFix(a.code),ok=!problem,last=ok||a.tried()>=MAX_ATTEMPTS;
  a.show(ok?`<div class="msg"><b>What happened:</b> The attack failed, and normal logins worked, including O'Brien's.</div>`:`<div class="msg"><b>What happened:</b> ${problem}</div>`,last);
  return ok;
 },
 describe:a=>a.code,
 explain:`One safe version:<div class="code">def login(name, password):
    sql = "SELECT * FROM users WHERE name = ? AND password = ?"
    row = cursor.execute(sql, (name, password)).fetchone()
    return row is not None</div>Line 3 uses placeholders, and line 4 passes the values separately. Line 2 goes, because it would change O'Brien's name and stop that person from logging in.`}];

/* The written explanation has no right-or-wrong check, because keyword matching would be unfair. Everyone who
   answers gets the same points. The team scores the logged text by hand with the rubric in TEAM_NOTES.md. */
function writeUp(onDone){
 const id='l4q4';
 if(id in P.q)return onDone();
 const started=Date.now();
 log('q_start',{level:'level4',q:id});
 h(`<div class="toprow"><h2 style="margin:0">Level 4: Final check</h2></div>
 <div class="q"><p><b>No help is available on this page.</b></p><p>In 1-2 sentences and in your own words: why does <code>admin'--</code> stop working once the login uses placeholders, even though no quotes are removed from the input?</p></div>
 <label for="why">Your explanation</label><textarea class="write" id="why" maxlength="800"></textarea>
 <p class="muted" id="count">Please write at least 8 words.</p>
 <div class="row"><button class="btn" id="send" disabled>Submit</button></div><div id="out" aria-live="polite"></div>`);
 const words=()=>$('why').value.trim().split(/\s+/).filter(Boolean).length;
 $('why').oninput=()=>{$('send').disabled=words()<8};
 $('send').onclick=()=>{
  const answer=$('why').value.trim();
  $('why').disabled=true;$('send').remove();$('count').remove();
  P.q[id]=POINTS_PER_QUESTION;addPoints(POINTS_PER_QUESTION);
  log('q_attempt',{level:'level4',q:id,attempt:1,answer,help:0});
  log('q_end',{level:'level4',q:id,written:true,attempts:1,help:0,points:POINTS_PER_QUESTION,seconds:Math.round((Date.now()-started)/1000)});
  $('out').innerHTML=`<div class="msg"><b>Saved, +${POINTS_PER_QUESTION} points for completing it.</b> Here is one good answer to compare with yours:<br>With placeholders, the database reads the SQL before it receives any value. The input travels separately, so the quote and the <code>--</code> are only characters in a name and can't change the query.</div>
  <div class="row"><button class="btn" id="nextq">Finish level</button></div>`;
  $('nextq').onclick=onDone;
 };
}

VIEWS.level4=()=>{
 const finish=()=>finishLevel('level4','You can now find, attack and repair this weakness.');
 const final=()=>runQuiz({level:'level4',title:'Level 4: Final check',questions:L4_FINAL,review:()=>'',onDone:()=>writeUp(finish)});
 const quiz=()=>runQuiz({level:'level4',title:'Level 4: Fix',questions:L4_QUESTIONS,review:()=>`<div class="lesson">${L4_BODY}</div>`+(isAI()?'':L4_EXAMPLES),onDone:final});
 if(P.deadline.level4&&Date.now()>=P.deadline.level4)return quiz();
 learnStage({level:'level4',title:'Level 4: Closing the door',html:`<div class="lesson">${L4_BODY}</div>`,examples:L4_EXAMPLES,onDone:quiz});
};
