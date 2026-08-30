import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Papa from "https://esm.sh/papaparse@5.4.1";

const SUPABASE_URL = "https://mmzizgsanwqjpiumpqay.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1teml6Z3NhbndxanBpdW1wcWF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwMjk5MzksImV4cCI6MjEwMTYwNTkzOX0.KqvY2Ib33J8h8ztEi8qxtfutSdVIPAaJRtj7cSUSKFM";

const GROQ_MODEL = "openai/gpt-oss-120b";
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

    // Current arc — cheap and almost always useful context.
    const { data: activeArc } = await sb.from("arcs").select("name,status")
      .eq("status", "active").limit(1).maybeSingle();
    if (activeArc) contextParts.push(`CURRENT ARC: ${activeArc.name}`);

    // Upcoming/current events.
    const today = new Date().toISOString().slice(0, 10);
    const { data: events } = await sb.from("events")
      .select("name,date,scoring_type,threshold")
      .gte("date", today).order("date", { ascending: true }).limit(12);
    if (events?.length) {
      contextParts.push(
        "UPCOMING/CURRENT EVENTS:\n" +
        events.map((e) => `- ${e.name} (${e.date})${e.threshold ? `, threshold ${e.threshold}` : ""}`).join("\n")
      );
    }

    // Crews — only pull rows that look relevant to the question, to keep this cheap.
    const { data: allCrews } = await sb.from("crews").select("name,hostile_type,notes").limit(200);
    const matchedCrews = (allCrews || []).filter((c) =>
      keywords.length === 0 || anyMatch(`${c.name} ${c.hostile_type ?? ""} ${c.notes ?? ""}`, keywords)
    ).slice(0, 8);
    if (matchedCrews.length) {
      contextParts.push(
        "RELEVANT CREW RECOMMENDATIONS:\n" +
        matchedCrews.map((c) => `- ${c.name}${c.hostile_type ? ` [${c.hostile_type}]` : ""}: ${c.notes ?? "no notes"}`).join("\n")
      );
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
        }
      }
    } catch { /* sheets catalog is best-effort; never block the answer on it */ }

    const systemPrompt = `You are "Spock's Wisdom," an assistant for the Phoenix EU168 alliance in Star Trek Fleet Command (STFC). Answer in a measured, logical, dryly-witted tone reminiscent of Spock — precise, unflustered, the occasional deadpan observation, but always genuinely helpful and never sacrificing clarity for character. You may answer general STFC gameplay questions from your own knowledge. When alliance-specific context is provided below (events, crews, F2P tasks, reference sheets), prefer it over guessing, and say plainly when something isn't in the provided context rather than inventing details. Keep answers reasonably concise unless the question calls for depth.

${contextParts.length ? contextParts.join("\n\n") : "(No specific alliance data matched this question — answer from general STFC knowledge.)"}`;

    const groqKey = Deno.env.get("GROQ_API_KEY");
    if (!groqKey) return json({ error: "GROQ_API_KEY is not configured on this project" }, 500);

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
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      return json({ error: `Groq request failed: ${errText}` }, 502);
    }

    const groqData = await groqRes.json();
    const reply = groqData?.choices?.[0]?.message?.content ?? "I have no response to offer at this time.";
    return json({ reply }, 200);
  } catch (e) {
    return json({ error: `Unexpected error: ${(e as Error).message}` }, 500);
  }
});
