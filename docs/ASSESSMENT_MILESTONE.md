# SecureCode assessment milestone

Status: working prototype. Submitted test and questionnaire answers are sent to the team's Cloudflare server and also kept in the browser. The consent text, storage and access still need to be reviewed before real participants take part.

## Proposed milestone wording

We propose replacing familiarity-focused questions with two short, matched technical assessments aligned with SecureCode's Understand, Spot, Attack, and Fix levels. The pre-test will precede all learning activities, and both study conditions will complete the assessments without AI, hints, or answer feedback.

The proposed survey interface will be accessible through a URL and QR code, with pseudonymous participant codes linking pre- and post-test responses. For this milestone, a local-only prototype will demonstrate the flow using dummy data; centralized database storage, researcher access controls, and finalized data-management procedures remain planned work before participant recruitment.

## What works now

Study flow, in this order:

1. A password page: `student` continues to the study, and `teacher` opens the team preview.
2. Start page with draft study information, a list of the data collected, and an explicit consent checkbox with "Agree and continue" and "I do not agree" buttons (no names, emails or student numbers). Declining creates no participant and records nothing. The consent version is stored with the participant and sent in the `start` log event.
3. A pseudonymous participant code (`SC-XXXX-XXXX`, with a check character to catch typing mistakes) is generated and shown.
4. Starting check (technical pre-test, 6 questions).
5. The open diary and the SQL refresher (unchanged).
6. Levels 1-4 in the assigned AI or no-AI version (unchanged lesson content).
7. Final check (technical post-test, 6 questions), unlocked only after Level 4.
8. Optional experience questions (1 open-ended question on difficulties, 4 rating items and 1 open comment, the same for both groups) and a completion message.

Assessment interface:

- One question per screen, "Question n of 6", a progress bar, labelled fields, readable code blocks, Back/Next, and keyboard operation using standard buttons and fields.
- Each question has an "I don't know" checkbox. While it is selected the answer fields are disabled and not submitted; anything already typed stays on screen in case the participant changes their mind. No minimum length, and partial answers are kept exactly as typed.
- Repair questions offer a neutral "Copy the original two lines into the box" button so participants on phones do not have to retype the code.
- A review screen before submitting, then a neutral acknowledgement with no answers, scores or points. The lesson points counter is hidden during both checks.
- No hints, assistant, lesson-review links, live SQL execution, correct-answer markers or answer feedback in either check, for either group.
- The same pre-test and post-test for both groups; the post-test file is loaded only after Level 4 is finished.
- Drafts are saved on every change, so a refresh returns to the same question with the same answers.
- Duplicate submissions are refused: a submitted attempt is final, and a second submission (double click, second tab) reports that nothing changed.
- Time spent on each question is recorded silently (paused while the tab is hidden). There are no speed bonuses and no time limits; both groups see the same timing line: "There is no time limit."

Participant code and resuming:

- The same code is used for the pre-test, the lesson logs and the post-test.
- "I already have a participant code" on the start page restores progress in the same browser.
- Across devices it cannot work yet: without a backend, progress exists only in the browser where it started. The page says so when a code is not found.

Assignment:

- Participants never choose their group, and the QR code and entry URL contain no condition.
- The server assigns each new participant to the group with fewer students, counting those who finished the post-test and those who started in the last 2 hours. Students who drop out stop counting after 2 hours, so the next students refill their group. Current numbers are at `/counts` on the server.
- If the server can't be reached, the site falls back to permuted blocks of four, balanced only within one browser. The stored `assignment_method` shows which one was used.
- The existing `?group=ai` / `?group=control` test parameters still exist for the team. They must be disabled or restricted before recruitment, because they let anyone choose a version.

Team preview:

- The teacher password, entered on the first page, shows both lesson versions side by side and also previews the Starting check, Final check and experience questions in both versions, with dummy answers that are not model answers. Nothing is saved, and it never shows stored responses.
- The password is in the public code, so it only separates the two doors and is not access control.

Demo data (`?demo-data=1`):

