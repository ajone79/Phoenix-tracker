// Lightweight, standalone share helper — Web Share API with a clipboard
// fallback. Deliberately has zero dependency on tracker-auth.js, Supabase,
// or phx-nav-rail.js (that component has a real history of auth/profile
// timing bugs — this stays isolated from it on purpose).
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
  // falls back to copying "text + url" to the clipboard.
  window.phxShare = async function (text, opts) {
    opts = opts || {};
    const shareUrl = opts.url || location.href;
    const shareData = { title: opts.title || 'Phoenix EU168', text: text || '', url: shareUrl };

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
})();
