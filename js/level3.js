/* ---------- Level 3: Attack (goal 3: explain the attack) ---------- */
document.head.insertAdjacentHTML('beforeend',`<style>
.blocks{display:flex;flex-wrap:wrap;gap:8px;align-items:center;min-height:52px;padding:8px;border:2px dashed var(--line);border-radius:10px;margin:6px 0}
.blocks.tray{border-style:solid}
.tile{font:15px ui-monospace,Menlo,Consolas,monospace;padding:6px 12px;border-radius:8px;border:2px solid var(--teal);background:var(--card);color:var(--ink);white-space:pre-wrap}
.tile:disabled{opacity:.35;cursor:default}
.tile.locked{border-color:var(--line);color:var(--mut);cursor:default}
.code .tile{margin:2px;padding:1px 8px;min-width:48px}
.code .tile.empty{border-style:dashed;border-color:var(--key);background:transparent;color:var(--key)}
textarea.write{width:100%;min-height:110px;padding:10px 12px;font:inherit;border:2px solid var(--line);border-radius:8px;background:#fff;color:#12262b}
.blocklabel{font-weight:600;margin:12px 0 0}
textarea.editor{display:block;width:100%;min-height:190px;margin:12px 0;padding:14px 16px;border:2px solid var(--line);border-radius:10px;background:var(--code);color:var(--codeink);font:15px/1.5 ui-monospace,Menlo,Consolas,monospace;white-space:pre;overflow-x:auto;resize:vertical}
</style>`);

/* ---------- A small simulated database. It runs only the SQL the blocks can produce, so an attack passes because
   it works, not because it matches a stored answer. Tested against real SQLite on every block order. ---------- */
const SQL_KEYWORDS=new Set(['SELECT','FROM','WHERE','UNION','OR','AND']);
const sqlFail=(kind,detail)=>{const e=new Error(detail||kind);e.kind=kind;throw e};
function sqlTokens(sql){
 const out=[];let i=0;
 while(i<sql.length){
  const c=sql[i];
  if(/\s/.test(c)){i++;continue}
  if(sql.startsWith('--',i)){while(i<sql.length&&sql[i]!=='\n')i++;continue}
  if(c==="'"){
   let s='';i++;
   for(;;){
    if(i>=sql.length)sqlFail('open_quote');
    if(sql[i]==="'"){if(sql[i+1]==="'"){s+="'";i+=2;continue}i++;break}
    s+=sql[i++];
   }
   out.push({k:'str',v:s});continue;
  }
  const rest=sql.slice(i);let m;
  if((m=/^\d+/.exec(rest))){
   if(/[A-Za-z_]/.test(rest[m[0].length]||''))sqlFail('syntax');
   out.push({k:'num',v:+m[0]});i+=m[0].length;continue;
  }
  if((m=/^[A-Za-z_]\w*/.exec(rest))){
   const up=m[0].toUpperCase();
   out.push(SQL_KEYWORDS.has(up)?{k:'kw',v:up}:{k:'id',v:m[0]});i+=m[0].length;continue;
  }
  if('=,*'.includes(c)){out.push({k:'sym',v:c});i++;continue}
  sqlFail('syntax');
 }
 return out;
}
const sqlNum=v=>typeof v==='number'?v:(parseFloat(v)||0);
function sqlEquals(a,b){
 const shape=(x,o)=>{
  if(x.aff==='int'&&typeof o.v==='string'&&o.v.trim()!==''&&!isNaN(+o.v))return {...o,v:+o.v};
  if(x.aff==='text'&&typeof o.v==='number'&&!o.aff)return {...o,v:String(o.v)};
  return o;
 };
 return shape(a,b).v===shape(b,a).v?1:0;
}
function runSQL(sql,db){
 const t=sqlTokens(sql);let p=0;
 const is=(k,v)=>t[p]&&t[p].k===k&&(v===undefined||t[p].v===v);
 const need=(k,v)=>{if(!is(k,v))sqlFail('syntax');return t[p++]};
 const select=()=>{
  need('kw','SELECT');
  const cols=[];
  do{
   if(is('sym','*')){p++;cols.push('*')}
   else{cols.push(need('id').v);if(is('id'))p++}
  }while(is('sym',',')&&++p);
  need('kw','FROM');
  const table=db[need('id').v];
  if(!table)sqlFail('no_table');
  if(is('id'))p++;
  const names=[];
  cols.forEach(c=>{
   if(c==='*')names.push(...table.cols);
   else if(table.cols.includes(c))names.push(c);
   else sqlFail('no_column',c);
  });
  let where=()=>({v:1});
  if(is('kw','WHERE')){p++;where=expr(table)}
  const rows=table.rows.filter(r=>sqlNum(where(r).v)!==0).map(r=>names.map(n=>r[table.cols.indexOf(n)]));
  return {names,rows};
 };
 /* AND binds tighter than OR, and = tightest, as in SQLite. */
 const expr=T=>{let a=andExpr(T);while(is('kw','OR')){p++;const l=a,r=andExpr(T);a=x=>({v:(sqlNum(l(x).v)!==0||sqlNum(r(x).v)!==0)?1:0})}return a};
 const andExpr=T=>{let a=eqExpr(T);while(is('kw','AND')){p++;const l=a,r=eqExpr(T);a=x=>({v:(sqlNum(l(x).v)!==0&&sqlNum(r(x).v)!==0)?1:0})}return a};
 const eqExpr=T=>{let a=prim(T);while(is('sym','=')){p++;const l=a,r=prim(T);a=x=>({v:sqlEquals(l(x),r(x))})}return a};
 const prim=T=>{
  if(is('str')||is('num')){const v=t[p++].v;return ()=>({v})}
  const name=need('id').v,i=T.cols.indexOf(name);
  if(i<0)sqlFail('no_column',name);
  const aff=T.types[i];
  return x=>({v:x[i],aff});
 };
 const first=select();
 let result=first;
 if(is('kw','UNION')){
  p++;
  const second=select();
  if(second.names.length!==first.names.length)sqlFail('column_count');
  const seen=new Set();
  result={names:first.names,rows:[...first.rows,...second.rows].filter(r=>{const k=JSON.stringify(r);if(seen.has(k))return false;seen.add(k);return true})};
 }
 if(p<t.length)sqlFail('syntax');
 return result;
}

