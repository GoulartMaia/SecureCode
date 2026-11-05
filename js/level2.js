/* ---------- Level 2: Spot (goal 1: identify) ---------- */
const L2_LESSON=`<div class="lesson"><p>To check code, follow the user's input and ask one question: <b>does it become part of the SQL text before the query runs?</b></p>
<ul><li><b>Warning sign:</b> user input is added to the SQL string in any way.</li>
<li><b>Safe pattern:</b> the SQL contains a placeholder <code>?</code>, and the value is passed separately to <code>execute</code>.</li></ul>
<p>Don't judge by appearance. What matters is where the user's input goes, so read each line carefully.</p></div>`;
const L2_EXAMPLES=`<p><b>Example 1: vulnerable</b></p>
<div class="code">cur.execute("SELECT * FROM users WHERE name = '" + name + "'")</div>
<p><code>name</code> comes from the user and is added to the SQL text, so the problem is on this line.</p>
<p><b>Example 2: safe</b></p>
<div class="code">cur.execute("SELECT * FROM users WHERE name = ?", (name,))</div>
<p>The SQL text is fixed, and <code>name</code> travels separately. Whatever the user types stays a value.</p>`;
const spot=({id,lines,bad,text,hints,explain})=>({id,hints,explain,text:`<p>${text}</p><p class="muted">Is this code safe or vulnerable? If it is vulnerable, click the line where the problem is.</p>`,
 prompt:'Is this code safe or vulnerable, and on which line?\n'+lines.map((l,i)=>`${i+1}: ${l}`).join('\n'),
 key:bad===null?'Safe.':`Vulnerable, line ${bad+1}: ${lines[bad].trim()}`,
 render(mount,set){
  mount.innerHTML=codeLines(lines)+`<button class="opt" data-c="safe">Safe</button><button class="opt" data-c="vulnerable">Vulnerable</button><p class="muted" id="linehint" hidden>Now click the line with the problem in the code above.</p>`;
  let choice=null,line=null;
  const update=()=>set(choice==='safe'?{choice}:choice==='vulnerable'&&line!==null?{choice,line}:null);
  mount.querySelectorAll('.opt').forEach(b=>b.onclick=()=>{choice=b.dataset.c;mount.querySelectorAll('.opt').forEach(x=>x.classList.toggle('sel',x===b));
   mount.querySelector('#linehint').hidden=choice!=='vulnerable';if(choice==='safe'){line=null;mount.querySelectorAll('.line').forEach(x=>x.classList.remove('sel'))}update()});
  mount.querySelectorAll('.line').forEach(b=>b.onclick=()=>{if(choice!=='vulnerable')return;line=+b.dataset.i;mount.querySelectorAll('.line').forEach(x=>x.classList.toggle('sel',x===b));update()});
 },
 isCorrect:a=>bad===null?a.choice==='safe':a.choice==='vulnerable'&&a.line===bad,
 describe:a=>a.choice==='safe'?'safe':`vulnerable, line ${a.line+1}`});
const L2_QUESTIONS=[
 spot({id:'l2q1',text:'A search function:',bad:2,lines:['def find_user(name):','    sql = "SELECT * FROM users WHERE name = "','    sql += "\'" + name + "\'"','    return cur.execute(sql).fetchall()'],
  hints:['Follow <code>name</code> from the first line to the last.','The query is built over two lines. Look at both.','Does <code>name</code> become part of the text in <code>sql</code>?','<code>execute</code> runs what was already built. Look for where the input was added.'],
  explain:`Line 3 adds <code>name</code> to the SQL text. Building the string in two steps doesn't change anything: <code>execute</code> just runs the finished text.`}),
 spot({id:'l2q2',text:'A lookup function. <code>TABLE</code> is set by the programmer and never comes from a user:',bad:null,lines:['TABLE = "users"','def get_user(uid):','    sql = f"SELECT * FROM {TABLE} WHERE id = ?"','    return cur.execute(sql, (uid,)).fetchone()'],
  hints:['There is an f-string here. Ask what is being inserted into it.','Where does <code>TABLE</code> come from? Can a user change it?','Now follow <code>uid</code>, the value from the user.','<code>uid</code> is passed separately, next to the <code>?</code> placeholder.'],
  explain:`Safe. The f-string only inserts <code>TABLE</code>, a fixed value no user can change, and <code>uid</code> is passed separately through the <code>?</code> placeholder. The problem is user input in the SQL text, not f-strings themselves.`}),
 spot({id:'l2q3',text:'Another search function:',bad:1,lines:['def find_user(name):','    sql = "SELECT * FROM users WHERE name = \'%s\'" % name','    return cur.execute(sql).fetchall()'],
  hints:['<code>%s</code> looks like a placeholder. Check who fills it in.','Is <code>name</code> passed to <code>execute</code>, or used earlier?','The <code>%</code> operator is ordinary Python string formatting.','By the time <code>execute</code> runs, is <code>name</code> already inside the text?'],
  explain:`Line 2 uses Python string formatting, so <code>name</code> is pasted into the text before <code>execute</code> runs. A real placeholder is passed to <code>execute</code> with the values separately.`}),
 spot({id:'l2q4',text:'This programmer tried to protect the query. <code>uid</code> comes from the URL:',bad:2,lines:['def get_user(uid):','    uid = uid.replace("\'", "")','    sql = "SELECT * FROM users WHERE id = " + uid','    return cur.execute(sql).fetchone()'],
  hints:['Line 2 removes quotes. Does this query need quotes to be attacked?','Look at the query: are there quotes around the id value?','Try it in your head with <code>uid</code> set to <code>5 OR 1=1</code>.','That input has no quotes, so line 2 does nothing to it. Where does it enter the SQL?'],
  explain:`Line 3 adds <code>uid</code> to the SQL text. The filter on line 2 doesn't help: this is a number field, so <code>5 OR 1=1</code> needs no quotes and returns every user.`})
];
VIEWS.level2=()=>{
 const quiz=()=>runQuiz({level:'level2',title:'Level 2: Spot',questions:L2_QUESTIONS,review:()=>L2_LESSON+(isAI()?'':L2_EXAMPLES),
  onDone:()=>finishLevel('level2','You can now tell where the weak spots are.')});
 if(P.deadline.level2&&Date.now()>=P.deadline.level2)return quiz();
 learnStage({level:'level2',title:'Level 2: Where to look',html:L2_LESSON,examples:L2_EXAMPLES,onDone:quiz});
};
