import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = "https://mmzizgsanwqjpiumpqay.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1teml6Z3NhbndxanBpdW1wcWF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwMjk5MzksImV4cCI6MjEwMTYwNTkzOX0.KqvY2Ib33J8h8ztEi8qxtfutSdVIPAaJRtj7cSUSKFM";

const GROQ_MODEL = "qwen/qwen3.6-27b";
const COMPOUND_MODEL = "groq/compound-mini";

// All three expose an OpenAI-compatible chat completions endpoint, so one
// code path can drive all of them — just a different base URL/model/key per provider.
const PROVIDERS: Record<string, { baseUrl: string; model: string; keyEnv: string }> = {
  groq: { baseUrl: "https://api.groq.com/openai/v1/chat/completions", model: GROQ_MODEL, keyEnv: "GROQ_API_KEY_SPOCKS" },
  gemini: { baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", model: "gemini-2.5-flash-lite", keyEnv: "GEMINI_API_KEY_SPOCKS" },
  cerebras: { baseUrl: "https://api.cerebras.ai/v1/chat/completions", model: "llama-3.3-70b", keyEnv: "CEREBRAS_API_KEY_SPOCKS" },
  openrouter: { baseUrl: "https://openrouter.ai/api/v1/chat/completions", model: "meta-llama/llama-3.3-70b-instruct:free", keyEnv: "OPENROUTER_API_KEY_SPOCKS" },
};

// Restrict external web search to sites the alliance already trusts/links to,
// plus Reddit and Scopely's own official pages — never the open web at large.
const EXTERNAL_SEARCH_DOMAINS = [
  "stfc.phd", "stfc.cfd", "stfc.pro", "territory.lol",
  "reddit.com", "startrekfleetcommand.com", "scopely.helpshift.com",
];

// Only pay for a web-search-capable model when the question actually looks like
// it needs something current/external — official patch notes, community discussion,
// news — rather than routing every single question through the pricier tool-using model.
const EXTERNAL_TRIGGER_WORDS = [
  "patch", "patch notes", "update", "changelog", "release notes", "news",
  "reddit", "official", "wiki", "bug", "known issue", "downtime", "maintenance",
  "announcement", "latest version", "current version", "this week", "recently",
  "just released", "new update",
];

function needsExternalSearch(text: string): boolean {
  const t = text.toLowerCase();
  return EXTERNAL_TRIGGER_WORDS.some((w) => t.includes(w));
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(obj: unknown, status: number) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const STOPWORDS = new Set([
  "the","a","an","is","are","was","were","what","which","who","when","where",
  "why","how","do","does","did","can","could","should","would","for","of",
  "in","on","at","to","and","or","my","me","i","you","we","it","this","that",
  "with","about","tell","show","give","please","have","has","need","want",
]);

function keywordsFrom(text: string): string[] {
  return [...new Set(
    text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))
  )];
}