const L3_DB={
 users:{cols:['id','name','password'],types:['int','text','text'],rows:[[1,'Leo','pw3'],[2,'Mia','m1a!'],[3,'admin','S3cret!']]},
 notes:{cols:['title','body','author'],types:['text','text','text'],rows:[['Groceries','Milk, eggs','Leo'],['Plans','Call Mia','Leo'],['Ideas','New logo','Mia']]}
};
const SQL_ERRORS={
 open_quote:'A quote was left open, so the query is broken. The database rejected it.',
 syntax:'The database could not read this query (syntax error).',
 no_table:'The database does not have that table.',
 no_column:'The database does not know that column. Text outside quotes is read as a column name.',
 column_count:'Both SELECTs in a UNION must have the same number of columns.'
};
/* Blocks sit next to each other with one space, except around quotes and before commas. */
const joinBlocks=list=>list.reduce((s,b)=>s+(s&&!s.endsWith("'")&&b!=="'"&&b!==','?' ':'')+b,'');

function blockQuestion({id,text,before,after,prefix='',filter=x=>x,blocks,judge,prompt,key,hints,explain}){
 return {id,hints,explain,prompt,key,text,
  render(mount,set){
   let placed=[],panel=null;
   const inputOf=()=>joinBlocks(filter([...(prefix?[prefix]:[]),...placed.map(i=>blocks[i])]));
   const draw=()=>{
    mount.innerHTML=`<p class="blocklabel">The database will run:</p><div class="code">${esc(before)}<mark>${esc(inputOf())}</mark>${esc(after)}</div>
    <p class="blocklabel">Your input <span class="muted" style="font-weight:400">(click a block to take it back)</span></p>
    <div class="blocks">${prefix?`<span class="tile locked">${esc(prefix)}</span>`:''}${placed.map(i=>`<button class="tile" data-out="${i}">${esc(blocks[i])}</button>`).join('')}</div>
    <p class="blocklabel">Blocks <span class="muted" style="font-weight:400">(click to add)</span></p>
    <div class="blocks tray">${blocks.map((b,i)=>`<button class="tile" data-in="${i}" ${placed.includes(i)?'disabled':''}>${esc(b)}</button>`).join('')}</div>
    <div class="blockresult"></div>`;
    panel=mount.querySelector('.blockresult');
    mount.querySelectorAll('[data-in]').forEach(b=>b.onclick=()=>{placed.push(+b.dataset.in);draw()});
    mount.querySelectorAll('[data-out]').forEach(b=>b.onclick=()=>{placed=placed.filter(i=>i!==+b.dataset.out);draw()});
    set(placed.length?{input:inputOf(),show:m=>{panel.innerHTML=m}}:null);
   };
   draw();
  },
  isCorrect(a){
   let res,err=null;
   try{res=runSQL(before+a.input+after,L3_DB)}catch(e){err=e}
   if(err){a.show(`<div class="msg"><b>What happened:</b> ${SQL_ERRORS[err.kind]}</div>`);return false}
   const {ok,msg}=judge(res);
   a.show(`<div class="msg"><b>What happened:</b> ${msg}</div>`);
   return ok;
  },
  describe:a=>a.input};
}
const rowsText=rows=>rows.length?`<div class="code">${rows.map(r=>esc(r.join(' | '))).join('<br>')}</div>`:'';

