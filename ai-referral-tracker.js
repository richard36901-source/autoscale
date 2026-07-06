/*
  AI Referral Tracker for autoscalehq.io
  Install: paste this whole file inside a <script> tag before </body> on every page,
  or link it as an external file: <script src="/ai-referral-tracker.js"></script>

  What it does:
  1. Detects if the visitor arrived from an AI chat/answer engine (referrer or utm_source)
  2. Stores the source for the session
  3. Appends a visible tag to WhatsApp click links (so Donna's first message shows the source)
  4. Fills a hidden form field (ai_source) on any form that has one, for your Make.com webhook

  Known limits (be honest with yourself about this):
  - Many AI chat apps (mobile ChatGPT app, Claude app) do NOT send a referrer at all.
    Those visits will show as "direct" even if they came from an AI recommendation.
  - This catches web-based AI answer engines and any AI surface that appends utm params
    or a real referrer header. It will undercount, not overcount.
*/

(function () {
  var AI_DOMAINS = [
    { match: 'chatgpt.com', label: 'ChatGPT' },
    { match: 'chat.openai.com', label: 'ChatGPT' },
    { match: 'perplexity.ai', label: 'Perplexity' },
    { match: 'gemini.google.com', label: 'Gemini' },
    { match: 'bard.google.com', label: 'Gemini' },
    { match: 'copilot.microsoft.com', label: 'Copilot' },
    { match: 'bing.com/chat', label: 'Copilot' },
    { match: 'claude.ai', label: 'Claude' },
    { match: 'you.com', label: 'You.com' },
    { match: 'poe.com', label: 'Poe' },
    { match: 'meta.ai', label: 'Meta AI' }
  ];

  function detectAISource() {
    var referrer = (document.referrer || '').toLowerCase();
    var params = new URLSearchParams(window.location.search);
    var utmSource = (params.get('utm_source') || '').toLowerCase();

    for (var i = 0; i < AI_DOMAINS.length; i++) {
      var d = AI_DOMAINS[i];
      if (utmSource.indexOf(d.match.split('.')[0]) !== -1) return d.label;
    }
    for (var j = 0; j < AI_DOMAINS.length; j++) {
      var e = AI_DOMAINS[j];
      if (referrer.indexOf(e.match) !== -1) return e.label;
    }
    return null;
  }

  var existing = sessionStorage.getItem('ai_referral_source');
  if (!existing) {
    var detected = detectAISource();
    if (detected) {
      sessionStorage.setItem('ai_referral_source', detected);
      sessionStorage.setItem('ai_referral_landing', window.location.pathname);
      sessionStorage.setItem('ai_referral_timestamp', new Date().toISOString());
    }
  }

  window.getAIReferralData = function () {
    return {
      source: sessionStorage.getItem('ai_referral_source') || 'direct',
      landing: sessionStorage.getItem('ai_referral_landing') || window.location.pathname,
      timestamp: sessionStorage.getItem('ai_referral_timestamp') || null
    };
  };

  document.addEventListener('DOMContentLoaded', function () {
    var data = window.getAIReferralData();

    // Tag hidden form fields named ai_source, for Make.com webhook capture
    document.querySelectorAll('input[name="ai_source"]').forEach(function (field) {
      field.value = data.source;
    });

    // Tag WhatsApp click-to-chat links: any <a> with class "whatsapp-cta"
    // Expected href format: https://wa.me/9725XXXXXXXX?text=YOUR_MESSAGE
    document.querySelectorAll('a.whatsapp-cta').forEach(function (link) {
      var href = link.getAttribute('href');
      if (!href) return;
      try {
        var url = new URL(href);
        var text = url.searchParams.get('text') || 'Hi, I would like to learn more about AutoScale';
        if (data.source !== 'direct') {
          text += ' [AI referral: ' + data.source + ']';
        }
        url.searchParams.set('text', text);
        link.setAttribute('href', url.toString());
      } catch (e) {
        // href wasn't a full URL, skip silently
      }
    });
  });
})();
