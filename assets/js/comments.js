(() => {
  const section = document.querySelector('[data-comments]');
  if (!section) return;

  const widget = section.querySelector('[data-comments-widget]');
  const status = section.querySelector('[data-comments-status]');
  if (!widget || !status) return;

  const repo = (section.getAttribute('data-comments-repo') || '').trim();
  const parts = repo.split('/');
  const validOwner = parts.length === 2 && parts[0].length <= 39 &&
    /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/.test(parts[0]);
  const validName = parts.length === 2 && /^[A-Za-z0-9_.-]{1,100}$/.test(parts[1]) &&
    parts[1] !== '.' && parts[1] !== '..';
  if (!validOwner || !validName) {
    status.textContent = '댓글 저장소 설정이 올바르지 않습니다. 사이트 운영자에게 알려 주세요.';
    return;
  }

  const origin = 'https://utteranc.es';
  let theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'github-dark' : 'github-light';
  let responded = false;
  let timeoutId = null;
  let observer = null;

  const script = document.createElement('script');
  script.src = `${origin}/client.js`;
  script.async = true;
  script.setAttribute('repo', repo);
  script.setAttribute('issue-term', 'pathname');
  script.setAttribute('theme', theme);
  script.crossOrigin = 'anonymous';

  function getFrame() {
    const frame = widget.querySelector('iframe.utterances-frame');
    if (!frame || !frame.contentWindow) return null;
    try {
      const url = new URL(frame.src, document.baseURI);
      return url.origin === origin && url.pathname === '/utterances.html' ? frame : null;
    } catch (_) {
      return null;
    }
  }

  function applyTheme() {
    // The client removes its script after creating the iframe. Updating both
    // covers changes made before the client has finished loading.
    script.setAttribute('theme', theme);
    const frame = getFrame();
    if (frame) frame.contentWindow.postMessage({ type: 'set-theme', theme }, origin);
  }

  function showUnavailable() {
    if (responded) return;
    status.hidden = false;
    status.textContent = '댓글을 아직 불러오지 못했습니다. 네트워크나 콘텐츠 차단 설정을 확인해 주세요.';
  }

  function startTimeout() {
    if (responded || timeoutId !== null) return;
    timeoutId = window.setTimeout(showUnavailable, 15000);
  }

  document.addEventListener('themechange', event => {
    const next = event.detail && event.detail.theme;
    if (next !== 'light' && next !== 'dark') return;
    theme = next === 'dark' ? 'github-dark' : 'github-light';
    applyTheme();
  });

  window.addEventListener('message', event => {
    if (event.origin !== origin || !event.data || event.data.type !== 'resize') return;
    const frame = getFrame();
    if (!frame || event.source !== frame.contentWindow) return;
    responded = true;
    if (timeoutId !== null) window.clearTimeout(timeoutId);
    if (observer) observer.disconnect();
    status.hidden = true;
    frame.title = 'GitHub 댓글';
    // A resize confirms the iframe has initialized, so replay any pending theme.
    applyTheme();
  });

  script.addEventListener('error', () => {
    if (timeoutId !== null) window.clearTimeout(timeoutId);
    if (observer) observer.disconnect();
    showUnavailable();
  });

  status.textContent = '댓글을 불러오는 중입니다…';
  // Utterances lazy-loads its iframe. Start the timeout only near the section,
  // so readers do not see a false failure before scrolling down to it.
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        startTimeout();
        observer.disconnect();
      }
    }, { rootMargin: '200px' });
    observer.observe(section);
  } else {
    startTimeout();
  }
  widget.appendChild(script);
})();
