(() => {
  'use strict';
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const html = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const ease = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

  /* ---------------- loader: logo plays on the blue coming-soon gradient, then flies into the header ---------------- */
  const stage = $('#stage'), slot = $('#brandSlot');
  let loader = $('#loader');
  // set in the home page's <head>: the visitor has already seen the intro in this tab
  if (loader && html.classList.contains('no-intro')) { loader.remove(); loader = null; }
  const MOVE = 2.0;                       // seconds; the flight starts 2 s before the animation ends
  let ar = 3.32, moveT0 = null, landed = false, svg = null;
  const landCbs = [];

  function vbAspect() { const v = svg.viewBox.baseVal; return v && v.height ? v.width / v.height : 1340 / 1180; }
  // same size as on the hosted coming-soon page (height clamp(150px, 26vh, 250px), width up to 88vw)
  function startSize() { return Math.min(Math.max(150, Math.min(innerHeight * .26, 250)), innerWidth * .88 / (1340 / 1180)); }
  let lastCss = '';
  function place(cx, cy, h) {
    const w = h * vbAspect();
    const css = `left:${(cx - w / 2).toFixed(1)}px;top:${(cy - h / 2).toFixed(1)}px;width:${w.toFixed(1)}px;height:${h.toFixed(1)}px`;
    if (css !== lastCss) { stage.style.cssText = css; lastCss = css; }
  }
  function land() {
    if (landed) return; landed = true;
    svg.classList.add('on-dark');
    slot.appendChild(svg);
    if (stage) stage.remove(); if (loader) loader.remove();
    html.classList.remove('loading'); html.classList.add('ready');
    landCbs.splice(0).forEach(f => f());
  }
  window.SMY = {
    instant: !loader,                     // pages without the intro just show the finished logo
    whenLanded(f) { if (landed) f(); else landCbs.push(f); },
    ready(fb, instant) {
      svg = $('#opener');
      ar = fb[2] / fb[3];
      slot.style.aspectRatio = ar;
      if (instant) { land(); return; }
      svg.classList.add('on-dark');         // the loader is dark blue now, so the logo text is white from the start
      place(innerWidth / 2, innerHeight / 2, startSize());
    },
    time(t, END, SPEED) {
      if (landed) return;
      const now = performance.now() / 1000;
      if (moveT0 === null) {
        if (t < END - MOVE * SPEED) { place(innerWidth / 2, innerHeight / 2, startSize()); return; }
        moveT0 = now;
      }
      const e = ease(clamp((now - moveT0) / MOVE, 0, 1));
      const r = slot.getBoundingClientRect();
      place(innerWidth / 2 + (r.left + r.width / 2 - innerWidth / 2) * e,
            innerHeight / 2 + (r.top + r.height / 2 - innerHeight / 2) * e,
            startSize() + (r.height - startSize()) * e);
      loader.style.opacity = 1 - e;
      if (e > .45) svg.classList.add('on-dark');
      if (e >= 1 && t >= END) land();
    }
  };
  if (!reduced && loader) loader.addEventListener('click', () => window.SMY.seek && window.SMY.seek(5.9));   // jump to the start of the flight
  // safety net: never trap the visitor behind the loader
  setTimeout(() => { if (!landed) { svg = svg || $('#opener'); land(); } }, 9000);

  /* ---------------- header ---------------- */
  const hdr = $('#hdr');
  const onScroll = () => hdr.classList.toggle('scrolled', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const dd = $('#dd');                          // optional dropdown in the menu
  if (dd) {
    const ddBtn = dd.querySelector('button');
    const setDD = o => { dd.classList.toggle('open', o); ddBtn.setAttribute('aria-expanded', o); };
    const hover = matchMedia('(hover:hover)').matches;   // with a mouse, hovering opens it, so a click never shuts it again straight away
    ddBtn.addEventListener('click', e => { e.stopPropagation(); setDD(hover || !dd.classList.contains('open')); });
    if (hover) { dd.addEventListener('mouseenter', () => setDD(true)); dd.addEventListener('mouseleave', () => setDD(false)); }
    document.addEventListener('click', () => setDD(false));
  }
  const burger = $('#burger');
  const setMenu = o => { document.body.classList.toggle('menu-open', o); burger.setAttribute('aria-expanded', o); burger.setAttribute('aria-label', o ? 'Close menu' : 'Open menu'); };
  burger.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  $$('#nav a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') { setMenu(false); setDD(false); } });

  /* ---------------- reveal on scroll ---------------- */
  // stroke lengths for the line-draw icons
  $$('.ind-ico path, .ind-ico rect, .ind-ico circle').forEach(el => { try { el.style.setProperty('--len', Math.ceil(el.getTotalLength()) + 1); } catch (e) {} });
  const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -10% 0px' });
  $$('.rv').forEach(el => io.observe(el));
  /* ---------------- book a demo: buttons open book-a-demo.html, carrying the industry the visitor was looking at ---------------- */
  $$('[data-demo][data-industry]').forEach(a => {
    a.href = 'book-a-demo?industry=' + encodeURIComponent(a.dataset.industry);
  });
})();

