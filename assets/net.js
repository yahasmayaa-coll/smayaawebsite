(() => {
  'use strict';
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const html = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const ease = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

  /* ---------------- hero: interactive net ---------------- */
  const cv = $('#net'); if (!cv) return;
  const ctx = cv.getContext('2d');
  let W = 0, H = 0, running = false, visible = true;
  // the cursor deforms the surface: a soft swell with rings rippling out from it (no lines, no glow)
  const mouse = { x: 0, y: 0, sx: 0, sy: 0, on: false, k: 0 };
  // A plane of particles seen in perspective, rolling in slow waves.
  // World units: X across, Z into the screen, Y up. Rows are evenly spaced in the world, so they bunch up toward the horizon.
  // The field starts a little way from the camera (ZN) so the lower half of the hero stays densely filled.
  const SEP = .13, ZN = 2.4, ZF = 18;
  let f = 1, horizon = 0, camY = 1, NX = 0, NZ = 0;
  function build() {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    f = Math.max(W, H * 1.25) * .62;
    horizon = H * .38;
    // nearest row sits below the bottom edge even at a wave crest (waves move it up to ~0.37 world units)
    camY = (H * 1.02 - horizon) * ZN / f + .4;
    NX = 2 * Math.ceil(((W / 2 + 60) * ZF / f + 1) / SEP) + 1;
    NZ = Math.ceil((ZF - ZN) / SEP);
  }
  let skip = false;
  function frame(ms) {
    if (running && W < 700 && (skip = !skip)) { requestAnimationFrame(frame); return; }
    const t = ms / 1000;
    mouse.sx += (mouse.x - mouse.sx) * .12; mouse.sy += (mouse.y - mouse.sy) * .12;
    mouse.k += ((mouse.on ? 1 : 0) - mouse.k) * .05;
    const mk = mouse.k, R = clamp(W * .14, 130, 240), R2 = R * R;
    ctx.clearRect(0, 0, W, H);
    const c = (NX - 1) / 2;
    for (let r = NZ - 1; r >= 0; r--) {                 // far to near, so near particles draw on top
      const Z = ZF - r * SEP, sc = f / Z;
      const depth = (Z - ZN) / (ZF - ZN);
      const a = (.22 + .7 * Math.pow(1 - depth, .9)) * Math.min(1, (1 - depth) / .16);
      if (a <= .01) continue;
      const size = clamp(SEP * sc * .06, .7, 3.6);
      ctx.fillStyle = `rgba(206,246,250,${a.toFixed(3)})`;
      const half = Math.ceil((W / 2 + 40) / sc / SEP);
      const i0 = Math.max(0, Math.floor(c - half)), i1 = Math.min(NX - 1, Math.ceil(c + half));
      const zw = Math.sin(Z * .85 - t * 1.15);
      for (let ix = i0; ix <= i1; ix++) {
        const X = (ix - c) * SEP;
        const Y = .16 * (Math.sin(X * 1.05 + t * 1.35) + zw) + .05 * Math.sin((X + Z) * 2.3 - t * 2);
        let sx = W / 2 + X * sc, sy = horizon + (camY - Y) * sc;
        if (mk > .005) {
          // distance measured on the plane's slant (vertical squashed) so the dent sits on the surface
          const dx = sx - mouse.sx, dy = (sy - mouse.sy) * 1.8, d2 = dx * dx + dy * dy;
          if (d2 < R2) {
            const d = Math.sqrt(d2), q = 1 - d / R, s = q * q * (3 - 2 * q) * mk;
            const ring = Math.sin(d * .06 - t * 5);         // ripples travelling outward from the cursor
            const push = s * R * .3;                        // particles are pushed out, piling up into a rim
            sx += dx / (d || 1) * push;
            sy += (sy - mouse.sy) / (d || 1) * push * .55 - s * (16 + sc * .05) * (1 + ring * .6);
          }
        }
        if (sx < -10 || sx > W + 10 || sy < -10 || sy > H + 10) continue;
        ctx.fillRect(sx - size / 2, sy - size / 2, size, size);
      }
    }
    if (running) requestAnimationFrame(frame);
  }
  // the wave rolls from the first frame, behind the logo intro too (as on the coming-soon page)
  function setRun(on) { if (on && !running && !reduced) { running = true; requestAnimationFrame(frame); } else if (!on) running = false; }
  build();
  frame(performance.now());
  addEventListener('resize', () => { build(); if (!running) frame(performance.now()); }, { passive: true });
  const hero = cv.closest('section');
  hero.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    const b = cv.getBoundingClientRect(); mouse.x = e.clientX - b.left; mouse.y = e.clientY - b.top;
    if (!mouse.on && mouse.k < .05) { mouse.sx = mouse.x; mouse.sy = mouse.y; }
    mouse.on = true;
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { mouse.on = false; });
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; setRun(visible && !document.hidden); }).observe(hero);
  document.addEventListener('visibilitychange', () => setRun(visible && !document.hidden));

})();
