// Anonymous usage counting for the calendar feed (pure helpers, no Deno-only APIs).

/** Friendly app name from a User-Agent, so the counts can be split by calendar app. */
export function appFromUserAgent(ua: string): string {
  const u = (ua ?? "").toLowerCase();
  if (/thunderbird|lightning/.test(u)) return "Thunderbird";
  if (/google-calendar|googlecal|apis-google|feedfetcher|calendar-importer/.test(u)) return "Google Calendar";
  if (/icsx|davx/.test(u)) return "ICSx5/DAVx5";
  if (/outlook|microsoft office|ms-office|office/.test(u)) return "Outlook";
  if (/dataaccessd|calendaragent|ios\/|macos|iphone|ipad|darwin/.test(u)) return "Apple Calendar";
  if (/curl|deno|node|python|pg_net|undici|wget|claude|bot|spider/.test(u)) return "Script/tool";
  if (/mozilla|chrome|safari|firefox|edg\//.test(u)) return "Browser";
  return "Other";
}

/** Stable, anonymous client id: HMAC-SHA256(secret, ip | user agent), shortened. No raw IP/UA is kept. */
export async function clientHash(ip: string, ua: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${ip}|${ua}`));
  return [...new Uint8Array(sig)].slice(0, 10).map((b) => b.toString(16).padStart(2, "0")).join("");
}
