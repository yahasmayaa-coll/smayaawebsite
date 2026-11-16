(() => {
  'use strict';
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const track = $('#mtrack'); if (!track) return;
  const pin = track.querySelector('.mpin'), view = track.querySelector('.mview');
  const heads = $$('.mview .mh'), ancs = $$('.manc'), host = view.querySelector('.lap-scr');
  const count = view.querySelector('.mcount b'), bar = view.querySelector('.mbar i');
  const links = $$('.mnav a'), strip = $('.mnav ol'), N = heads.length;
  let step = 400, cur = -1, lock = -1, lockT = 0;

  /* the laptop fades up the first time the card is seen */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { view.classList.add('seen'); io.disconnect(); } }), { rootMargin: '0px 0px -15% 0px' });
  io.observe(view);

  /* one pinned card: every `step` pixels of scrolling shows the next module (text + screen in the same laptop).
     The anchors (#thermal, #coc…) sit at those scroll positions so links still land on the right module. */
  function layout() {
    step = Math.max(300, innerHeight * .45);
    view.style.setProperty('--mh', Math.max(...heads.map(h => h.offsetHeight)) + 'px');
    track.style.height = pin.offsetHeight + (N - 1) * step + 'px';
    // the module list beside it is exactly as tall as the card
    const nav = $('.mnav'); if (nav) nav.style.setProperty('--navh', view.offsetHeight + 'px');
    ancs.forEach((a, i) => { a.style.top = i * step + 'px'; });
  }
  const pinTop = () => parseFloat(getComputedStyle(pin).top) || 0;
  const progress = () => (pinTop() - track.getBoundingClientRect().top) / step;

  function select(i) {
    if (i === cur) return;
    cur = i;
    heads.forEach((h, k) => h.classList.toggle('on', k === i));
    if (window.SMYScreens) window.SMYScreens.show(host, heads[i].dataset.slug);
    count.textContent = String(i + 1).padStart(2, '0');
    const id = heads[i].dataset.id;
    links.forEach(a => {
      const on = a.getAttribute('href') === '#' + id;
      if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      // phone: keep the active chip visible in the horizontal strip
      if (on && strip && strip.scrollWidth > strip.clientWidth) strip.scrollTo({ left: a.parentElement.offsetLeft - 16, behavior: 'smooth' });
    });
  }
  function update() {
    const p = progress();
    bar.style.setProperty('--p', Math.min(1, Math.max(0, (p + 1) / N)));
    // while jumping from the navigator, don't flick through every screen on the way
    if (lock >= 0) { if (Math.abs(p - lock) < .05 || performance.now() > lockT) lock = -1; else return; }
    select(Math.min(N - 1, Math.max(0, Math.round(p))));
  }

  function jump(i, smooth) {
    lock = i; lockT = performance.now() + 1500;
    select(i);
    const y = scrollY + track.getBoundingClientRect().top - pinTop() + i * step;
    scrollTo({ top: y, behavior: smooth ? 'smooth' : 'auto' });
    history.replaceState(null, '', '#' + heads[i].dataset.id);
  }
  // module links anywhere on the page (navigator, the modules row at the top)
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]'); if (!a) return;
    const i = heads.findIndex(h => '#' + h.dataset.id === a.getAttribute('href'));
    if (i < 0) return;
    e.preventDefault(); jump(i, true);
  });

  let raf = 0;
  const tick = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; update(); }); };
  addEventListener('scroll', tick, { passive: true });
  addEventListener('resize', () => { layout(); tick(); });
  layout(); update();
  // a link like modules.html#coc: go to that module once the track has its height
  const k = heads.findIndex(h => '#' + h.dataset.id === location.hash);
  if (k >= 0) requestAnimationFrame(() => jump(k, false));
})();
