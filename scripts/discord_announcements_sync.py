#!/usr/bin/env python3
"""
Discord Announcements Sync
---------------------------
Polls a fixed set of Discord channels for recent messages and upserts them
into the Supabase discord_announcements table, so the home screen can show
recent announcements without an always-on bot process.

Uses the same authentication pattern as scripts/sync_roster.py: reads
SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY from the environment and writes
with the service role key, which bypasses RLS entirely (this table has no
anon/authenticated write policy at all — only this script ever writes to it).

Requires DISCORD_BOT_TOKEN in the environment. The bot needs "View Channel"
and "Read Message History" permission on each channel below.
"""
import os
import sys
import requests

DISCORD_BOT_TOKEN = os.environ["DISCORD_BOT_TOKEN"]
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://mmzizgsanwqjpiumpqay.supabase.co")
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

GUILD_ID = "1051080483167019098"

# Add/remove channels here as needed — channel_label is just a friendly name
# used on the home screen, it has no effect on Discord itself.
CHANNELS = [
    {"id": "1145220724471115848", "label": "STFC Official Announcements"},
    {"id": "1059056234206089216", "label": "Phoenix Announcements"},
]

MESSAGES_PER_CHANNEL = 20

def fetch_messages(channel_id):
    url = f"https://discord.com/api/v10/channels/{channel_id}/messages"
    headers = {"Authorization": f"Bot {DISCORD_BOT_TOKEN}"}
    resp = requests.get(url, headers=headers, params={"limit": MESSAGES_PER_CHANNEL}, timeout=20)
    if not resp.ok:
        print(f"  Discord API error for channel {channel_id}: {resp.status_code} {resp.text}", file=sys.stderr)
        return []
    return resp.json()

def upsert_rows(rows):
    if not rows:
        return
    url = f"{SUPABASE_URL}/rest/v1/discord_announcements"
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }
    resp = requests.post(url, headers=headers, json=rows, timeout=20)
    if not resp.ok:
        print(f"  Supabase upsert error: {resp.status_code} {resp.text}", file=sys.stderr)
        resp.raise_for_status()

def main():
    total = 0
    for ch in CHANNELS:
        messages = fetch_messages(ch["id"])
        rows = []
        for m in messages:
            content = m.get("content") or ""

            # Pull out image attachments/embeds separately so they can be shown as
            # actual thumbnails rather than being dropped or reduced to a filename.
            image_urls = []
            for a in m.get("attachments", []):
                content_type = (a.get("content_type") or "")
                filename = (a.get("filename") or "").lower()
                is_image = content_type.startswith("image/") or filename.endswith((".png", ".jpg", ".jpeg", ".gif", ".webp"))
                if is_image and a.get("url"):
                    image_urls.append(a["url"])
            for e in m.get("embeds", []):
                img = e.get("image") or e.get("thumbnail")
                if img and img.get("url"):
                    image_urls.append(img["url"])

            # Skip genuinely empty messages (no text, no image, no embed worth surfacing)
            if not content and not image_urls and not m.get("embeds"):
                continue
            if not content and m.get("embeds"):
                embed = m["embeds"][0]
                content = embed.get("title") or embed.get("description") or ""
            if not content and not image_urls and m.get("attachments"):
                # Non-image attachment (e.g. a file) with no caption text
                content = "[attachment] " + ", ".join(a.get("filename", "") for a in m["attachments"])

            author = m.get("author", {})
            avatar_url = None
            if author.get("avatar"):
                avatar_url = f"https://cdn.discordapp.com/avatars/{author.get('id')}/{author.get('avatar')}.png"

            rows.append({
                "id": m["id"],
                "channel_id": ch["id"],
                "channel_label": ch["label"],
                "author_name": author.get("global_name") or author.get("username") or "Unknown",
                "author_avatar_url": avatar_url,
                "content": content[:2000],
                "image_urls": image_urls,
                "message_url": f"https://discord.com/channels/{GUILD_ID}/{ch['id']}/{m['id']}",
                "posted_at": m["timestamp"],
            })
        upsert_rows(rows)
        print(f"  {ch['label']} ({ch['id']}): {len(rows)} messages synced")
        total += len(rows)
    print(f"Done. {total} messages synced total.")

if __name__ == "__main__":
    main()
