(() => {
  'use strict';
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- how it works: the line and steps arrive together ---------------- */
  const steps = $('#steps');
  if (steps) new IntersectionObserver(([en], o) => { if (en.isIntersecting) { steps.classList.add('in'); o.disconnect(); } }, { rootMargin: '0px 0px -20% 0px' }).observe(steps);

  /* ---------------- industry explorer ---------------- */
  const root = $('.xp'), panels = $$('.xp-panel'), tabs = $$('.xp-tab'), list = $('.xp-list'), stage = $('.xp-stage');
  if (!panels.length) return;
  const N = panels.length, DWELL = 8000;      // ms each industry shows while the explorer plays on its own
  let cur = -1, inView = false, hover = false, focusIn = false;
  let auto = !reduced, elapsed = 0, last = 0, raf = 0;

  // background loops: a panel's video (and poster) only downloads the first time that panel is shown
  function media() {
    panels.forEach((p, k) => {
      const v = p.querySelector('.xp-vid'); if (!v) return;
      if (k !== cur || !inView || document.hidden) { v.pause(); return; }
      if (!v.poster) v.poster = v.dataset.poster;
      if (reduced) return;                                     // still frame only
      if (!v.src) v.src = v.dataset.src;
      v.play().catch(() => {});
    });
  }
  function select(i, how) {                                     // how: 'user' | 'auto' | 'load'
    i = (i + N) % N;
    if (i === cur) return;
    cur = i;
    panels.forEach((p, k) => { const on = k === i; p.classList.toggle('on', on); p.inert = !on; });
    tabs.forEach((t, k) => { t.setAttribute('aria-selected', k === i); t.tabIndex = k === i ? 0 : -1; t.style.setProperty('--p', 0); });
    elapsed = 0;
    if (how === 'user') {
      stopAuto();                                               // once someone takes the wheel, it stays theirs
      history.replaceState(null, '', '#' + panels[i].id);
    }
    // keep the chosen tab visible in the scrolling row on phones, without moving the page
    if (list.scrollWidth > list.clientWidth) {
      const t = tabs[i].parentElement;
      list.scrollTo({ left: t.offsetLeft - (list.clientWidth - t.offsetWidth) / 2, behavior: reduced ? 'auto' : 'smooth' });
    }
    media();
  }
  function stopAuto() { auto = false; root.classList.remove('auto'); cancelAnimationFrame(raf); }
  function tick(now) {
    raf = requestAnimationFrame(tick);
    const dt = last ? now - last : 0; last = now;
    if (!auto || !inView || hover || focusIn || document.hidden) return;
    elapsed += dt;
    tabs[cur].style.setProperty('--p', Math.min(1, elapsed / DWELL).toFixed(4));
    if (elapsed >= DWELL) select(cur + 1, 'auto');
  }

  tabs.forEach((t, i) => t.addEventListener('click', () => select(i, 'user')));
  $('.xp-prev').addEventListener('click', () => select(cur - 1, 'user'));
  $('.xp-next').addEventListener('click', () => select(cur + 1, 'user'));
  list.addEventListener('keydown', e => {
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    let n = null;
    if (step) n = cur + step; else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = N - 1;
    if (n === null) return;
    e.preventDefault(); select(n, 'user'); tabs[cur].focus();
  });
  // swipe the panel on touch screens
  let sx = null, sy = 0;
  stage.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') { sx = e.clientX; sy = e.clientY; } });
  stage.addEventListener('pointerup', e => {
    if (sx === null) return;
    const dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) select(cur + (dx < 0 ? 1 : -1), 'user');
  });
  // pause the timer while the visitor is reading or using it
  const xp = $('.xp-grid');
  xp.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') hover = true; });
  xp.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') hover = false; });
  xp.addEventListener('focusin', e => { focusIn = e.target.matches(':focus-visible'); });
  xp.addEventListener('focusout', () => { focusIn = false; });
  new IntersectionObserver(([en]) => { inView = en.isIntersecting; media(); }, { threshold: .35 }).observe(stage);
  document.addEventListener('visibilitychange', media);

  // arriving from a link such as applications.html#power-generation opens that industry (and leaves it there)
  const fromHash = () => { const i = panels.findIndex(p => '#' + p.id === location.hash); if (i >= 0) { select(i, 'load'); stopAuto(); } return i; };
  if (fromHash() < 0) select(0, 'load');
  addEventListener('hashchange', fromHash);
  if (auto) { root.classList.add('auto'); raf = requestAnimationFrame(tick); }
})();
