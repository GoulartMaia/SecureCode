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
const FINAL_LINES=['def login(name, password):','    name = name.replace("\'", "")','    sql = "SELECT * FROM users WHERE name = \'" + name + "\' AND password = \'" + password + "\'"','    row = cursor.execute(sql).fetchone()','    return row is not None'];
const FINAL_BAD=[1,2,3];
const L4_FINAL=[{id:'l4q3',hints:[],prompt:'',key:'',
 text:`${NO_HELP}<p><b>Final check: no help is available on this page.</b></p><p>Make this login secure. People with names like O'Brien must also be able to log in. Click <b>every line</b> that has to be changed or removed.</p>`,
 render(mount,set){
  mount.innerHTML=codeLines(FINAL_LINES);
  const on=new Set();
  mount.querySelectorAll('.line').forEach(b=>b.onclick=()=>{const i=+b.dataset.i;on.has(i)?on.delete(i):on.add(i);b.classList.toggle('sel',on.has(i));set(on.size?[...on].sort():null)});
 },
 isCorrect:a=>a.length===FINAL_BAD.length&&FINAL_BAD.every(x=>a.includes(x)),
 describe:a=>'lines '+a.map(x=>x+1).join(', '),
 explain:`Three lines change:<div class="code">def login(name, password):
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
 learnStage({level:'level4',title:'Level 4: Closing the door',html:lessonFor(L4_BODY,L4_EXAMPLES),examples:L4_EXAMPLES,onDone:quiz});
};
