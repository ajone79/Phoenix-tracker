(function(){
  document.documentElement.style.visibility = 'hidden';
  const __failSafe = setTimeout(function(){
    console.error('tracker-auth: timed out, revealing page to avoid a permanently blank screen');
    document.documentElement.style.visibility = 'visible';
  }, 8000);

  const SUPABASE_URL = 'https://mmzizgsanwqjpiumpqay.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1teml6Z3NhbndxanBpdW1wcWF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwMjk5MzksImV4cCI6MjEwMTYwNTkzOX0.KqvY2Ib33J8h8ztEi8qxtfutSdVIPAaJRtj7cSUSKFM';

  function escapeHtml(s){ return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  function loginUrl(){
    const next = encodeURIComponent(location.pathname + location.search);
    return `/login.html?next=${next}`;
  }

  function renderScreen(innerHtml){
    clearTimeout(__failSafe);
    document.documentElement.style.visibility = 'visible';
    document.documentElement.innerHTML = `
      <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Phoenix EU168</title>
      <link href="https://fonts.googleapis.com/css2?family=Antonio:wght@400;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
      <style>
        :root{--void:#050507;--panel:#111116;--signal:#ff9142;--periwinkle:#8fa3ff;--gold:#ffc857;--text:#e8e6e1;--text-dim:#8a8a94;--hair:#2a2a34;}
        html,body{margin:0;background:var(--void);color:var(--text);font-family:'Space Mono',monospace;height:100%;}
        .wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;}
        .box{max-width:440px;background:var(--panel);border:1px solid var(--hair);border-radius:14px;padding:36px 32px;text-align:center;}
        .box h1{font-family:'Antonio',sans-serif;font-weight:700;font-size:22px;margin:0 0 12px;letter-spacing:.03em;}
        .box p{font-size:12.5px;color:var(--text-dim);line-height:1.6;margin:0 0 22px;}
        .btn{display:inline-block;background:var(--signal);color:var(--void);font-family:'Antonio',sans-serif;font-weight:700;letter-spacing:.05em;text-transform:uppercase;font-size:13px;padding:12px 26px;border-radius:8px;border:none;cursor:pointer;text-decoration:none;}
        .btn.ghost{background:transparent;border:1px solid var(--hair);color:var(--text-dim);margin-top:10px;}
        .accent{color:var(--signal);}
      </style></head>
      <body><div class="wrap"><div class="box">${innerHtml}</div></div></body>
    `;
  }

  async function main(){
    if (typeof supabase === 'undefined') {
      renderScreen(`<h1>Setup error</h1><p>Auth library failed to load. Refresh the page.</p>`);
      return;
    }
    const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    window.__trackerSb = sb;

    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
      location.href = loginUrl();
      return;
    }

    const user = session.user;
    let { data: profile } = await sb.from('tracker_profiles').select('*').eq('id', user.id).maybeSingle();

    if (!profile) {
      const identity = (user.identities || [])[0]; // whichever identity exists (discord, email, etc.)
      const provider = (identity && identity.provider) || 'email';
      let displayName, avatar, providerId;
      if (provider === 'discord') {
        const meta = (identity && identity.identity_data) || user.user_metadata || {};
        displayName = meta.full_name || meta.name || meta.user_name || meta.preferred_username || 'Unknown';
        avatar = meta.avatar_url || null;
        providerId = meta.provider_id || meta.sub || (identity && identity.id) || null;
      } else {
        displayName = user.email || 'Unknown';
        avatar = null;
        providerId = user.id;
      }
      const { data: inserted } = await sb.from('tracker_profiles').insert({
        id: user.id, discord_id: providerId, discord_username: displayName, avatar_url: avatar, login_provider: provider
      }).select().maybeSingle();
      profile = inserted;
    }

    if (!profile || !profile.approved) {
      renderScreen(`
        <h1>⏳ Pending approval</h1>
        <p>You're signed in as <b class="accent">${escapeHtml((profile && profile.discord_username) || user.email || 'a member')}</b>, but an alliance admin hasn't whitelisted you yet.<br><br>Ping an officer in Discord and they'll approve your access — no need to log in again once they do.</p>
        <button class="btn ghost" id="signout">Sign out</button>
      `);
      document.getElementById('signout').addEventListener('click', async ()=>{ await sb.auth.signOut(); location.href='/login.html'; });
      return;
    }

    // approved — inject a small identity/logout badge and let the page render normally
    clearTimeout(__failSafe);
    window.__trackerProfile = profile;
    document.documentElement.style.visibility = 'visible';
    document.dispatchEvent(new CustomEvent('tracker-auth-ready', { detail: profile }));
    document.addEventListener('DOMContentLoaded', injectBadge, { once: true });
    if (document.readyState !== 'loading') injectBadge();

    function injectBadge(){
      const nav = document.querySelector('.phx-nav');
      if (!nav) return;
      const badge = document.createElement('div');
      badge.style.cssText = 'margin-left:auto;display:flex;align-items:center;gap:8px;padding:0 8px;flex-shrink:0;';
      badge.innerHTML = `<span style="font-size:10px;color:#8a8a94;">${escapeHtml(profile.discord_username||'')}</span><a href="#" id="tracker-signout" style="font-size:10px;color:#ff9142;text-decoration:none;">Sign out</a>`;
      nav.appendChild(badge);
      document.getElementById('tracker-signout').addEventListener('click', async (e)=>{
        e.preventDefault();
        await sb.auth.signOut();
        location.href='/login.html';
      });
    }
  }

  main();
})();
