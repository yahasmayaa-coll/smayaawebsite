(() => {
  'use strict';
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const qs = $$('.q'), secs = $$('.fsec'), links = $$('.fnav a');
  if (!qs.length) return;

  /* ---------------- answers slide open and closed ---------------- */
  function toggle(d, open) {
    if (open === d.open) return;
    const a = d.querySelector('.ans');
    if (reduced) { d.open = open; return; }
    if (open) {
      d.open = true;
      const h = a.scrollHeight;
      a.animate([{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.22,.8,.22,1)' });
    } else {
      const h = a.scrollHeight;
      const an = a.animate([{ height: h + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 320, easing: 'cubic-bezier(.4,0,.2,1)' });
      an.onfinish = () => { d.open = false; };
    }
  }
  qs.forEach(d => d.querySelector('summary').addEventListener('click', e => {
    e.preventDefault();
    const open = !d.open;
    toggle(d, open);
    if (open) history.replaceState(null, '', '#' + d.id);
  }));
  $('#openAll').addEventListener('click', () => qs.filter(q => !q.classList.contains('hide')).forEach(q => toggle(q, true)));
  $('#closeAll').addEventListener('click', () => qs.forEach(q => toggle(q, false)));

  /* ---------------- search ---------------- */
  // keep each question's and answer's original text, to highlight matches without touching the markup
  const texts = qs.map(d => [d.querySelector('.qt'), d.querySelector('.ans p')].map(el => ({ el, t: el.textContent })));
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const rx = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function search(term) {
    const words = term.toLowerCase().split(/\s+/).filter(Boolean);
    const re = words.length ? new RegExp('(' + words.map(rx).join('|') + ')', 'gi') : null;
    let shown = 0;
    qs.forEach((d, i) => {
      const hay = texts[i].map(x => x.t.toLowerCase()).join(' ');
      const hit = words.every(w => hay.includes(w));
      d.classList.toggle('hide', !hit);
      texts[i].forEach(({ el, t }) => { el.innerHTML = re && hit ? esc(t).replace(re, '<mark>$1</mark>') : esc(t); });
      if (hit) shown++;
      // open the matching answers while searching, so the highlighted words are visible
      if (words.length) d.open = hit && words.some(w => texts[i][1].t.toLowerCase().includes(w));
    });
    secs.forEach(s => s.classList.toggle('hide', !s.querySelector('.q:not(.hide)')));
    links.forEach(a => a.classList.toggle('empty', !!$('#' + a.dataset.sec).classList.contains('hide')));
    $('#fqNone').classList.toggle('show', shown === 0);
    $('#fqCount').textContent = words.length ? `${shown} of ${qs.length} questions` : `${qs.length} questions`;
  }
  let t = 0;
  $('#fqSearch').addEventListener('input', e => { clearTimeout(t); t = setTimeout(() => search(e.target.value.trim()), 120); });

  /* ---------------- section navigator follows the reading position ---------------- */
  const vis = new Set();
  const spy = new IntersectionObserver(es => {
    es.forEach(en => en.isIntersecting ? vis.add(en.target.id) : vis.delete(en.target.id));
    const cur = secs.find(s => vis.has(s.id));
    if (cur) links.forEach(a => a.setAttribute('aria-current', a.dataset.sec === cur.id));
  }, { rootMargin: '-30% 0px -60% 0px' });
  secs.forEach(s => spy.observe(s));

  /* ---------------- a link to #q12 opens that question ---------------- */
  function fromHash() {
    const d = location.hash && document.getElementById(location.hash.slice(1));
    if (d && d.classList.contains('q')) { d.open = true; d.scrollIntoView({ block: 'center' }); }
  }
  fromHash();
  addEventListener('hashchange', fromHash);
})();