- Shows what is stored in this browser and offers manual JSON and CSV export, plus a "Clear demo data" control.
- The CSV is long format (one row per participant attempt and question) and keeps the exact typed text, including quotes, tabs and line breaks. Import it as text in a spreadsheet so answers starting with `=`, `+`, `-` or `@` are not read as formulas.
- This is a manual export, not centralized collection. Browser storage can be cleared or unavailable at any time.

Storage notice shown on every assessment screen:

> Your answers to the checks and the questionnaire are sent to the team's server when you submit them, along with your lesson activity. They are linked to your participant code, not your name.

A build with no server address (`scripts/build-demo.sh`) keeps everything in the browser and says so instead.

On the team's GitHub Pages site, lesson events, chatbot messages, and submitted test and questionnaire answers go to the team's Cloudflare Worker. Unfinished drafts stay in the browser, and test links such as `?group=ai` send no test answers. Download the answers from `/responses?token=<ADMIN_TOKEN>` on the server. A stored answer sheet is never overwritten, and answers that fail to send stay queued in the browser and are retried. The hosted demo build has the server address removed, so its AI version shows "The assistant is not connected yet" and sends nothing.

## Question-to-level mapping (researcher metadata)

Participants see only neutral titles such as "Interpret a query", never level names.

| Matched pair | Main level | Skill | Maximum points |
|---|---|---|---|
| PRE-01 / POST-01 | Understand | Query logic | 2 |
| PRE-02 / POST-02 | Spot | Unsafe data flow and inadequate filtering | 2 |
| PRE-03 / POST-03 | Attack | Numeric-input attack construction | 2 |
| PRE-04 / POST-04 | Attack | UNION shape and comment behaviour | 2 |
| PRE-05 / POST-05 | Fix | Safe multi-value query repair | 2 |
| PRE-06 / POST-06 | Fix | Safe LIKE query preserving behaviour | 2 |

Each test totals 12 points. Attack and Fix carry 4 points each and Understand and Spot carry 2 each, so the weighting is deliberately not equal across levels.

## Private grading plan

- A 0/1/2-point rubric for each matched pair, with partial-credit rules and technically equivalent SQLite solutions, is kept privately by the team, outside this repository and the served site. The team should agree on it before the real study and record a `rubric_version` with every score.
- For this milestone every response is stored as `grading_status: "not graded"` with an empty score. Submitting text never earns points.
- Grade blind to condition and, where possible, to phase (mix pre and post responses). A second reviewer should score ambiguous answers, with disagreements resolved and logged.
- If automatic grading is added later, validate it against human scores first, and never execute participant Python.
- Learning gain = post-test percentage minus pre-test percentage, in percentage points, using matched participant records only.
- Keep test scores separate from lesson points, hint and chat use, confidence and satisfaction.
- Distinguish "I don't know" (`dont_know`), skipped items (`skipped`) and a missing post-test (no submitted post attempt) in the analysis.
- These are proposed parallel forms, not validated equivalent instruments. Pilot them for clarity, completion time, difficulty and floor or ceiling effects before drawing conclusions about the AI condition. Six questions give limited coverage, so avoid strong claims about mastery of any single level.

## Timing

- Planning estimate: about 5-7 minutes per technical test. This is not a measured duration.
- Pilot the full session. If it must stay around 30 minutes, either shorten the lesson or agree on a reduced matched question set. The tests should not be added to a 30-minute lesson while still advertising 30 minutes in total.

## A fuller database: planned

Answers are currently stored in Cloudflare KV. This section describes a fuller backend, if the study needs one.

Replace `LocalDemoStudyStorage` in `js/study-storage.js` with an API adapter that has the same methods (`createParticipant`, `findParticipant`, `startAttempt`, `saveDraft`, `submitAttempt`, `saveExperience`). Proposed backend: an institution-approved PostgreSQL service behind a small API.

Conceptual records:

