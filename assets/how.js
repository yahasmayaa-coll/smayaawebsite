(() => {
  'use strict';
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  /* ---------------- one system: the diagram follows the module being read ---------------- */
  const sys = $('#sys'), steps = $$('.ostep'), layers = $$('.ly');
  if (sys) {
    // assemble on first sight; data only flows while the diagram is on screen
    new IntersectionObserver(([en]) => {
      if (en.isIntersecting) sys.classList.add('lit');
      sys.classList.toggle('run', en.isIntersecting && !reduced);
    }, { threshold: .15 }).observe(sys);

    const show = l => {
      sys.classList.toggle('live', !!l);
      layers.forEach(x => x.classList.toggle('on', x.dataset.l === l));
      steps.forEach(x => x.classList.toggle('on', x.dataset.l === l));
    };
    const seen = new Set();
    const io = new IntersectionObserver(es => {
      es.forEach(en => en.isIntersecting ? seen.add(en.target) : seen.delete(en.target));
      const cur = steps.find(s => seen.has(s));
      if (cur) show(cur.dataset.l);
      else if (!steps.some(s => s.getBoundingClientRect().top < innerHeight / 2)) show(null);   // above the first module
    }, { rootMargin: '-45% 0px -45% 0px' });
    steps.forEach(s => io.observe(s));

    // a soft light follows the cursor across each layer
    sys.addEventListener('pointermove', e => {
      const ly = e.target.closest('.ly'); if (!ly) return;
      const r = ly.getBoundingClientRect();
      ly.style.setProperty('--mx', e.clientX - r.left + 'px');
      ly.style.setProperty('--my', e.clientY - r.top + 'px');
    });
    // clicking a SMAYAA layer brings its module text to the middle of the screen
    $$('.ly .go').forEach(a => a.addEventListener('click', e => {
      const t = $(a.getAttribute('href')); if (!t) return;
      e.preventDefault();
      if (matchMedia('(max-width:900px)').matches) t.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      else scrollTo({ top: scrollY + t.getBoundingClientRect().top - innerHeight / 2 + t.offsetHeight / 2, behavior: reduced ? 'auto' : 'smooth' });
      history.replaceState(null, '', a.getAttribute('href'));
    }));
  }

  /* ---------------- complementing: the sentence lights up word by word as it scrolls in ---------------- */
  const cp = $('.cp'), q = $('.cp-q'), media = $('.cp-media'), vid = $('.cp-media video');
  let words = [];
  if (q) {
    const split = node => [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(w => {
          if (!w) return;
          if (/^\s+$/.test(w)) { frag.append(w); return; }
          const s = document.createElement('span'); s.className = 'wd'; s.textContent = w; frag.append(s);
        });
        n.replaceWith(frag);
      } else if (n.classList && n.classList.contains('not')) n.classList.add('wd');
      else split(n);
    });
    split(q);
    words = $$('.cp-q .wd');
    if (reduced) words.forEach(w => w.classList.add('lit'));
  }
  let cpOn = false, raf = 0;
  function frame() {
    raf = 0;
    if (!cp) return;
    const r = cp.getBoundingClientRect(), vh = innerHeight;
    if (!reduced) {
      // words: from the section's top entering the lower part of the screen until its middle passes 45%
      const p = clamp((vh * .85 - r.top) / (r.height * .5 + vh * .4), 0, 1);
      const n = Math.round(p * words.length * 1.1);
      words.forEach((w, i) => w.classList.toggle('lit', i < n));
      // gentle parallax on the background
      const k = clamp((vh - r.top) / (vh + r.height), 0, 1);
      media.style.transform = `translate3d(0,${(k - .5) * -12}%,0)`;
    }
  }
  const ask = () => { if (!raf) raf = requestAnimationFrame(frame); };
  addEventListener('scroll', ask, { passive: true });
  addEventListener('resize', ask);

  if (cp) new IntersectionObserver(([en]) => {
    cpOn = en.isIntersecting;
    if (!vid) return;
    // loops while the panel is on screen
    if (cpOn && !reduced && !document.hidden) { if (!vid.src) vid.src = vid.dataset.src; vid.play().catch(() => {}); }
    else vid.pause();
  }, { threshold: .3 }).observe(cp);
  // start downloading a little before the panel arrives, so it can play as soon as it is seen
  if (vid && !reduced) new IntersectionObserver(([en], o) => { if (en.isIntersecting) { vid.preload = 'auto'; if (!vid.src) vid.src = vid.dataset.src; o.disconnect(); } }, { rootMargin: '600px 0px' }).observe(cp);
  document.addEventListener('visibilitychange', () => { if (vid && document.hidden) vid.pause(); else if (vid && cpOn && !reduced && vid.src) vid.play().catch(() => {}); });

  frame();
})();