/* ---------------- footer: flowing contour-line waves that part around the cursor ---------------- */
(() => {
  'use strict';
  const cv = document.getElementById('footWave'); if (!cv) return;
  const foot = cv.closest('.foot'), ctx = cv.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const LINES = 16, STEP = 7;
  let W = 0, H = 0, dpr = 1, on = false, raf = 0, t0 = performance.now();
  // the cursor: eased position, how strongly it is felt (fades in and out), and the rings it leaves behind
  const m = { x: -1e4, y: -1e4, tx: -1e4, ty: -1e4, k: 0, tk: 0, lx: 0, ly: 0 };
  const rings = [];

  function size() {
    const r = cv.getBoundingClientRect();
    dpr = Math.min(2, devicePixelRatio || 1);
    W = r.width; H = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(now) {
    const t = (now - t0) / 1000;
    m.x += (m.tx - m.x) * .12; m.y += (m.ty - m.y) * .12; m.k += (m.tk - m.k) * .06;
    ctx.clearRect(0, 0, W, H);
    for (let i = rings.length - 1; i >= 0; i--) if (t - rings[i].t > 2.4) rings.splice(i, 1);
    const sig = Math.max(70, W * .07), sig2 = 2 * sig * sig;
    for (let i = 0; i < LINES; i++) {
      const f = i / (LINES - 1);                                   // 0 = top line, 1 = bottom line
      const base = H * (.14 + .86 * Math.pow(f, 1.25));
      const amp = 8 + 18 * f, ph = i * .55;
      ctx.beginPath();
      let glow = 0;
      for (let x = -STEP; x <= W + STEP; x += STEP) {
        let y = base + amp * Math.sin(x * .0042 + t * .55 + ph) + amp * .55 * Math.sin(x * .011 - t * .8 + ph * 1.7);
        // the lines part around the cursor
        const dx = x - m.x, dy = y - m.y, d2 = dx * dx + dy * dy;
        if (m.k > .01) {
          const g = Math.exp(-d2 / sig2) * m.k;
          y += Math.tanh(dy / 22) * 34 * g; glow = Math.max(glow, g);
        }
        // and ripple where it has been
        for (const r of rings) {
          const age = t - r.t, rx = x - r.x, ry = y - r.y, d = Math.sqrt(rx * rx + ry * ry);
          const front = age * 260;
          y += Math.sin((d - front) * .045) * 9 * Math.exp(-age * 1.6) * Math.exp(-Math.abs(d - front) / 60);
        }
        x === -STEP ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      const a = .1 + .32 * f + .35 * glow;
      ctx.strokeStyle = `rgba(179,238,243,${a.toFixed(3)})`;
      ctx.lineWidth = 1 + .4 * f;
      ctx.stroke();
    }
  }

  function loop(now) { raf = 0; draw(now); if (on && !reduced) raf = requestAnimationFrame(loop); }
  const start = () => { if (!raf && on) raf = requestAnimationFrame(loop); };

  foot.addEventListener('pointermove', e => {
    const r = cv.getBoundingClientRect();
    m.tx = e.clientX - r.left; m.ty = e.clientY - r.top; m.tk = 1;
    if (m.x < -1e3) { m.x = m.tx; m.y = m.ty; }
    // a ring every so often while the cursor travels
    const moved = Math.hypot(m.tx - m.lx, m.ty - m.ly);
    if (moved > 90 && m.ty > -40 && rings.length < 6) { rings.push({ x: m.tx, y: m.ty, t: (performance.now() - t0) / 1000 }); m.lx = m.tx; m.ly = m.ty; }
    if (reduced) draw(performance.now());
  });
  foot.addEventListener('pointerleave', () => { m.tk = 0; });
  foot.addEventListener('pointerdown', e => {
    const r = cv.getBoundingClientRect();
    rings.push({ x: e.clientX - r.left, y: e.clientY - r.top, t: (performance.now() - t0) / 1000 });
  });

  new IntersectionObserver(([en]) => { on = en.isIntersecting && !document.hidden; if (on) { size(); start(); } }).observe(cv);
  document.addEventListener('visibilitychange', () => { on = !document.hidden && cv.getBoundingClientRect().top < innerHeight; start(); });
  addEventListener('resize', () => { size(); draw(performance.now()); });
  size(); draw(performance.now());
})();
