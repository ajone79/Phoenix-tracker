(function(){
  // Shared visual polish: smoother hover/focus states, a native cross-page
  // fade transition (Chrome/Edge; harmless no-op elsewhere), and a scroll
  // reveal for page sections. Pure CSS/behaviour additions only - never
  // touches layout, markup, or existing page logic. Respects
  // prefers-reduced-motion throughout.

  var style = document.createElement('style');
  style.textContent =
    ':root{--phx-ease:cubic-bezier(.22,.61,.36,1);}\n' +
    // Native cross-document view transition. Chrome/Edge 126+ cross-fades
    // old/new page automatically on same-origin navigation (incl. back/
    // forward); browsers without support simply ignore this at-rule.
    '@view-transition{navigation:auto;}\n' +
    // Smoother, consistent hover/focus timing on interactive elements.
    'a,button,.btn,.btn-sm,input,select,textarea{' +
      'transition:color .18s var(--phx-ease),background-color .18s var(--phx-ease),' +
      'border-color .18s var(--phx-ease),box-shadow .18s var(--phx-ease),opacity .18s var(--phx-ease);}\n' +
    '.btn,.btn-sm,.card,.link-card,.pill,.tag{' +
      'transition:color .18s var(--phx-ease),background-color .18s var(--phx-ease),' +
      'border-color .18s var(--phx-ease),box-shadow .22s var(--phx-ease),transform .22s var(--phx-ease);}\n' +
    '.btn:hover,.btn-sm:hover{transform:translateY(-1px);box-shadow:0 4px 14px rgba(0,0,0,.35);}\n' +
    '.btn:active,.btn-sm:active{transform:translateY(0);filter:brightness(.96);}\n' +
    '.card:hover,.link-card:hover{transform:translateY(-3px);box-shadow:0 10px 28px rgba(0,0,0,.4);' +
      'border-color:var(--amber,#f2a93b);}\n' +
    ':focus-visible{outline:2px solid var(--teal,#4fd1c5);outline-offset:2px;border-radius:4px;}\n' +
    // Dark-theme scrollbar to match the rest of the UI.
    '*{scrollbar-width:thin;scrollbar-color:#3a3f56 transparent;}\n' +
    '::-webkit-scrollbar{width:10px;height:10px;}\n' +
    '::-webkit-scrollbar-thumb{background:#3a3f56;border-radius:8px;}\n' +
    '::-webkit-scrollbar-thumb:hover{background:#4b5170;}\n' +
    // Scroll/entrance reveal for top-level page sections.
    '@media (prefers-reduced-motion: no-preference){' +
      '.phx-reveal{opacity:0;transform:translateY(12px);' +
        'transition:opacity .3s var(--phx-ease),transform .3s var(--phx-ease);}' +
      '.phx-reveal.phx-in{opacity:1;transform:translateY(0);}' +
    '}';
  document.head.appendChild(style);

  function initReveal(){
    if(!('IntersectionObserver' in window)) return;
    if(!window.matchMedia || !window.matchMedia('(prefers-reduced-motion: no-preference)').matches) return;

    var targets = document.querySelectorAll('main > *, .link-card');
    if(!targets.length) return;

    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('phx-in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    var viewportH = window.innerHeight;
    targets.forEach(function(el){
      if(el.classList.contains('phx-reveal')) return; // already queued
      // Leave anything that starts hidden (toggled tabs/banners) alone -
      // it has no box for IntersectionObserver to ever fire on, so it
      // must stay visible-by-default for whenever it's later shown.
      if(window.getComputedStyle(el).display === 'none') return;
      // Anything already visible in the first screenful loads instantly,
      // full stop - only content you'd actually scroll to reveal animates.
      if(el.getBoundingClientRect().top < viewportH) return;
      el.classList.add('phx-reveal');
      io.observe(el);
    });
  }

  if(document.readyState !== 'loading') initReveal();
  else document.addEventListener('DOMContentLoaded', initReveal);
})();
