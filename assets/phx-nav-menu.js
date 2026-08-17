(function(){
  const LINKS = [
    {href:'index.html', label:'🏠 Home'},
    {href:'alb-participation.html', label:'📊 ALB Participation'},
    {href:'events-calendar.html', label:'🗓️ Events Calendar'},
    {href:'crewing.html', label:'🖖 Crewing'},
    {href:'idiq-hints-and-tips.html', label:'💡 IDIQ Hints & Tips'},
    {href:'credits.html', label:'🔗 Links & Credits'},
    {href:'f2p-task-guide.html', label:'🎯 F2P Task Guide'},
    {href:'fleet-commanders.html', label:'🧭 Fleet Commanders'},
    {href:'admin.html', label:'🛠️ Admin'},
  ];

  function init(){
    const nav = document.querySelector('.phx-nav');
    if (!nav || nav.querySelector('.phx-menu-btn')) return;

    const style = document.createElement('style');
    style.textContent = `
      .phx-menu-btn{
        position:sticky; left:0; z-index:200;
        background:#0a0a0d; border:1px solid #f2a93b; color:#f2a93b;
        font-size:12px; letter-spacing:.05em; padding:6px 12px; border-radius:20px;
        cursor:pointer; font-family:inherit; flex-shrink:0; margin-right:8px;
      }
      .phx-menu-btn:hover{ background:#f2a93b; color:#0a0a0d; }
      .phx-menu-dropdown{
        position:fixed; background:#111116; border:1px solid #2a2a34; border-radius:10px;
        padding:6px; min-width:220px; display:none; flex-direction:column;
        z-index:100000; box-shadow:0 10px 30px rgba(0,0,0,.6);
      }
      .phx-menu-dropdown.open{ display:flex; }
      .phx-menu-dropdown a{
        color:#e8e6e1; text-decoration:none; font-size:12.5px; padding:9px 11px;
        border-radius:6px; white-space:nowrap; font-family:'Space Mono',monospace;
      }
      .phx-menu-dropdown a:hover{ background:rgba(255,255,255,.07); }
      .phx-menu-dropdown a.current{ color:#f2a93b; font-weight:700; }
    `;
    document.head.appendChild(style);

    const path = (location.pathname.split('/').pop() || 'index.html');

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'phx-menu-btn';
    btn.textContent = '☰ Menu';

    const dropdown = document.createElement('div');
    dropdown.className = 'phx-menu-dropdown';
    dropdown.innerHTML = LINKS.map(l =>
      `<a href="${l.href}" class="${l.href===path?'current':''}">${l.label}</a>`
    ).join('');
    document.body.appendChild(dropdown);

    // insert button as the very first item in the nav, right after the PHX tag
    const tag = nav.querySelector('.phx-nav-tag');
    if (tag && tag.nextSibling) {
      nav.insertBefore(btn, tag.nextSibling);
    } else {
      nav.insertBefore(btn, nav.firstChild);
    }

    function positionDropdown(){
      const r = btn.getBoundingClientRect();
      dropdown.style.top = (r.bottom + 8) + 'px';
      dropdown.style.left = Math.max(8, r.left) + 'px';
    }

    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      const willOpen = !dropdown.classList.contains('open');
      if (willOpen) positionDropdown();
      dropdown.classList.toggle('open', willOpen);
    });
    document.addEventListener('click', ()=> dropdown.classList.remove('open'));
    window.addEventListener('scroll', ()=> dropdown.classList.remove('open'), true);
    window.addEventListener('resize', ()=> dropdown.classList.remove('open'));
  }

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
  window.__phxInitNavMenu = init; // exposed so pages that build their nav dynamically (e.g. admin.html) can re-trigger injection
})();
