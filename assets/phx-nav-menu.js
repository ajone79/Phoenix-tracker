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
  ];

  function init(){
    const nav = document.querySelector('.phx-nav');
    if (!nav || nav.querySelector('.phx-menu-wrap')) return;

    const style = document.createElement('style');
    style.textContent = `
      .phx-menu-wrap{position:relative;margin-left:6px;flex-shrink:0;}
      .phx-menu-btn{background:transparent;border:1px solid #2a2a34;color:#9a9aa4;font-size:11px;letter-spacing:.05em;padding:6px 12px;border-radius:20px;cursor:pointer;font-family:inherit;}
      .phx-menu-btn:hover{color:#e8e6e1;border-color:#ff9142;}
      .phx-menu-dropdown{position:absolute;top:calc(100% + 8px);left:0;background:#111116;border:1px solid #2a2a34;border-radius:10px;padding:6px;min-width:210px;display:none;flex-direction:column;z-index:10000;box-shadow:0 10px 30px rgba(0,0,0,.6);}
      .phx-menu-dropdown.open{display:flex;}
      .phx-menu-dropdown a{color:#e8e6e1;text-decoration:none;font-size:12px;padding:9px 11px;border-radius:6px;white-space:nowrap;font-family:'Space Mono',monospace;}
      .phx-menu-dropdown a:hover{background:rgba(255,255,255,.07);}
      .phx-menu-dropdown a.current{color:#ff9142;font-weight:700;}
      @media (max-width:820px){ .phx-menu-dropdown{left:auto;right:0;} }
    `;
    document.head.appendChild(style);

    const path = (location.pathname.split('/').pop() || 'index.html');

    const wrap = document.createElement('div');
    wrap.className = 'phx-menu-wrap';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'phx-menu-btn';
    btn.textContent = '☰ Menu';
    const dropdown = document.createElement('div');
    dropdown.className = 'phx-menu-dropdown';
    dropdown.innerHTML = LINKS.map(l =>
      `<a href="${l.href}" class="${l.href===path?'current':''}">${l.label}</a>`
    ).join('');
    wrap.appendChild(btn);
    wrap.appendChild(dropdown);
    nav.appendChild(wrap);

    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });
    document.addEventListener('click', ()=> dropdown.classList.remove('open'));
  }

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
