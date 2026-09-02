(function(){
  document.documentElement.style.visibility = 'hidden';
  const __failSafe = setTimeout(function(){
    console.error('tracker-auth: timed out, revealing page to avoid a permanently blank screen');
    document.documentElement.style.visibility = 'visible';
  }, 8000);

  const SUPABASE_URL = 'https://mmzizgsanwqjpiumpqay.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1teml6Z3NhbndxanBpdW1wcWF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwMjk5MzksImV4cCI6MjEwMTYwNTkzOX0.KqvY2Ib33J8h8ztEi8qxtfutSdVIPAaJRtj7cSUSKFM';

  function escapeHtml(s){ return String(s).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c])); }

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
        :root{--void:#050507;--panel:#111116;--signal:#ff9142;--periwinkle:#8fa3ff;--gold:#ffc857;--text:#e8e6e1;--text-dim:#8a8a94;--hair:#2a2a34;--alert:#ff5a5f;--mint:#5fd068;}
        html,body{margin:0;background:var(--void);color:var(--text);font-family:'Space Mono',monospace;height:100%;}
        .wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;}
        .box{max-width:440px;background:var(--panel);border:1px solid var(--hair);border-radius:14px;padding:36px 32px;text-align:center;}
        .box h1{font-family:'Antonio',sans-serif;font-weight:700;font-size:22px;margin:0 0 12px;letter-spacing:.03em;}
        .box p{font-size:12.5px;color:var(--text-dim);line-height:1.6;margin:0 0 22px;}
        .btn{display:inline-block;background:var(--signal);color:var(--void);font-family:'Antonio',sans-serif;font-weight:700;letter-spacing:.05em;text-transform:uppercase;font-size:13px;padding:12px 26px;border-radius:8px;border:none;cursor:pointer;text-decoration:none;}
        .btn.ghost{background:transparent;border:1px solid var(--hair);color:var(--text-dim);margin-top:10px;}
        .btn.mint{background:var(--mint);color:var(--void);}
        .accent{color:var(--signal);}
        select{background:var(--panel);border:1px solid var(--hair);color:var(--text);font-family:'Space Mono',monospace;font-size:13px;padding:12px;border-radius:8px;width:100%;margin:16px 0;}
        .error{color:var(--alert);font-size:11.5px;margin-top:10px;}
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
      for (let i = 0; i < 3 && !profile; i++) {
        await new Promise(r => setTimeout(r, 700));
        ({ data: profile } = await sb.from('tracker_profiles').select('*').eq('id', user.id).maybeSingle());
      }
    }

    if (!profile) {
      renderScreen(`
        <h1>⏳ Setting up your profile</h1>
        <p>This is taking longer than expected. Refresh in a few seconds — if it persists, ping an officer.</p>
        <button class="btn ghost" id="signout">Sign out</button>
      `);
      document.getElementById('signout').addEventListener('click', async ()=>{ await sb.auth.signOut(); location.href='/login.html'; });
      return;
    }

    if (!profile.approved) {
      renderScreen(`
        <h1>⏳ Pending approval</h1>
        <p>You're signed in as <b class="accent">${escapeHtml((profile && profile.discord_username) || user.email || 'a member')}</b>, but an alliance admin hasn't whitelisted you yet.<br><br>Ping an officer in Discord and they'll approve your access — no need to log in again once they do.</p>
        <a class="btn" href="https://waapp.me/wa/T8uTP37f" target="_blank" rel="noopener">💬 WhatsApp me</a>
        <button class="btn ghost" id="signout">Sign out</button>
      `);
      document.getElementById('signout').addEventListener('click', async ()=>{ await sb.auth.signOut(); location.href='/login.html'; });
      return;
    }

    // FIRST LOGIN: if no in_game_name set, show the selection modal
    if (!profile.in_game_name || profile.in_game_name.trim() === '') {
      // Fetch roster for selection
      const { data: roster, error: rosterError } = await sb.from('roster').select('id, name, level').order('name').eq('status', 'active');
      
      if (rosterError || !roster || roster.length === 0) {
        renderScreen(`
          <h1>⚠️ Couldn't load roster</h1>
          <p>We couldn't fetch the member list. Please refresh and try again, or ping an officer.</p>
          <button class="btn ghost" id="signout">Sign out</button>
        `);
        document.getElementById('signout').addEventListener('click', async ()=>{ await sb.auth.signOut(); location.href='/login.html'; });
        return;
      }

      renderScreen(`
        <h1>Welcome to <span class="accent">Phoenix EU168</span></h1>
        <p>First, let's link your account to your in-game name. Select yourself from the list below:</p>
        <select id="nameSelect">
          <option value="">— Select your in-game name —</option>
          ${roster.map(p => `<option value="${escapeHtml(p.name)}">${escapeHtml(p.name)} (Level ${p.level})</option>`).join('')}
        </select>
        <div id="error" class="error"></div>
        <button class="btn mint" id="confirmBtn" disabled>Confirm and continue</button>
        <button class="btn ghost" id="signout">Sign out</button>
      `);

      const select = document.getElementById('nameSelect');
      const confirmBtn = document.getElementById('confirmBtn');
      const errorDiv = document.getElementById('error');

      select.addEventListener('change', () => {
        confirmBtn.disabled = select.value === '';
      });

      confirmBtn.addEventListener('click', async () => {
        const name = select.value.trim();
        if (!name) return;
        
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Saving…';
        
        const { error } = await sb.from('tracker_profiles')
          .update({ in_game_name: name, updated_at: new Date().toISOString() })
          .eq('id', user.id);
        
        if (error) {
          errorDiv.textContent = `Error: ${error.message}`;
          confirmBtn.disabled = false;
          confirmBtn.textContent = 'Confirm and continue';
          return;
        }
        
        // Success — proceed to tracker
        clearTimeout(__failSafe);
        window.__trackerProfile = { ...profile, in_game_name: name };
        document.documentElement.style.visibility = 'visible';
        document.dispatchEvent(new CustomEvent('tracker-auth-ready', { detail: { ...profile, in_game_name: name } }));
      });

      document.getElementById('signout').addEventListener('click', async ()=>{ await sb.auth.signOut(); location.href='/login.html'; });
      return;
    }

    // Approved + has in_game_name — let the page render normally.
    clearTimeout(__failSafe);
    window.__trackerProfile = profile;
    document.documentElement.style.visibility = 'visible';
    document.dispatchEvent(new CustomEvent('tracker-auth-ready', { detail: profile }));
  }

  main();
})();