const L3_BODY=`<p>Now you build the attacks. Read the query first, then look for one of three moves:</p>
<ul><li><b>Cut off a check.</b> A quote closes the text, and <code>--</code> turns the rest of the line into a comment. A login program uses the <b>first row</b> the query returns, so which rows come back decides who you log in as.</li>
<li><b>Use a number field.</b> When a value has no quotes around it, <code>OR</code> can follow it directly. No quote is needed, so removing quotes from the input does not stop this.</li>
<li><b>Add a UNION.</b> <code>UNION</code> joins the rows of a second <code>SELECT</code> to the results, so the data can come from a different table. Both <code>SELECT</code>s must have the <b>same number of columns</b>. A leftover quote from the original query still has to be hidden with <code>--</code>.</li></ul>
<p>All of this happens in a simulation. Doing it on a real system without permission is illegal.</p>`;
const L3_EXAMPLES=`<p><b>Example 1: cutting off a check</b></p>
<div class="code">SELECT * FROM users WHERE name = 'Mia'--' AND password = 'x'</div>
<p>The input <code>Mia'--</code> closes the name, and the comment removes the password check. The first row returned is Mia's, so you log in as Mia.</p>
<p><b>Example 2: a number field</b></p>
<div class="code">SELECT title FROM notes WHERE id = 7 OR 1=1</div>
<p>The input <code>7 OR 1=1</code> has no quotes. <code>1=1</code> is true for every row, so every note comes back.</p>
<p><b>Example 3: a UNION</b></p>
<div class="code">SELECT title FROM books WHERE shelf = '' UNION SELECT name FROM users--'</div>
<p>The input <code>' UNION SELECT name FROM users--</code> closes the empty text, then adds a second <code>SELECT</code>. Both have one column, so the query works.</p>
<p><b>Contrast: the same trick against a placeholder</b></p>
<div class="code">cursor.execute("SELECT * FROM users WHERE name = ?", ("Mia'--",))</div>
<p>The database looks for a user literally called <code>Mia'--</code> and finds no one.</p>`;

