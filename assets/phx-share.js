// Lightweight, standalone share helper — Web Share API with a clipboard
// fallback. Deliberately has zero dependency on tracker-auth.js, Supabase,
// or phx-nav-rail.js (that component has a real history of auth/profile
// timing bugs — this stays isolated from it on purpose).
//
// Including this script on a page auto-injects a small floating "share this
// page" button (bottom-right, above the mobile bottom nav). Set
// window.__phxShareNoAuto = true before this script tag to skip the
// auto-injected button on pages that build their own share UI (e.g.
// spocks-wisdom.html, which has a per-answer Share button instead).
(function () {
  function toast(msg) {
    let el = document.getElementById('phxShareToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'phxShareToast';
      el.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);' +
        'background:#17171e;border:1px solid #2a2a34;color:#e8e6e1;' +
        'font-family:"Space Mono",monospace;font-size:12px;padding:8px 14px;' +
        'border-radius:8px;z-index:9999;opacity:0;transition:opacity .2s;pointer-events:none;';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = '1';
    clearTimeout(el._phxShareTimer);
    el._phxShareTimer = setTimeout(() => { el.style.opacity = '0'; }, 1600);
  }

  // Usage: phxShare(text, { title, url })
  // Tries the native share sheet first (works in installed PWAs on
  // Android/iOS); if that's unavailable or the user's browser blocks it,
  // falls back to copying "text + url" to the clipboard. url always
  // defaults to the current page's own address, never an external link.
  window.phxShare = async function (text, opts) {
    opts = opts || {};
    const shareUrl = opts.url || location.href;
    const shareData = { title: opts.title || document.title || 'Phoenix EU168', text: text || '', url: shareUrl };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (e) {
        if (e && e.name === 'AbortError') return; // user cancelled — not a failure
        // any other error: fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(text ? `${text}\n${shareUrl}` : shareUrl);
      toast('Copied to clipboard');
    } catch (e) {
      toast('Could not share — select the text manually');
    }
  };

  function injectFloatingButton() {
    if (window.__phxShareNoAuto) return;
    if (document.getElementById('phxShareFab')) return;
    const btn = document.createElement('button');
    btn.id = 'phxShareFab';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Share this page');
    btn.textContent = '🔗';
    btn.style.cssText = 'position:fixed;right:14px;bottom:74px;width:42px;height:42px;' +
      'border-radius:50%;background:#17171e;border:1px solid #2a2a34;color:#e8e6e1;' +
      'font-size:18px;line-height:1;cursor:pointer;z-index:9997;' +
      'display:flex;align-items:center;justify-content:center;' +
      'box-shadow:0 2px 8px rgba(0,0,0,.4);padding:0;';
    btn.addEventListener('click', () => { window.phxShare(document.title || '', {}); });
    document.body.appendChild(btn);
  }

  if (document.readyState !== 'loading') injectFloatingButton();
  else document.addEventListener('DOMContentLoaded', injectFloatingButton);
})();
