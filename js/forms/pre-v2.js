/* Technical pre-test, form pre-v2. Participant-facing text only: no answer keys, scoring or level mapping here.
   The private answer key and rubric are kept outside this repository. Inline `code` in strings is shown as code.
   Five of the six questions are multiple choice (marked automatically). PRE-05 is the one open code-repair question.
   A "choice" field stores the letter the participant picked (A, B, C or D). */
(window.SC_FORMS=window.SC_FORMS||{})['pre-v2']={
 phase:'pre',version:'pre-v2',
 questions:[
  {id:'PRE-01',title:'Interpret a query',
   body:[{p:'The `members` table contains several rows. A member named Nora exists, but her password is not `wrong`.'},
    {code:"SELECT * FROM members\nWHERE name = 'Nora' AND password = 'wrong' OR '4' = '4';",lang:'SQL'}],
   fields:[{key:'a',kind:'choice',label:'Which rows does this query return?',options:[
    "No rows, because Nora's password is not `wrong`.",
    "Only Nora's row, because the name is checked first.",
    "Every row in the table, because `AND` is evaluated before `OR`, and `'4' = '4'` is always true.",
    "An error, because the query mixes `AND` with `OR`."]}]},
  {id:'PRE-02',title:'Locate the vulnerability',
   body:[{p:'`code` comes from a URL parameter and is a string controlled by the visitor.'},
    {code:"1  def find_item(code):\n2      code = code.replace(\"'\", \"\")\n3      sql = \"SELECT * FROM items WHERE id = \" + code\n4      return cursor.execute(sql).fetchall()",lang:'Python'}],
   fields:[{key:'a',kind:'choice',label:'Is this code protected against SQL injection?',options:[
    'Protected: line 2 removes the single quotes before the query is built.',
    'Not protected: line 3 adds the input to the SQL text, so some attacks still work.',
    'Not protected: line 2 should also remove double quotes.',
    'Protected: `fetchall()` limits what the query can return.']}]},
  {id:'PRE-03',title:'Construct a numeric-input attack',
   body:[{p:'In a fictional local simulation, `item_id` is inserted directly into this query:'},
    {code:'sql = "SELECT * FROM items WHERE id = " + item_id',lang:'Python'}],
   fields:[{key:'a',kind:'choice',label:'Which value of `item_id` makes the query return every row?',options:[
    '`1" OR 1=1`',
    '`It is not possible to return every row, only rows of a specific id`',
    '`1--`',
    '`1 OR 1=1`']}]},
  {id:'PRE-04',title:'Reason about a UNION attack',
   body:[{p:'A simulated search returns these columns:'},
    {code:"SELECT title, category FROM documents WHERE owner = '<input>';",lang:'SQL'},
    {p:'A second table is defined as:'},
    {code:'accounts(id, username, password)',lang:'Table'},
    {p:'An attacker tries to add rows from `accounts` using `UNION SELECT`.'}],
   fields:[{key:'a',kind:'choice',label:'How many columns must the added `SELECT` return to match the first query?',options:[
    '1 column','2 columns','3 columns','4 columns']},
    {key:'b',kind:'choice',label:'In SQLite, what does `--` do to the SQL text that follows it on the same line?',options:[
    'The database ignores it, as a comment.',
    'The database stops and reports an error if it is placed before a ;.',
    'It is read as two minus signs and does arithmetic.',
    'It makes the database run that part first.']}]},
  {id:'PRE-05',title:'Repair a lookup',
   body:[{p:'`name` and `city` are user-controlled strings.'},
    {code:"sql = f\"SELECT * FROM members WHERE name = '{name}' AND city = '{city}'\"\nrows = cursor.execute(sql).fetchall()",lang:'Python'},
    {p:"Rewrite these two lines to prevent SQL injection while keeping both search conditions. A legitimate name such as `O'Brien` must still work."}],
   fields:[{key:'a',kind:'code',label:'Your rewritten code',rows:6}]},
  {id:'PRE-06',title:'Repair a contains search',
   body:[{p:'`term` is a user-controlled string. For this question, assume `term` itself contains neither `%` nor `_`.'},
    {code:"sql = \"SELECT * FROM books WHERE title LIKE '%\" + term + \"%'\"\nrows = cursor.execute(sql).fetchall()",lang:'Python'}],
   fields:[{key:'a',kind:'choice',label:'Which replacement prevents SQL injection and still finds titles that contain the term?',options:[
    '`cursor.execute("SELECT * FROM books WHERE title LIKE \'%?%\'", (term,))`',
    '`cursor.execute("SELECT * FROM books WHERE title LIKE ?", (term,))`',
    '`cursor.execute("SELECT * FROM books WHERE title LIKE ?", ("%" + term + "%",))`',
    '`cursor.execute("SELECT * FROM books WHERE title LIKE ?", "%" + term + "%")`']}]}
 ]
};
