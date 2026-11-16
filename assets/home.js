(() => {
  'use strict';
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const html = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const ease = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

  /* ---------------- hero: rotating phrase ---------------- */
  (() => {
    const words = $$('#heroRot .rw'); let i = 0;
    if (reduced || words.length < 2) return;
    setInterval(() => {
      if (document.hidden || !document.documentElement.classList.contains('ready')) return;
      const cur = words[i]; i = (i + 1) % words.length; const nxt = words[i];
      cur.classList.replace('on', 'out'); cur.setAttribute('aria-hidden', 'true');
      nxt.classList.toggle('out', false); void nxt.offsetWidth; nxt.classList.add('on'); nxt.removeAttribute('aria-hidden');
      setTimeout(() => cur.classList.toggle('out', false), 550);   // park it below again, ready for its next turn
    }, 1300);   // 0.5 s slide + 0.8 s still
  })();

  /* ---------------- industries coverflow ---------------- */
  (() => {
    const root = $('#indCf'), frame = root.querySelector('.cf-frame'), cards = [...root.querySelectorAll('.cf-card')];
    const cap = $('#cfCap'), dotsEl = root.querySelector('.cf-dots'), N = cards.length;
    const ROT = 44, DEPTH = .6, FALL = .56, FADE = .1, GAP = .05;
    let pos = 0, target = 0, width = 0, raf = null, drag = null, sel = -1, seen = false;
    const idx = p => ((Math.round(p) % N) + N) % N;
    const offOf = i => { let o = (((i - pos) % N) + N) % N; return o > N / 2 ? o - N : o; };   // shorter way round the ring
    const dots = cards.map((c, i) => {
      const b = document.createElement('button'); b.type = 'button';
      b.setAttribute('aria-label', c.querySelector('h3').textContent);
      b.addEventListener('click', () => goTo(i)); dotsEl.appendChild(b); return b;
    });
    cards.forEach((c, i) => { c.setAttribute('aria-roledescription', 'slide'); c.setAttribute('aria-label', `${i + 1} of ${N}`); });
    const play = (c, delay = 0) => {
      c.classList.remove('play'); void c.offsetWidth;
      c.querySelectorAll('path,rect,circle').forEach(el => el.style.animationDelay = delay + 's');
      c.classList.add('play');
    };
    function select(i) {
      if (i === sel) return; sel = i;
      cards.forEach((c, k) => c.classList.toggle('on', k === i));
      dots.forEach((d, k) => d.setAttribute('aria-current', k === i));
      cap.innerHTML = `<p>${cards[i].dataset.desc} <a class="cf-more" href="${cards[i].dataset.href}">Explore ${cards[i].querySelector('h3').textContent} →</a></p>`;
      if (seen && !reduced) play(cards[i]);
    }
    function paint() {
      if (!width) return;
      const pitch = width * (1 + GAP);
      cards.forEach((c, i) => {
        const off = offOf(i), d = Math.abs(off), ramp = Math.pow(d, FALL);
        const tilt = Math.min(ROT * ramp, 82) * Math.sign(off);           // capped short of edge-on
        c.style.transform = `translateX(calc(-50% + ${off * pitch}px)) translateZ(${-DEPTH * width * ramp}px) rotateY(${-tilt}deg)`;
        const edge = Math.min(1, Math.max(0, N / 2 - d));                   // gone before it wraps to the other side
        c.style.opacity = Math.max(0, 1 - FADE * d) * edge;
        c.style.zIndex = 100 - Math.round(d);
      });
    }
    function settle(t, auto) {
      if (raf) cancelAnimationFrame(raf);
      if (!auto) hold = performance.now() + 4000;       // after any manual move, wait a moment before auto-advancing again (touch has no hover)
      target = t; select(idx(t));
      if (reduced) { pos = t; paint(); raf = null; return; }
      const k = auto ? .075 : .16;                      // the auto glide is gentler than a manual snap
      const step = () => {
        const r = target - pos;
        if (Math.abs(r) < .0004) { pos = target; paint(); raf = null; return; }
        pos += r * k; paint(); raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }
    const goTo = i => settle(i + Math.round((target - i) / N) * N);
    const nudge = by => settle(Math.round(target) + by);
    root.querySelector('.cf-prev').addEventListener('click', () => nudge(-1));
    root.querySelector('.cf-next').addEventListener('click', () => nudge(1));
    frame.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); nudge(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); nudge(1); }
    });
    frame.addEventListener('pointerdown', e => {
      if (e.button) return;
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      frame.setPointerCapture(e.pointerId); target = pos;
      drag = { id: e.pointerId, x: e.clientX, pos, v: 0, t: performance.now(), moved: 0, card: e.target.closest('.cf-card') };
    });
    frame.addEventListener('pointermove', e => {
      if (!drag || drag.id !== e.pointerId) return;
      const pitch = width * (1 + GAP); if (!pitch) return;
      const now = performance.now(), prev = pos;
      pos = drag.pos - (e.clientX - drag.x) / pitch;
      drag.moved = Math.max(drag.moved, Math.abs(e.clientX - drag.x));
      drag.v = (pos - prev) / Math.max(now - drag.t, 1) * 1000; drag.t = now;   // cards per second, for the throw
      select(idx(pos)); paint();
    });
    const end = e => {
      if (!drag || drag.id !== e.pointerId) return;
      const d = drag; drag = null;
      if (d.moved < 6 && d.card) {                                        // a tap on a side card brings it to the centre;
        const i = cards.indexOf(d.card);                                  // a tap on the centre card opens its application page
        if (i === sel && d.card.dataset.href) { location.href = d.card.dataset.href; return; }
        return goTo(i);
      }
      settle(Math.round(pos + Math.max(-2, Math.min(2, d.v * .18))));     // a flick carries, but never more than two cards
    };
    frame.addEventListener('pointerup', end); frame.addEventListener('pointercancel', end);
    const measure = () => { width = cards[0].offsetWidth; paint(); };
    new ResizeObserver(measure).observe(frame);
    measure(); select(0);
    // first sight: every icon draws in, the centre first and its neighbours rippling outward
    const sio = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting) return;
      sio.disconnect(); seen = true; root.classList.add('in');
      if (!reduced) cards.forEach((c, i) => play(c, Math.abs(offOf(i)) * .12));
    }, { rootMargin: '0px 0px -15% 0px' });
    sio.observe(root);

    // slow auto-scroll: glide to the next card, rest on it, repeat; manual control while the mouse is on the carousel
    const REST = 2600;                                   // ms each industry stays at the centre
    let hover = false, focused = false, inView = false, hold = 0, loopRaf = null, restAt = 0;
    const idle = now => !reduced && !hover && !focused && !drag && !raf && !document.hidden && now > hold;
    function loop(now) {
      if (!idle(now)) restAt = now;                      // the rest timer only runs while the carousel sits still and untouched
      else if (now - restAt > REST) settle(Math.round(target) + 1, true);
      loopRaf = inView ? requestAnimationFrame(loop) : null;
    }
    new IntersectionObserver(([en]) => {
      inView = en.isIntersecting;
      if (inView && !loopRaf) { restAt = performance.now(); loopRaf = requestAnimationFrame(loop); }
    }).observe(root);
    root.addEventListener('pointerenter', e => {
      if (e.pointerType !== 'mouse') return;
      hover = true;
      if (!raf && !drag) settle(Math.round(pos));       // ease onto the nearest card so it's ready to use
    });
    root.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { hover = false; hold = 0; } });
    root.addEventListener('focusin', e => { focused = e.target.matches(':focus-visible'); });   // keyboard users get manual control too
    root.addEventListener('focusout', () => { focused = false; });
  })();

  /* ---------------- why SMAYAA: scroll story ---------------- */
  (() => {
    const ws = $('#ws'), steps = $$('.ws-step'), card = $('.ws-card'), stage = $('.ws-stage');
    const pipe = $('.ws-pipe'), num = $('#wsNum'), tag = $('#wsTag'), N = steps.length;
    let cur = 0, ticking = false, live = false;
    const narrow = matchMedia('(max-width:900px)');
    // the pipe runs from the first step's node to the last one's
    const layout = () => {
      const a = steps[0].offsetTop + steps[0].offsetHeight / 2, b = steps[N - 1].offsetTop + steps[N - 1].offsetHeight / 2;
      pipe.style.setProperty('--p0', a + 'px'); pipe.style.setProperty('--ph', (b - a) + 'px');
    };
    function update() {
      ticking = false;
      // on phones the plant is pinned above the text, so "the middle" is the middle of what's left below it
      // (phones held sideways put the card beside the text again, so check the actual layout, not just the width)
      const stacked = narrow.matches && getComputedStyle(ws).display === 'flex';
      const top = stacked ? stage.getBoundingClientRect().bottom : 0, mid = (top + innerHeight) / 2;
      const c = steps.map(s => { const r = s.getBoundingClientRect(); return r.top + r.height / 2; });
      let act = 0; c.forEach((y, i) => { if (y - (c[1] - c[0]) / 2 < mid) act = i; });
      ws.style.setProperty('--fill', Math.max(0, Math.min(1, (mid - c[0]) / (c[N - 1] - c[0]))).toFixed(4));
      steps.forEach((s, i) => { s.classList.toggle('on', i === act); s.classList.toggle('past', i <= act); });
      if (act !== cur) {
        cur = act; card.dataset.step = act;
        num.textContent = `${String(act + 1).padStart(2, '0')} / ${String(N).padStart(2, '0')}`;
        tag.textContent = steps[act].dataset.tag;
        tag.style.animation = 'none'; void tag.offsetWidth; tag.style.animation = '';
      }
    }
    const onScroll = () => { if (live && !ticking) { ticking = true; requestAnimationFrame(update); } };
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', () => { layout(); onScroll(); }, { passive: true });
    new IntersectionObserver(([en]) => { live = en.isIntersecting; ws.classList.toggle('live', live); if (live) { layout(); update(); } }).observe(ws);
    layout();
  })();

  /* ---------------- problem cards ---------------- */
  const pcards = $$('.pcard');
  pcards.forEach(c => { const on = () => pcards.forEach(x => x.classList.toggle('on', x === c)); c.addEventListener('pointerenter', on); c.addEventListener('focus', on); c.addEventListener('click', on); });

  /* ---------------- modules: tabs switch the HTML platform screen on the laptop (screens.js) ---------------- */
  const tabs = $$('.tab'), host = $('#screen .lap-scr');
  const SLUGS = ['water-balance', 'thermal', 'coc', 'predictive-maintenance', 'optimization'];
  function setMod(i) {
    tabs.forEach((t, k) => { t.setAttribute('aria-selected', k === i); t.tabIndex = k === i ? 0 : -1; });
    if (host && window.SMYScreens) window.SMYScreens.show(host, SLUGS[i]);
  }
  tabs.forEach((t, i) => t.addEventListener('click', () => setMod(i)));
  $('#tabs').addEventListener('keydown', e => {
    const cur = tabs.findIndex(t => t.getAttribute('aria-selected') === 'true'), N = tabs.length;
    const n = e.key === 'ArrowRight' ? (cur + 1) % N : e.key === 'ArrowLeft' ? (cur + N - 1) % N : -1;
    if (n >= 0) { e.preventDefault(); setMod(n); tabs[n].focus(); }
  });

})();
