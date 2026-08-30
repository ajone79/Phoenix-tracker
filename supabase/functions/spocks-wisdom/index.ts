import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Papa from "https://esm.sh/papaparse@5.4.1";

const SUPABASE_URL = "https://mmzizgsanwqjpiumpqay.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1teml6Z3NhbndxanBpdW1wcWF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwMjk5MzksImV4cCI6MjEwMTYwNTkzOX0.KqvY2Ib33J8h8ztEi8qxtfutSdVIPAaJRtj7cSUSKFM";

const GROQ_MODEL = "qwen/qwen3.6-27b";
const SHEETS_CATALOG_URL =
  "https://docs.google.com/spreadsheets/d/1AHbQfUYpL3_DpRV-J0m2PbPVYCuzZe3P5t763xaJ5uA/export?format=csv";

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

function extractSheetId(url: string): string | null {
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : null;
}

async function fetchSheetSnippet(sheetUrl: string): Promise<string | null> {
  const id = extractSheetId(sheetUrl);
  if (!id) return null;
  let gid = "";
  try {
    const u = new URL(sheetUrl);
    gid = u.searchParams.get("gid") || (u.hash.match(/gid=([0-9]+)/)?.[1] ?? "");
  } catch { /* ignore */ }
  const exportUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv${gid ? `&gid=${gid}` : ""}`;
  try {
    const res = await fetch(exportUrl);
    if (!res.ok) return null;
    const text = await res.text();
    // Cap to the first ~60 rows so one sheet can't blow the whole prompt budget.
    const lines = text.split("\n").slice(0, 60);
    return lines.join("\n").slice(0, 4000);
  } catch {
    return null;
  }
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
      .select("approved").eq("id", user.id).maybeSingle();
    if (!profile?.approved) return json({ error: "Account not yet approved" }, 403);

    const body = await req.json();
    const messages: { role: string; content: string }[] = Array.isArray(body?.messages) ? body.messages : [];
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
    if (!lastUserMsg.trim()) return json({ error: "No question provided" }, 400);

    const keywords = keywordsFrom(lastUserMsg);
    const contextParts: string[] = [];
    const sources: { type: string; title: string; url?: string; image?: string }[] = [];

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

    // Reference sheets catalog — fetch the master list, keyword-match, then pull
    // the actual cell content of the best 1-2 matches (this is what makes sheet
    // content visible to the bot even if nobody has opened that sheet today).
    try {
      const catRes = await fetch(`${SHEETS_CATALOG_URL}&_cacheBust=${Date.now()}`, { cache: "no-store" });
      if (catRes.ok) {
        const catText = await catRes.text();
        const parsed = Papa.parse(catText, { header: true, skipEmptyLines: "greedy" });
        const rows = (parsed.data as Record<string, string>[]).filter((r) => r.Title || r["Sheet URL"]);
        const matched = rows.filter((r) =>
          keywords.length > 0 &&
          anyMatch(`${r.Title ?? ""} ${r.Category ?? ""} ${r.Description ?? ""} ${r.Tags ?? ""}`, keywords)
        ).slice(0, 2);
        for (const sheet of matched) {
          const url = sheet["Sheet URL"];
          if (!url) continue;
          const snippet = await fetchSheetSnippet(url);
          if (snippet) {
            contextParts.push(`SHEET "${sheet.Title}" (${sheet.Description ?? "no description"}), raw data excerpt:\n${snippet}`);
          }
          sources.push({ type: "sheet", title: sheet.Title || "Reference sheet", url, image: sheet["Image Link"] || undefined });
        }
      }
    } catch { /* sheets catalog is best-effort; never block the answer on it */ }

    const systemPrompt = `You are "Spock's Wisdom," an assistant for the Phoenix EU168 alliance in Star Trek Fleet Command (STFC). Answer in a measured, logical, dryly-witted tone reminiscent of Spock — precise, unflustered, the occasional deadpan observation, but always genuinely helpful and never sacrificing clarity for character.

FORMATTING: This chat window displays plain text only — it does not render markdown. Never use asterisks, bold markers, pipe tables, or markdown headers. Write in plain prose and, if a list genuinely helps, use simple numbered lines or dashes with no other markup.

FRESHNESS: The event, crew, task, and sheet information below (if any) was fetched fresh, right now, as part of answering this question — it is not stale training data and you do not need internet access to use it. Never say you lack "live" or "real-time" access when current data is provided below; just answer from it directly. Only say you don't have information if the relevant section below is genuinely absent or empty.

ACCURACY: Never invent officer or crew names that are not real Star Trek Fleet Command content. If the alliance-specific crew data provided below does not cover the situation asked about, say so plainly and either answer from genuine, real STFC officer knowledge you are confident in, or state that you do not have a confirmed recommendation — do not fabricate a plausible-sounding crew to fill the gap. Precision matters more than always having an answer.

When alliance-specific context is provided below (events, crews, F2P tasks, reference sheets), prefer it over your own general knowledge. Keep answers reasonably concise unless the question calls for depth.

${contextParts.length ? contextParts.join("\n\n") : "(No specific alliance data matched this question — answer from genuine STFC knowledge only, or say you don't have a confirmed answer.)"}`;

    const groqKey = Deno.env.get("GROQ_API_KEY_SPOCKS");
    if (!groqKey) return json({ error: "GROQ_API_KEY_SPOCKS is not configured on this project" }, 500);

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.slice(-10), // keep recent turns only, bound the prompt
        ],
        temperature: 0.6,
        reasoning_format: "hidden",
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      return json({ error: `Groq request failed: ${errText}` }, 502);
    }

    const groqData = await groqRes.json();
    let reply = groqData?.choices?.[0]?.message?.content ?? "I have no response to offer at this time.";
    // Defensive: strip any reasoning leakage that occasionally slips through despite
    // reasoning_format:"hidden" (the same issue previously seen with Groq's models
    // in the screenshot-scoring feature).
    reply = reply.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
    if (!reply) reply = "I have no response to offer at this time.";
    return json({ reply, sources }, 200);
  } catch (e) {
    return json({ error: `Unexpected error: ${(e as Error).message}` }, 500);
  }
});
