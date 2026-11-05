# SecureCode: notes for the team

## Files
- `js/config.js`: server address, time limits, points
- `js/core.js`: shared engine (points, timer, hints, chatbot, logging, assignment)
- `js/level1.js`, `js/level2.js`: refresher, Level 1, Level 2
- `js/level3.js`, `js/level4.js`: empty, for G
- `server/`: the small server for the chatbot and logs

## Adding Level 3 or 4 (G)
Define `VIEWS.level3 = () => { ... }` in `js/level3.js`, and it appears on the map. Copy the end of `js/level2.js`:
- `learnStage({level, title, html, examples, onDone})` shows the text with a timer. The AI group also gets the chatbot, the no-AI group the examples.
- `runQuiz({level, title, questions, review, onDone})` handles points, hints or chatbot, and logging. For custom answers, give a question `render`, `isCorrect` and `describe`, like `spot` in `level2.js`.
- `finishLevel('level3', 'message')` ends the level.
- `log('type', {...})` records anything else.

Each question also needs `prompt` (plain text) and `key` (the answer). Only the chatbot sees these.

## Pretest, post-test, consent (E)
Add the views in a new file and register them in `LEVELS` in `js/core.js`. `welcome()` in `core.js` is the start page, so consent and the pretest can go right after it.

## Start page and passwords
- `student`: starts the lesson in the AI or no-AI version. The server gives the group with fewer students so far. Without the server it's a coin flip, so the groups may not be equal.
- `teacher`: shows both versions side by side, level by level. Nothing is saved or logged, and there are no time limits.

The passwords are in the public code, so they only keep the two doors apart. They aren't real security.

Students who start but don't finish still count towards their group, so check the numbers while recruiting.

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