function anyMatch(haystack: string, keywords: string[]): boolean {
  const h = haystack.toLowerCase();
  return keywords.some((k) => h.includes(k));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Defense in depth beyond verify_jwt: confirm this is an *approved* tracker
    // member, not merely someone with a valid-but-unapproved Supabase session
    // (e.g. mid-signup, pending an officer's approval).
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return json({ error: "Not signed in" }, 401);
    const { data: profile } = await sb.from("tracker_profiles")
      .select("approved,is_admin").eq("id", user.id).maybeSingle();
    if (!profile?.approved) return json({ error: "Account not yet approved" }, 403);

    const body = await req.json();
    const messages: { role: string; content: string }[] = Array.isArray(body?.messages) ? body.messages : [];
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
    if (!lastUserMsg.trim()) return json({ error: "No question provided" }, 400);

    // Only admins can pick something other than the default — everyone else
    // always gets the stable, tested Groq path regardless of what's sent.
    const requestedProvider = typeof body?.provider === "string" ? body.provider : "groq";
    const provider = (profile.is_admin && PROVIDERS[requestedProvider]) ? requestedProvider : "groq";

    const keywords = keywordsFrom(lastUserMsg);
    const contextParts: string[] = [];
    const sources: { type: string; title: string; url?: string; image?: string }[] = [];
    const useExternal = provider === "groq" && needsExternalSearch(lastUserMsg);

    // Current arc — cheap and almost always useful context.
    const { data: activeArc } = await sb.from("arcs").select("name,status")
      .eq("status", "active").limit(1).maybeSingle();
    if (activeArc) contextParts.push(`CURRENT ARC: ${activeArc.name}`);

    // Upcoming/current alliance scoring events (the admin-curated threshold events).
    const today = new Date().toISOString().slice(0, 10);
    const { data: events } = await sb.from("events")
      .select("name,date,end_date,scoring_type,threshold")
      .eq("is_test", false).order("date", { ascending: true }).limit(60);
    const activeOrUpcoming = (events || []).filter((e) => {
      const endsOn = e.end_date || e.date;
      return endsOn >= today; // still running or hasn't happened yet
    }).slice(0, 12);
    if (activeOrUpcoming.length) {
      contextParts.push(
        "UPCOMING/CURRENT ALLIANCE SCORING EVENTS:\n" +
        activeOrUpcoming.map((e) => `- ${e.name} (${e.date}${e.end_date && e.end_date !== e.date ? ` to ${e.end_date}` : ""})${e.threshold ? `, threshold ${e.threshold}` : ""}`).join("\n")
      );
    }

    // The broader live game event calendar (Territory Capture, Wave Defense, etc.) —
    // auto-refreshed every 4 hours by a scraper, served as a public JSON file. This is
    // NOT lazy or dependent on anyone having opened a page; it's fetched fresh here.
    try {
      const gameEventsRes = await fetch("https://stfc.phoenixeu168.space/events-data-game.json", { cache: "no-store" });
      if (gameEventsRes.ok) {
        const gameEventsData = await gameEventsRes.json();
        const nowIso = new Date().toISOString();
        const soonIso = new Date(Date.now() + 10 * 86400000).toISOString();
        const relevant = (gameEventsData.events || [])
          .filter((e: any) => e.endUTC >= nowIso && e.startUTC <= soonIso)
          .sort((a: any, b: any) => a.startUTC.localeCompare(b.startUTC))
          .slice(0, 15);
        if (relevant.length) {
          contextParts.push(
            "LIVE GAME EVENT CALENDAR (currently active or starting within 10 days; refreshed every 4 hours):\n" +
            relevant.map((e: any) =>
              `- ${e.title}${e.eventFormat ? ` [${e.eventFormat}]` : ""}: ${e.startUTC.slice(0, 16).replace("T", " ")} UTC to ${e.endUTC.slice(0, 16).replace("T", " ")} UTC${e.description ? ` — ${e.description}` : ""}`
            ).join("\n")
          );
        }
      }
    } catch { /* live calendar is best-effort; never block the answer on it */ }

    // Crews — only pull rows that look relevant to the question, to keep this cheap.
    const { data: allCrews } = await sb.from("crews").select("title,hostile_types,notes,warning,link_url,link_label,image_url").limit(300);
    const matchedCrews = (allCrews || []).filter((c) =>
      keywords.length === 0 || anyMatch(`${c.title} ${(c.hostile_types || []).join(" ")} ${c.notes ?? ""}`, keywords)
    ).slice(0, 8);
    if (matchedCrews.length) {
      contextParts.push(
        "RELEVANT CREW RECOMMENDATIONS (from the alliance's own crew guide):\n" +
        matchedCrews.map((c) =>
          `- ${c.title}${c.hostile_types?.length ? ` [${c.hostile_types.join(", ")}]` : ""}: ${c.notes ?? "no notes"}${c.warning ? ` (WARNING: ${c.warning})` : ""}`
        ).join("\n")
      );
      for (const c of matchedCrews.slice(0, 4)) {
        if (c.link_url || c.image_url) {
          sources.push({ type: "crew", title: c.link_label || c.title, url: c.link_url || undefined, image: c.image_url || undefined });
        }
      }
    }

    // F2P tasks — same keyword-relevance filter.
    const { data: allTasks } = await sb.from("f2p_tasks").select("task,category,notes").limit(300);
    const matchedTasks = (allTasks || []).filter((t) =>
      keywords.length > 0 && anyMatch(`${t.task} ${t.category ?? ""} ${t.notes ?? ""}`, keywords)
    ).slice(0, 8);
    if (matchedTasks.length) {
      contextParts.push(
        "RELEVANT F2P TASK GUIDE ENTRIES:\n" +
        matchedTasks.map((t) => `- [${t.category ?? "General"}] ${t.task}${t.notes ? ` — ${t.notes}` : ""}`).join("\n")
      );
    }

    // Reference sheets — searched against a daily-refreshed index of each sheet's
    // actual content (not just title/tags), so a question can find a sheet even
    // if the answer is buried in its cells rather than its catalog description.
    try {
      const { data: allSheets } = await sb.from("sheet_content_index")
        .select("title,category,tags,description,sheet_url,image_link,content_text")
        .limit(200);
      const matchedSheets = (allSheets || []).filter((s) =>
        keywords.length > 0 &&
        anyMatch(`${s.title ?? ""} ${s.category ?? ""} ${s.description ?? ""} ${s.tags ?? ""} ${s.content_text ?? ""}`, keywords)
      ).slice(0, 2);
      console.log("sheet index rows available:", (allSheets || []).length, "| matched:", matchedSheets.map((s) => s.title));
      for (const sheet of matchedSheets) {
        if (sheet.content_text) {
          contextParts.push(`SHEET "${sheet.title}" (${sheet.description ?? "no description"}), data excerpt:\n${sheet.content_text.slice(0, 4000)}`);
        } else {
          contextParts.push(`SHEET "${sheet.title}" (${sheet.description ?? "no description"}) — matched by title/category/tags; no cell content indexed for this one.`);
        }
        sources.push({ type: "sheet", title: sheet.title || "Reference sheet", url: sheet.sheet_url || undefined, image: sheet.image_link || undefined });
      }
    } catch (e) { console.error("sheet index lookup error:", (e as Error).message); }

    const systemPrompt = `You are "Spock's Wisdom," an assistant for the Phoenix EU168 alliance in Star Trek Fleet Command (STFC). Answer in a measured, logical, dryly-witted tone reminiscent of Spock — precise, unflustered, the occasional deadpan observation, but always genuinely helpful and never sacrificing clarity for character.

FORMATTING: This chat window displays plain text only — it does not render markdown. Never use asterisks, bold markers, pipe tables, or markdown headers. Write in plain prose and, if a list genuinely helps, use simple numbered lines or dashes with no other markup.

FRESHNESS: The event, crew, task, and sheet information below (if any) is current — events and crews are fetched fresh for this exact question, and sheet content is refreshed daily. None of it is stale training data and you do not need internet access to use it. Never say you lack "live" or "real-time" access when current data is provided below; just answer from it directly. Only say you don't have information if the relevant section below is genuinely absent or empty.

ACCURACY: Never invent officer or crew names that are not real Star Trek Fleet Command content. If the alliance-specific crew data provided below does not cover the situation asked about, say so plainly and either answer from genuine, real STFC officer knowledge you are confident in, or state that you do not have a confirmed recommendation — do not fabricate a plausible-sounding crew to fill the gap. Precision matters more than always having an answer.

When alliance-specific context is provided below (events, crews, F2P tasks, reference sheets), prefer it over your own general knowledge. Keep answers reasonably concise unless the question calls for depth.

${useExternal ? "For THIS question, you have a web search tool available, restricted to Reddit, the official Star Trek Fleet Command site, Scopely's official support pages, and a short list of trusted STFC community tools. Use it if the question genuinely needs current information those sources would have; don't search if the context below already answers it." : ""}

${contextParts.length ? contextParts.join("\n\n") : "(No specific alliance data matched this question — answer from genuine STFC knowledge only, or say you don't have a confirmed answer.)"}`;

    const groqKey = Deno.env.get("GROQ_API_KEY_SPOCKS"); // still needed for the external-search path, which is Groq-only
    const providerConfig = PROVIDERS[provider];
    const providerKey = Deno.env.get(providerConfig.keyEnv);
    if (!providerKey) return json({ error: `${providerConfig.keyEnv} is not configured on this project` }, 500);

    const requestBody: Record<string, unknown> = useExternal
      ? {
          model: COMPOUND_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            ...messages.slice(-10),
          ],
          temperature: 0.6,
          citation_options: "disabled", // we build our own source chips instead of inline bracket citations
          compound_custom: { tools: { enabled_tools: ["web_search"] } },
          search_settings: { include_domains: EXTERNAL_SEARCH_DOMAINS },
        }
      : {
          model: providerConfig.model,
          messages: [
            { role: "system", content: systemPrompt },
            ...messages.slice(-10),
          ],
          temperature: 0.6,
          ...(provider === "groq" ? { reasoning_format: "hidden" } : {}),
        };

    let apiRes = await fetch(useExternal ? PROVIDERS.groq.baseUrl : providerConfig.baseUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${useExternal ? groqKey : providerKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    let usedFallback = false;
    if (!apiRes.ok && useExternal) {
      // groq/compound-mini has a known intermittent instability on Groq's side
      // (fails even on trivial prompts sometimes) — rather than show a raw API
      // error, fall back to a normal answer without web search this one time.
      usedFallback = true;
      const fallbackPrompt = systemPrompt + "\n\n(Note: web search was attempted for this question but the search tool failed. Answer from the context above and your own genuine knowledge, and mention briefly that live search wasn't available this time if that matters to the answer.)";
      apiRes = await fetch(PROVIDERS.groq.baseUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${groqKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: "system", content: fallbackPrompt },
            ...messages.slice(-10),
          ],
          temperature: 0.6,
          reasoning_format: "hidden",
        }),
      });
    }

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      return json({ error: `${provider} request failed: ${errText}` }, 502);
    }

    const apiData = await apiRes.json();
    let reply = apiData?.choices?.[0]?.message?.content ?? "I have no response to offer at this time.";
    // Defensive: strip any reasoning leakage that occasionally slips through despite
    // reasoning_format:"hidden" (the same issue previously seen with Groq's models
    // in the screenshot-scoring feature).
    reply = reply.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
    if (!reply) reply = "I have no response to offer at this time.";

    // Pull real URLs out of whichever external sites Compound actually visited,
    // so the client can render them as clickable source chips.
    if (useExternal && !usedFallback) {
      const executedTools = apiData?.choices?.[0]?.message?.executed_tools ?? [];
      const foundUrls = new Set<string>();
      const raw = JSON.stringify(executedTools);
      const urlMatches = raw.match(/https?:\/\/[^\s"\\]+/g) || [];
      for (const u of urlMatches) {
        if (EXTERNAL_SEARCH_DOMAINS.some((d) => u.includes(d))) foundUrls.add(u.replace(/[),.]+$/, ""));
      }
      for (const u of [...foundUrls].slice(0, 4)) {
        let title = u;
        try { title = new URL(u).hostname.replace(/^www\./, ""); } catch { /* keep raw */ }
        sources.push({ type: "web", title, url: u });
      }
    }

    return json({ reply, sources, provider, searchFallback: usedFallback && useExternal }, 200);
  } catch (e) {
    return json({ error: `Unexpected error: ${(e as Error).message}` }, 500);
  }
});
