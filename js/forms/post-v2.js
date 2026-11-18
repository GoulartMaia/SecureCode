/* Technical post-test, form post-v2. Loaded only after Level 4 is finished (or in the teacher preview).
   Parallel to pre-v2: same question types, different surface content and different answer positions.
   Participant-facing text only: no answer keys, scoring or level mapping here.
   A "choice" field stores the letter the participant picked (A, B, C or D). */
(window.SC_FORMS=window.SC_FORMS||{})['post-v2']={
 phase:'post',version:'post-v2',
 questions:[
  {id:'POST-01',title:'Interpret a query',
   body:[{p:'The `staff` table contains several rows. A staff member named Iris exists, but her access code is not `invalid`.'},
    {code:"SELECT * FROM staff\nWHERE name = 'Iris' AND access_code = 'invalid' OR '8' = '8';",lang:'SQL'}],
   fields:[{key:'a',kind:'choice',label:'Which rows does this query return?',options:[
    "Every row in the table, because `AND` is evaluated before `OR`, and `'8' = '8'` is always true.",
    "No rows, because Iris's access code is not `invalid`.",
    "Only Iris's row, because the name is checked first.",
    "An error, because the query mixes `AND` with `OR`."]}]},
  {id:'POST-02',title:'Locate the vulnerability',
   body:[{p:'`ticket_id` comes from a URL parameter and is a string controlled by the visitor.'},
    {code:"1  def find_ticket(ticket_id):\n2      ticket_id = ticket_id.replace(\"'\", \"\")\n3      sql = \"SELECT * FROM tickets WHERE id = \" + ticket_id\n4      return cursor.execute(sql).fetchall()",lang:'Python'}],
   fields:[{key:'a',kind:'choice',label:'Is this code protected against SQL injection?',options:[
    'Protected: `fetchall()` limits what the query can return.',
    'Not protected: line 2 should also remove double quotes.',
    'Protected: line 2 removes the single quotes before the query is built.',
    'Not protected: line 3 adds the input to the SQL text, and because `id` has no quotes around it, an input such as `1 OR 1=1` works without any quote.']}]},
  {id:'POST-03',title:'Construct a numeric-input attack',
   body:[{p:'In a fictional local simulation, `note_id` is inserted directly into this query:'},
    {code:'sql = "SELECT * FROM notes WHERE id = " + note_id',lang:'Python'}],
   fields:[{key:'a',kind:'choice',label:'Which value of `note_id` makes the query return every row?',options:[
    '`7 AND 7=8`',
    '`7--`',
    '`7 OR 7=7`',
    '`7 OR 8=9`']}]},
  {id:'POST-04',title:'Reason about a UNION attack',
   body:[{p:'A simulated search returns these columns:'},
    {code:"SELECT subject, status FROM messages WHERE recipient = '<input>';",lang:'SQL'},
    {p:'A second table is defined as:'},
    {code:'profiles(id, display_name, access_code)',lang:'Table'},
    {p:'An attacker tries to add rows from `profiles` using `UNION SELECT`.'}],
   fields:[{key:'a',kind:'choice',label:'How many columns must the added `SELECT` return to match the first query?',options:[
    '3 columns','1 column','2 columns','4 columns']},
    {key:'b',kind:'choice',label:'In SQLite, what does `--` do to the SQL text that follows it on the same line?',options:[
    'The database stops and reports an error.',
    'It is read as two minus signs and does arithmetic.',
    'It makes the database run that part first.',
    'The database ignores it, as a comment.']}]},
  {id:'POST-05',title:'Repair a lookup',
   body:[{p:'`author` and `category` are user-controlled strings.'},
    {code:"sql = f\"SELECT * FROM articles WHERE author = '{author}' AND category = '{category}'\"\nrows = cursor.execute(sql).fetchall()",lang:'Python'},
    {p:"Rewrite these two lines to prevent SQL injection while keeping both search conditions. A legitimate author name such as `D'Angelo` must still work."}],
   fields:[{key:'a',kind:'code',label:'Your rewritten code',rows:6}]},
  {id:'POST-06',title:'Repair a contains search',
   body:[{p:'`keyword` is a user-controlled string. For this question, assume `keyword` itself contains neither `%` nor `_`.'},
    {code:"sql = \"SELECT * FROM films WHERE title LIKE '%\" + keyword + \"%'\"\nrows = cursor.execute(sql).fetchall()",lang:'Python'}],
   fields:[{key:'a',kind:'choice',label:'Which replacement prevents SQL injection and still finds titles that contain the keyword?',options:[
    '`cursor.execute("SELECT * FROM films WHERE title LIKE \'%?%\'", (keyword,))`',
    '`cursor.execute("SELECT * FROM films WHERE title LIKE ?", ("%" + keyword + "%",))`',
    '`cursor.execute("SELECT * FROM films WHERE title LIKE ?", "%" + keyword + "%")`',
    '`cursor.execute("SELECT * FROM films WHERE title LIKE ?", (keyword,))`']}]}
 ]
};
