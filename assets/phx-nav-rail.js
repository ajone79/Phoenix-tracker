(function(){
  const PRIMARY = [
    {href:'/index.html', label:'Home', icon:'🪐'},
    {href:'/alb-participation.html', label:'ALB Part.', icon:'📡'},
    {href:'/game-events.html', label:'Events', icon:'🛰️'},
    {href:'/f2p-task-guide.html', label:'F2P', icon:'🎯'},
    {href:'/crewing.html', label:'Crewing', icon:'🖖'},
  ];
  const MORE = [
    {href:'/self-admin.html', label:'My Account', icon:'🙋', desc:'Match your name, set up WhatsApp alerts'},
    {href:'/sheets/stfc-sheets.html', label:'STFC Sheets', icon:'📑', desc:'Planning & calculation tools'},
    {href:'/spocks-wisdom.html', label:"Spock's Wisdom", icon:'🖖', desc:'Ask about crews, events & gameplay'},
    {href:'/credits.html', label:'Links & Credits', icon:'🔗', desc:'External links, thanks'},
    {href:'/admin.html', label:'Admin', icon:'🛠️', desc:'Approve logins, manage admins', adminOnly:true},
    {href:'/home-admin.html', label:'Home Screen Admin', icon:'🖋️', desc:'Edit briefing, galleries, codes & trivia', homeEditorOnly:true},
  ];

  function init(){
    const path = location.pathname.split('/').pop() || 'index.html';
    function isCurrent(href){
      const clean = href.split('/').pop();
      return clean === path || (clean === 'index.html' && (path === '' || path === 'index.html'));
    }

    const style = document.createElement('style');
    style.textContent = `
      #phx-rail{position:fixed;top:0;left:0;bottom:0;width:68px;background:#0a0a0d;border-right:1px solid #23232b;display:flex;flex-direction:column;align-items:center;padding:14px 0;gap:2px;z-index:9998;overflow-y:auto;}
      #phx-rail .pr-logo{width:32px;height:32px;border-radius:8px;background:#f2a93b;color:#1a1200;font-family:ui-monospace,'SF Mono',monospace;font-weight:800;font-size:10px;display:flex;align-items:center;justify-content:center;margin-bottom:14px;flex-shrink:0;}
      #phx-rail a,#phx-rail button{all:unset;box-sizing:border-box;width:56px;padding:8px 0 7px;display:flex;flex-direction:column;align-items:center;gap:3px;border-radius:10px;cursor:pointer;color:#9a9aa4;font-family:'Rajdhani','Space Mono',sans-serif;}
      #phx-rail a:hover,#phx-rail button:hover{background:rgba(255,255,255,.06);color:#e8e6e1;}
      #phx-rail a.current{background:rgba(242,169,59,.14);color:#f2a93b;}
      #phx-rail .pr-ic{font-size:18px;line-height:1;}
      #phx-rail .pr-lbl{font-size:8.5px;text-transform:uppercase;letter-spacing:.03em;text-align:center;line-height:1.15;}
      body.phx-has-rail{margin-left:68px;}

      #phx-more-panel{position:fixed;inset:0;background:rgba(4,6,12,.7);z-index:10000;display:none;align-items:flex-end;justify-content:center;}
      #phx-more-panel.open{display:flex;}
      #phx-more-sheet{background:#111116;border:1px solid #23232b;border-top-left-radius:16px;border-top-right-radius:16px;width:100%;max-width:480px;padding:10px 10px 20px;max-height:70vh;overflow-y:auto;}
      #phx-more-sheet .pm-handle{width:36px;height:4px;background:#39394a;border-radius:3px;margin:6px auto 12px;}
      #phx-more-identity{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #23232b;margin-bottom:6px;}
      #phx-more-identity .pi-name{font-size:11.5px;color:#9a9aa4;font-family:'Rajdhani','Space Mono',sans-serif;}
      #phx-more-identity .pi-signout{font-size:11px;color:#f2a93b;text-decoration:none;background:none;border:none;cursor:pointer;font-family:'Rajdhani','Space Mono',sans-serif;}
      #phx-more-sheet a{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:10px;color:#e8e6e1;text-decoration:none;}
      #phx-more-sheet a:hover{background:rgba(255,255,255,.06);}
      #phx-more-sheet .pm-ic{font-size:19px;width:24px;text-align:center;flex-shrink:0;}
      #phx-more-sheet .pm-t{font-weight:700;font-size:13.5px;font-family:'Rajdhani','Space Mono',sans-serif;}
      #phx-more-sheet .pm-d{font-size:11px;color:#8a8a94;}

      #phx-bottom{display:none;}
      @media (min-width:761px){
        #phx-more-panel{align-items:center;}
        #phx-more-sheet{border-radius:14px;max-width:360px;}
      }
      @media (max-width:760px){
        #phx-rail{display:none;}
        body.phx-has-rail{margin-left:0;padding-bottom:60px;}
        #phx-bottom{display:flex;position:fixed;left:0;right:0;bottom:0;background:#0a0a0d;border-top:1px solid #23232b;padding:4px 2px calc(4px + env(safe-area-inset-bottom));justify-content:space-around;z-index:9998;}
        #phx-bottom a,#phx-bottom button{all:unset;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;gap:2px;color:#9a9aa4;font-family:'Rajdhani','Space Mono',sans-serif;padding:4px 6px;min-width:44px;}
        #phx-bottom a.current{color:#f2a93b;}
        #phx-bottom .pb-ic{font-size:18px;}
        #phx-bottom .pb-lbl{font-size:8.5px;text-transform:uppercase;}
      }
    `;
    document.head.appendChild(style);

    let profile = window.__trackerProfile || null;
    function isAdmin(){ return !!(profile && profile.is_admin); }
    function isHomeEditor(){ return !!(profile && (profile.is_owner || profile.is_home_editor)); }

    function moreItemsHtml(){
      return MORE.filter(m => (!m.adminOnly || isAdmin()) && (!m.homeEditorOnly || isHomeEditor())).map(m =>
        `<a href="${m.href}"><span class="pm-ic">${m.icon}</span><span><span class="pm-t">${m.label}</span><br><span class="pm-d">${m.desc}</span></span></a>`
      ).join('');
    }
    function identityHtml(){
      if(!profile) return '';
      const name = profile.discord_username || profile.in_game_name || 'Signed in';
      return `<div id="phx-more-identity"><span class="pi-name">${name}</span><button type="button" class="pi-signout" id="phx-signout">Sign out</button></div>`;
    }
    function wireIdentity(){
      const btn = document.getElementById('phx-signout');
      if(!btn) return;
      btn.addEventListener('click', async () => {
        if(window.__trackerSb) await window.__trackerSb.auth.signOut();
        location.href = '/login.html';
      });
    }

    let panel = null;
    function buildMorePanel(){
      if(panel) return panel;
      panel = document.createElement('div');
      panel.id = 'phx-more-panel';
      panel.innerHTML = `<div id="phx-more-sheet"><div class="pm-handle"></div>${identityHtml()}${moreItemsHtml()}</div>`;
      panel.addEventListener('click', e=>{ if(e.target === panel) panel.classList.remove('open'); });
      document.body.appendChild(panel);
      wireIdentity();
      return panel;
    }
    function refreshMorePanel(){
      const sheet = document.getElementById('phx-more-sheet');
      if(sheet){ sheet.innerHTML = `<div class="pm-handle"></div>${identityHtml()}${moreItemsHtml()}`; wireIdentity(); }
    }
    function toggleMore(){ buildMorePanel().classList.toggle('open'); }

    const rail = document.createElement('div');
    rail.id = 'phx-rail';
    rail.innerHTML = `<div class="pr-logo">PHX</div>` +
      PRIMARY.map(p => `<a href="${p.href}" class="${isCurrent(p.href)?'current':''}"><span class="pr-ic">${p.icon}</span><span class="pr-lbl">${p.label}</span></a>`).join('') +
      `<button type="button" id="phx-rail-more"><span class="pr-ic">⚙️</span><span class="pr-lbl">More</span></button>`;
    document.body.prepend(rail);

    const bottom = document.createElement('div');
    bottom.id = 'phx-bottom';
    bottom.innerHTML = PRIMARY.map(p => `<a href="${p.href}" class="${isCurrent(p.href)?'current':''}"><span class="pb-ic">${p.icon}</span><span class="pb-lbl">${p.label}</span></a>`).join('') +
      `<button type="button" id="phx-bottom-more"><span class="pb-ic">⚙️</span><span class="pb-lbl">More</span></button>`;
    document.body.appendChild(bottom);

    document.body.classList.add('phx-has-rail');
    document.getElementById('phx-rail-more').addEventListener('click', toggleMore);
    document.getElementById('phx-bottom-more').addEventListener('click', toggleMore);

    document.addEventListener('tracker-auth-ready', (e)=>{ profile = e.detail; refreshMorePanel(); });
  }

  if(document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