const L3_QUESTIONS=[
 blockQuestion({id:'l3q1',
  text:`<p>Log in as <code>admin</code> without knowing the password. The program logs you in as the <b>first row</b> the query returns. These users are stored, in this order: Leo, Mia, admin. The password box holds <code>x</code>, and you control the username.</p>`,
  before:"SELECT * FROM users WHERE name = '",after:"' AND password = 'x'",
  blocks:["admin","Leo","'","--","OR","AND","1=1"],
  judge:r=>r.rows.length===0?{ok:false,msg:'No rows came back, so the login failed.'}
   :r.rows[0][1]==='admin'?{ok:true,msg:'The first row returned is admin, so you are logged in as admin.'}
   :{ok:false,msg:`The first row returned is ${esc(r.rows[0][1])}, so you are logged in as ${esc(r.rows[0][1])}, not admin.`},
  prompt:"Build a username from blocks (admin, Leo, ', --, OR, AND, 1=1) that logs in as admin without the password. Query: SELECT * FROM users WHERE name = '{name}' AND password = 'x'. The program logs in as the first row returned; rows are stored as Leo, Mia, admin.",
  key:"admin'-- (closes the name and comments out the password check). admin' OR 1=1-- fails because Leo's row comes first.",
  hints:['Which part of the query is stopping you? That is the part you want to remove.','Your input is inside quotes. What do you need to do before you can write any SQL?','Which block makes the database ignore the rest of the line?','<code>OR 1=1</code> returns every row. Who comes first in that case?'],
  explain:`<code>admin'--</code> closes the name, then the comment removes the password check. Only admin's row is left. Adding <code>OR 1=1</code> would log you in as Leo, because his row comes first.`}),
 blockQuestion({id:'l3q2',
  text:`<p>This page removes every quote from the input before building the query. Get the database to return <b>every user</b>.</p><div class="code">uid = uid.replace("'", "")
sql = "SELECT name FROM users WHERE id = " + uid</div>`,
  before:"SELECT name FROM users WHERE id = ",after:"",filter:list=>list.filter(b=>b!=="'"),
  blocks:["5","'","OR","AND","1=1","1=2","--"],
  judge:r=>({ok:r.rows.length===3,msg:r.rows.length===3?`Every user came back.${rowsText(r.rows)}`:r.rows.length?`Only some users came back.${rowsText(r.rows)}`:'No rows came back.'}),
  prompt:"Quotes are removed from uid. Build an input from blocks (5, ', OR, AND, 1=1, 1=2, --) so that SELECT name FROM users WHERE id = {uid} returns every user.",
  key:"5 OR 1=1. The value has no quotes around it, so no quote is needed.",
  hints:['Look at the query: are there quotes around the id value?','If no quote is around the value, you do not need to close anything. Watch what happens to the quote block in the query above.','You need a condition that is true for every row.','Start with a value for <code>id</code>, then add a condition that is always true.'],
  explain:`<code>5 OR 1=1</code> needs no quotes, because the value isn't inside any. Removing quotes changes nothing here, and <code>1=1</code> is true for every row.`}),
 blockQuestion({id:'l3q3',
  text:`<p>A notes search only shows notes by one author, and it shows two columns. The <code>users</code> table has the columns <code>id</code>, <code>name</code> and <code>password</code>. Finish the attack so the page shows every username <b>and</b> password. The first part is already done.</p>`,
  before:"SELECT title, body FROM notes WHERE author = '",after:"'",prefix:"' UNION SELECT",
  blocks:["name",",","password","*","FROM","users","notes","--"],
  judge:r=>{
   const has=u=>r.rows.some(x=>(x[0]===u[1]&&x[1]===u[2])||(x[0]===u[2]&&x[1]===u[1]));
   const ok=L3_DB.users.rows.every(has);
   return {ok,msg:ok?`Every username and password came back.${rowsText(r.rows)}`:r.rows.length?`The query ran, but it did not show every username and password.${rowsText(r.rows)}`:'No rows came back.'};
  },
  prompt:"Query: SELECT title, body FROM notes WHERE author = '{user}'. The input starts with ' UNION SELECT, then blocks (name , password * FROM users notes --). Goal: show every username and password. The users table has columns id, name, password.",
  key:"' UNION SELECT name, password FROM users--",
  hints:['The first <code>SELECT</code> returns two columns. How many must yours return?','Why would <code>*</code> fail here? Count the columns of <code>users</code>.','After naming the columns, say which table they come from.','Look at the end of the query above: a quote from the original query is left over. How do you hide it?'],
  explain:`<code>' UNION SELECT name, password FROM users--</code> closes the empty author text, adds a second <code>SELECT</code> with the same two columns, and hides the leftover quote. Using <code>*</code> fails because <code>users</code> has three columns.`})
];
VIEWS.level3=()=>{
 const quiz=()=>runQuiz({level:'level3',title:'Level 3: Attack',questions:L3_QUESTIONS,review:()=>`<div class="lesson">${L3_BODY}</div>`+(isAI()?'':L3_EXAMPLES),
  onDone:()=>finishLevel('level3','You have built three real attacks, in a simulation. Next, you will stop them.')});
 if(P.deadline.level3&&Date.now()>=P.deadline.level3)return quiz();
 learnStage({level:'level3',title:'Level 3: Three ways in',html:`<div class="lesson">${L3_BODY}</div>`,examples:L3_EXAMPLES,onDone:quiz});
};