- `participants`: pseudonymous ID, consent version and status, assigned condition, study version, creation time.
- `assessment_attempts`: attempt ID, participant ID, phase (pre/post), form version, start and submission times (server time), completion status. Unique per (participant, phase).
- `responses`: attempt ID, stable question ID, raw answer parts, "I don't know" flag, response duration, later private score, rubric version.
- `lesson_events` (if approved): participant ID, level, event type, timestamp, hints and completion. Store AI chat content only if necessary and explicitly covered by the participant information and consent.

Server behaviour:

- Submit an attempt and all its responses in one transaction, with server-side timestamps and input validation (lengths, known question IDs, phase).
- Idempotent retries: the client sends a submission key, and repeating it returns the stored result. A finalized attempt can never be overwritten.
- Serve the post-test form only to participants whose pre-test is submitted and whose lesson is complete.
- Enforce participant ownership with a server-issued resume token, so a typed code cannot read or change someone else's attempt and participants can never list other responses.
- Use real authentication and authorization for researcher access, separate from the lesson's teacher password.
- Keep privileged database credentials and the private rubric out of the frontend and the repository, and use parameterized queries throughout.

Before any real collection, document access permissions, retention and deletion, hosting arrangements and consent language, and have the storage, consent text, access controls and study procedure reviewed. Describe records as pseudonymous, not anonymous. Do not ask for names, emails, student numbers or unnecessary demographic details.

## Known limitations of the prototype

- Static site: a determined visitor can open `js/forms/post-v1.js` directly. The interface prevents browsing it during the pre-test, but only a backend can enforce it.
- On a shared computer, start each new participant with `?reset=1`. Earlier demo records stay in the browser's demo store until cleared.
- Cross-device resume is planned, not implemented. The server only records the time it receives answers, and researcher access is a single shared password.
- The consent text is a placeholder for review.

## Deployment and QR

- Entry URL (stable, no parameters): https://goulartmaia.github.io/SecureCode/
- `scripts/build-demo.sh` builds a demo copy without the lesson server address, the `server/` folder or the team notes.
- `scripts/make_qr.py <url> <file.png>` makes the QR code and checks that it decodes back to the URL. The QR contains only the plain entry URL.
- Publishing is pending. On 5 November 2026 the QR for the URL above decoded correctly and the URL loaded (HTTP 200), but it still served the previous version without these changes. Re-test the QR after the branch is published. Publishing to the main Pages site also connects the lesson server again, so use dummy data only until the review is done.

## Verification (local browser tests, 5 November 2026)

Checked in Chromium on a local server, with the lesson server blocked or disconnected:

- 6 questions in each form, "Question n of 6", one per screen; Back, Next, Change and Return to review work.
- Both conditions got the same pre-test and post-test. During every question, no hint button, assistant, help panel or lesson-review link was present (0 such elements on all 12 screens, AI and no-AI).
- No answers, scores or points shown; the points counter is hidden during the checks.
- The post-test file was not loaded during the pre-test and the Final check stayed locked until Level 4 was finished.
- Keyboard: Tab reaches the code block, the answer fields and the buttons; Enter activates Next.
- Phone width (375 px): no horizontal page overflow; long code lines scroll inside their block.
- Refresh recovery: answers and the current question came back after reloading on questions 4 and 1 and on the intro screen.
- "I don't know": fields disabled, typed text kept on screen, nothing submitted for that item.
- Duplicate submission: a double click and a second tab produced one submitted attempt; the second tab reported that nothing was changed.
- Participant code: the same code was attached to the pre-test, lesson log events and post-test; resume by code worked in the same browser, and an unknown valid code showed the cross-device limitation message.
- Fallback assignment: four new participants in one browser were split two AI and two no-AI.
- Exports: JSON and CSV downloaded; parsing the CSV gave back exactly the stored text (quotes, tab, line breaks, a leading `=`), with 0 mismatches. Every item was "not graded" with an empty score.
- The storage notice appears on the start page and on every assessment screen.
- The existing diary, refresher, Levels 1-4 and the teacher view still load in both versions; the AI version still shows the assistant and the no-AI version still shows worked examples. The teacher view did not create or read any stored responses.

Not tested: real phones (only an emulated 375 px viewport), screen readers, the hosted GitHub Pages version of these changes, and anything involving a backend.
