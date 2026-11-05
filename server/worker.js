// Connects the chatbot to Workers AI, keeps the groups equal, and stores the study logs.

const SYSTEM = `You are the tutor in SecureCode, a 30-minute lesson for EPFL undergraduates on SQL injection. All practice happens in a simulation.

Keep every reply under 80 words and in plain language. Write plain text only, with no markdown symbols such as asterisks or backticks. Talk only about SQL and SQL injection in the lesson; for anything else, steer back politely. Never help attack a real system.

The "stage" in the exercise data decides what you may do:
- learn: explain the topic freely, with short examples.
- question: the student is answering a scored question. Never state the answer, and never rule options in or out. If they propose an answer or ask whether they are right, do not say right, wrong, correct, close or anything similar, and do not repeat their answer back. Say that the Check answer button will tell them, then ask one question about their reasoning. Otherwise, point at their specific misunderstanding or ask one guiding question. Each reply is one hint.
- after: the question is over, so you may explain the answer fully. If they are still unsure, give one new similar exercise and let them try it.`;

const cors = (env) => ({
  "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
});
const json = (env, body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...cors(env) } });

async function chat(request, env) {
  const { messages, context } = await request.json();
  const valid =
    Array.isArray(messages) && messages.length > 0 && messages.length <= 24 &&
    messages.every((m) => ["user", "assistant"].includes(m.role) && typeof m.content === "string" && m.content.length <= 1500);
  const data = JSON.stringify(context ?? {});
  if (!valid || data.length > 5000) return json(env, { error: "invalid request" }, 400);

  const result = await env.AI.run(env.MODEL || "@cf/google/gemma-4-26b-a4b-it", {
    messages: [{ role: "system", content: `${SYSTEM}\n\nExercise data (from the lesson):\n${data}` }, ...messages],
    max_tokens: 400,
    chat_template_kwargs: { enable_thinking: false },
  });
  const reply = (result.choices?.[0]?.message?.content ?? result.response ?? "").trim();
  if (!reply) return json(env, { error: "empty reply" }, 502);
  return json(env, { reply });
}

// Gives each new student the group with fewer students so far, so the two groups stay equal.
async function assign(env) {
  const [ai, control] = await Promise.all([env.LOGS.get("count:ai"), env.LOGS.get("count:control")]).then((v) => v.map(Number));
  const group = ai === control ? (Math.random() < 0.5 ? "ai" : "control") : ai < control ? "ai" : "control";
  await env.LOGS.put(`count:${group}`, String((group === "ai" ? ai : control) + 1));
  return json(env, { group, ai: ai + (group === "ai"), control: control + (group === "control") });
}

async function saveLog(request, env) {
  const events = JSON.parse(await request.text());
  if (!Array.isArray(events) || events.length > 50) return json(env, { error: "invalid log" }, 400);
  const code = String(events[0]?.code ?? "unknown").slice(0, 20);
  await env.LOGS.put(`${code}:${Date.now()}:${crypto.randomUUID()}`, JSON.stringify(events));
  return json(env, { ok: true });
}

async function readLogs(url, env) {
  if (!env.ADMIN_TOKEN || url.searchParams.get("token") !== env.ADMIN_TOKEN) return json(env, { error: "forbidden" }, 403);
  const out = [];
  let cursor;
  do {
    const page = await env.LOGS.list({ cursor });
    for (const k of page.keys.filter((k) => !k.name.startsWith("count:"))) out.push(...JSON.parse(await env.LOGS.get(k.name)));
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return json(env, out);
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: cors(env) });
    const url = new URL(request.url);
    try {
      if (request.method === "POST" && url.pathname === "/chat") return await chat(request, env);
      if (request.method === "POST" && url.pathname === "/assign") return await assign(env);
      if (request.method === "POST" && url.pathname === "/log") return await saveLog(request, env);
      if (request.method === "GET" && url.pathname === "/logs") return await readLogs(url, env);
      return json(env, { error: "not found" }, 404);
    } catch (e) {
      console.error(e);
      return json(env, { error: "server error" }, 500);
    }
  },
};
