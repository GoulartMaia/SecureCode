// Connects the chatbot to Workers AI, keeps the groups equal, and stores the study logs.
import { DurableObject } from "cloudflare:workers";

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

// Keeps the two groups equal. Every request goes through this one object in turn, so two students
// starting at the same moment can't both read an old count.
// A group's count is its finished students plus those who started recently. Students who start and
// never finish stop counting after ACTIVE_MS, so the next students refill the group they left.
export class Assigner extends DurableObject {
  async counts() {
    const activeMs = Number(this.env.ACTIVE_MS) || 2 * 60 * 60 * 1000;
    const c = { ai: { finished: 0, inProgress: 0 }, control: { finished: 0, inProgress: 0 } };
    const all = await this.ctx.storage.list({ prefix: "p:" });
    for (const p of all.values()) {
      if (p.finished) c[p.group].finished++;
      else if (Date.now() - p.started < activeMs) c[p.group].inProgress++;
    }
    return c;
  }
  async assign(code) {
    const known = await this.ctx.storage.get(`p:${code}`);
    if (known) return known.group;
    const c = await this.counts();
    const ai = c.ai.finished + c.ai.inProgress;
    const control = c.control.finished + c.control.inProgress;
    const group = ai === control ? (Math.random() < 0.5 ? "ai" : "control") : ai < control ? "ai" : "control";
    await this.ctx.storage.put(`p:${code}`, { group, started: Date.now(), finished: false });
    return group;
  }
  async finish(code) {
    const known = await this.ctx.storage.get(`p:${code}`);
    if (known) await this.ctx.storage.put(`p:${code}`, { ...known, finished: true });
    return !!known;
  }
}

// To restart the count before real participants, change ASSIGN_ROUND in wrangler.toml and deploy.
const assigner = (env) => env.ASSIGNER.get(env.ASSIGNER.idFromName(env.ASSIGN_ROUND || "round-1"));
const PARTICIPANT_CODE = /^SC-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

async function assignment(request, env, action) {
  const { code } = await request.json();
  if (!PARTICIPANT_CODE.test(code ?? "")) return json(env, { error: "invalid code" }, 400);
  const stub = assigner(env);
  if (action === "finish") return json(env, { ok: await stub.finish(code) });
  return json(env, { group: await stub.assign(code) });
}

async function saveLog(request, env) {
  // Logs use a request type browsers send without asking first. A copy of the site on another address
  // can't read our reply, so it would resend the same batch forever. Refuse those before storing anything.
  const origin = request.headers.get("Origin");
  if (origin && env.ALLOWED_ORIGIN && env.ALLOWED_ORIGIN !== "*" && origin !== env.ALLOWED_ORIGIN) {
    return json(env, { error: "forbidden" }, 403);
  }
  const events = JSON.parse(await request.text());
  if (!Array.isArray(events) || events.length > 50) return json(env, { error: "invalid log" }, 400);
  const code = String(events[0]?.code ?? "unknown").slice(0, 20);
  await env.LOGS.put(`${code}:${Date.now()}:${crypto.randomUUID()}`, JSON.stringify(events));
  return json(env, { ok: true });
}

// Finished pretests, posttests and questionnaires. A stored answer sheet is never overwritten,
// so a repeated send from the browser changes nothing.
const STUDY_KINDS = ["pre", "post", "experience"];

async function saveStudy(request, env) {
  const text = await request.text();
  if (text.length > 200000) return json(env, { error: "too large" }, 413);
  const { code, kind, record } = JSON.parse(text);
  if (!PARTICIPANT_CODE.test(code ?? "") || !STUDY_KINDS.includes(kind) || typeof record !== "object" || !record) {
    return json(env, { error: "invalid request" }, 400);
  }
  const key = `study:${code}:${kind}`;
  if (await env.LOGS.get(key)) return json(env, { ok: true, duplicate: true });
  await env.LOGS.put(key, JSON.stringify({ code, kind, received_at: new Date().toISOString(), ...record }));
  return json(env, { ok: true });
}

async function readStudy(url, env) {
  if (!env.ADMIN_TOKEN || url.searchParams.get("token") !== env.ADMIN_TOKEN) return json(env, { error: "forbidden" }, 403);
  const out = [];
  let cursor;
  do {
    const page = await env.LOGS.list({ prefix: "study:", cursor });
    for (const k of page.keys) out.push(JSON.parse(await env.LOGS.get(k.name)));
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return json(env, out);
}

async function readLogs(url, env) {
  if (!env.ADMIN_TOKEN || url.searchParams.get("token") !== env.ADMIN_TOKEN) return json(env, { error: "forbidden" }, 403);
  const out = [];
  let cursor;
  do {
    const page = await env.LOGS.list({ cursor });
    for (const k of page.keys.filter((k) => !k.name.startsWith("count:") && !k.name.startsWith("study:"))) out.push(...JSON.parse(await env.LOGS.get(k.name)));
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
      if (request.method === "POST" && url.pathname === "/assign") return await assignment(request, env, "assign");
      if (request.method === "POST" && url.pathname === "/finish") return await assignment(request, env, "finish");
      if (request.method === "GET" && url.pathname === "/counts") return json(env, await assigner(env).counts());
      if (request.method === "POST" && url.pathname === "/log") return await saveLog(request, env);
      if (request.method === "GET" && url.pathname === "/logs") return await readLogs(url, env);
      if (request.method === "POST" && url.pathname === "/study") return await saveStudy(request, env);
      if (request.method === "GET" && url.pathname === "/responses") return await readStudy(url, env);
      return json(env, { error: "not found" }, 404);
    } catch (e) {
      console.error(e);
      return json(env, { error: "server error" }, 500);
    }
  },
};
