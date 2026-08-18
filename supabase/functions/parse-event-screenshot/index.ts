import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = "https://mmzizgsanwqjpiumpqay.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1teml6Z3NhbndxanBpdW1wcWF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwMjk5MzksImV4cCI6MjEwMTYwNTkzOX0.KqvY2Ib33J8h8ztEi8qxtfutSdVIPAaJRtj7cSUSKFM";

const GROQ_MODEL = "qwen/qwen3.6-27b";

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

function extractRowsFromModelText(raw: string): unknown[] | null {
  let cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, "");
  cleaned = cleaned.replace(/```json/gi, "").replace(/```/g, "").trim();

  try {
    const direct = JSON.parse(cleaned);
    if (Array.isArray(direct)) return direct;
    if (direct && typeof direct === "object") {
      for (const key of ["rows", "scores", "players", "data", "results"]) {
        if (Array.isArray((direct as Record<string, unknown>)[key])) {
          return (direct as Record<string, unknown>)[key] as unknown[];
        }
      }
    }
  } catch (_e) { /* fall through */ }

  const matches = [...cleaned.matchAll(/\[[\s\S]*?\]/g)];
  for (let i = matches.length - 1; i >= 0; i--) {
    try {
      const candidate = JSON.parse(matches[i][0]);
      if (Array.isArray(candidate) && candidate.length > 0) return candidate;
    } catch (_e) { /* try next */ }
  }

  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start !== -1 && end !== -1 && end > start) {
    try {
      const candidate = JSON.parse(cleaned.slice(start, end + 1));
      if (Array.isArray(candidate)) return candidate;
    } catch (_e) { /* give up */ }
  }

  return null;
}

function normName(s: unknown): string {
  return String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function dedupeRows(rows: unknown[]): unknown[] {
  const seen = new Set<string>();
  const out: unknown[] = [];
  for (const r of rows) {
    const name = (r as Record<string, unknown>)?.name;
    const key = normName(name);
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    out.push(r);
  }
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Not authenticated" }, 401);

    const { data: profile } = await userClient
      .from("tracker_profiles")
      .select("is_admin, approved")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || !profile.is_admin) {
      return json({ error: "Admins only" }, 403);
    }

    const body = await req.json();
    const images: string[] = body.images;
    if (!Array.isArray(images) || images.length === 0) {
      return json({ error: "No images provided" }, 400);
    }
    if (images.length > 5) {
      return json({ error: "Groq allows a maximum of 5 images per request" }, 400);
    }

    const groqKey = Deno.env.get("GROQ_API_KEY");
    if (!groqKey) {
      return json({ error: "GROQ_API_KEY is not configured on this project" }, 500);
    }

    const content: unknown[] = [
      {
        type: "text",
        text: "This is a screenshot from a mobile game (Star Trek Fleet Command) showing an alliance event leaderboard: rank, an icon, a player name, and a numeric score, one row per player.\n\nImportant details about this UI:\n- Player names are often prefixed with an alliance tag in brackets like '[PHX]' -- do NOT include the alliance tag in the extracted name, only the username after it.\n- Some rows have a small colored ribbon/banner of extra text directly underneath the username (a custom player motto/title, e.g. a short phrase in a green or orange ribbon shape). This banner text is NOT part of the player's name -- exclude it entirely from the name field.\n- The person who took this screenshot is a player in the alliance, and their own row is often pinned/highlighted (e.g. a different background colour) separately from the main ranked list, in addition to potentially also appearing in the ranked list itself if their rank falls within the visible range. If the exact same player name appears more than once in the image, only include that player ONCE in your output -- do not list the same player twice.\n- Scores can legitimately be very large numbers, sometimes in the billions, with comma thousand-separators (e.g. 4,430,154,071). Do not treat a large number as an error -- transcribe it exactly, just strip the commas so it's a plain integer.\n- There is exactly one score per row, aligned to the right side of that row. Do not merge digits from the rank number, tier badge, or any other row element into the score.\n- If this image is a collage of multiple leaderboard screenshots stacked vertically, extract rows from all of them, but still return one single flat JSON array covering everything -- do not describe or narrate each section separately, and remember: if the same player appears in more than one of the stacked screenshots (very likely, since their own row is usually shown on every screenshot regardless of scroll position), only include them once in the final array.\n\nRespond with ONLY the JSON array. Do not think out loud, do not explain your approach, do not narrate what you're doing -- go straight to the final answer. The exact shape: [{\"name\": \"PlayerName\", \"score\": 12345}]. If a row is cut off, blurry, or you're not confident you read it correctly, omit that row entirely rather than guessing.",
      },
    ];
    for (const img of images) {
      content.push({ type: "image_url", image_url: { url: img } });
    }

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: "user", content }],
        temperature: 0,
        max_completion_tokens: 4096,
        reasoning_effort: "none",
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      return json({ error: `Groq API error (${groqRes.status}): ${errText}` }, 502);
    }

    const groqData = await groqRes.json();
    const raw: string = groqData.choices?.[0]?.message?.content ?? "";

    const parsed = extractRowsFromModelText(raw);
    if (!parsed) {
      return json({ error: "Could not parse the model's output as JSON", raw }, 502);
    }

    return json({ rows: dedupeRows(parsed) }, 200);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
