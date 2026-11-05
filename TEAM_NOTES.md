# SecureCode: notes for the team

## Files
- `js/config.js`: server address, time limits, points
- `js/core.js`: shared engine (points, timer, hints, chatbot, logging, assignment)
- `js/level1.js`, `js/level2.js`: refresher, Level 1, Level 2
- `js/level3.js`: Level 3, with a small simulated database and the block builder
- `js/level4.js`: Level 4, with the code blanks, code editor and written explanation
- `server/`: the small server for the chatbot and logs

## Adding Level 3 or 4 (G)
Define `VIEWS.level3 = () => { ... }` in `js/level3.js`, and it appears on the map. Copy the end of `js/level2.js`:
- `learnStage({level, title, html, examples, onDone})` shows the text with a timer. The AI group also gets the chatbot, the no-AI group the examples.
- `runQuiz({level, title, questions, review, onDone})` handles points, hints or chatbot, and logging. For custom answers, give a question `render`, `isCorrect` and `describe`, like `spot` in `level2.js`.
- `finishLevel('level3', 'message')` ends the level.
- `log('type', {...})` records anything else.

Each question also needs `prompt` (plain text) and `key` (the answer). Only the chatbot sees these.

## Pretest, post-test, consent (E)
- `js/study.js`: start page with study information and consent, participant code, the two technical checks, the optional experience questions and the demo data page (`?demo-data=1`).
- `js/forms/pre-v1.js`, `js/forms/post-v1.js`: the question text only. No answers or scoring are in the site; the private rubric is kept outside the repository.
- `js/study-storage.js`: storage adapter. For the milestone it keeps responses in this browser only; replace it with an API adapter later (see `docs/ASSESSMENT_MILESTONE.md`).
- Order: consent, participant code, Starting check, diary, refresher, Levels 1-4, Final check, optional experience questions.

### What Levels 3-4 teach (the post-test can cover these)
Level 3, building attacks:
- Cut off a check with a quote and `--`, as in `admin'--`.
- A login uses the first row returned, so `admin' OR 1=1--` logs in as whoever comes first.
- Attack a number field with no quotes, as in `5 OR 1=1`. Removing quotes doesn't stop this.
- Use `UNION` to read another table. Both `SELECT`s need the same number of columns, and a leftover quote must be hidden with `--`.

Level 4, repairing code:
- Use `?` placeholders and pass the values separately, in the same order.
- `'?'` in quotes is not a placeholder.
- In a `LIKE` search, the `%` signs go in the value: `("%" + term + "%",)`.
- A one-value tuple needs a comma: `(term,)`.
- Removing quotes is not a fix. It misses number fields and changes names like O'Brien.
- Explain why placeholders work: the database reads the SQL before it receives the values.

Not taught, so please leave it out: `ORDER BY` columns and allowed lists.

## Level 3-4 design choices
- **Level 3 checks:** blocks run on the small database in `level3.js`, so any attack that works is accepted. It matched real SQLite on every query the blocks can produce.
- **Level 4 feedback:** both versions see the corrected code and explanation. The AI version can also ask the assistant about it. Explaining to a confused AI was left out because the no-AI version would have no equal task.
- **Level 4 final check:** the last two questions have no hints or chatbot in either version. They hide the engine's help panel using a `<style>` tag in the question, so `core.js` is unchanged.
- **Level 4 repair:** in the final check, students edit the login code themselves. `checkLoginFix` in `level4.js` requires fixed SQL text with `?` placeholders and separate values, then runs the SQL on the simulated database: the attack must fail, and normal logins must work, including O'Brien's. On 42 student-style answers compared with real Python and SQLite, it accepted nothing unsafe or broken. It can refuse unusual but safe code, such as manual quote escaping, so check the logged code in the `q_attempt` events if a student's score looks wrong.
- **Tutor material:** in every level's lesson, `learnStage` in `core.js` sends the tutor the no-AI worked examples and its limits. AI students can't see the examples unless the tutor shares them. `server/worker.js` is unchanged.

## Scoring the written explanation (`l4q4`)
The site gives everyone who answers 5 points, because keyword matching would be unfair. For the analysis, use the logged text from the `q_attempt` event for `l4q4`. Two people score it without seeing the group, with 1 point for each idea (0-3):
1. The SQL is fixed or read before the values arrive.
2. The input travels separately from the SQL text.
3. The input is treated as a value, so a quote or `--` can't change the query.

## Start page and passwords
- Participants no longer need a password: they read the study information, agree, and get a participant code. In the milestone demo the group comes from a local permuted-block list in the browser (balanced only within one browser); the real study should assign on the server.
- `teacher` (under "Team preview"): shows both versions side by side, level by level, and the test forms with dummy answers. Nothing is saved or logged, there are no time limits, and it never shows stored responses.

The passwords are in the public code, so they only keep the two doors apart. They aren't real security.

The server assigns each new student to the group with fewer students, counting those who finished the post-test and those who started in the last 2 hours. Students who drop out stop counting after 2 hours, so the next students refill their group. Current numbers: `https://securecode.securecode-server.workers.dev/counts`. To restart the count, change `ASSIGN_ROUND` in `server/wrangler.toml` and deploy.

## Testing
- `index.html?group=ai` or `?group=control` forces a version.
- `?reset=1` clears your progress. Do this between people on the same computer.

## Connecting the chatbot and logs
The chatbot uses Cloudflare Workers AI (model: Gemma 4), so only a free Cloudflare account is needed, with no API key.
```bash
cd server
npm install
npx wrangler login
npx wrangler kv namespace create LOGS
npx wrangler secret put ADMIN_TOKEN
npx wrangler deploy
```
Paste the KV id into `wrangler.toml` before deploying, then paste the address it prints into `API_URL` in `js/config.js`. To download the logs, open `<address>/logs?token=<ADMIN_TOKEN>`.

Free limits: about 10,000 AI units per day, which is roughly 500 chatbot messages by our estimate, and 1,000 log writes per day.
