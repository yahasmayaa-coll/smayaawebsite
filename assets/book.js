(() => {
  'use strict';
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const form = $('#demoPage'); if (!form) return;
  const role = $('#role'), app = $('#app'), industry = $('#industry'), oem = $('#oem'), other = $('#otherInd');
  const name = $('#cname'), company = $('#company'), email = $('#email'), cc = $('#cc'), phone = $('#phone');

  // "Book a demo" buttons elsewhere pass the industry the visitor was looking at (?industry=Steel%20%26%20Metal)
  const FROM_SITE = {
    'Steel & Metal': 'steel', 'Power Generation': 'power', 'Pulp & Paper': 'paper', 'Cement Manufacturing': 'cement',
    'Refineries & Petrochemicals': 'refining', 'Data Centres': 'datacentre', 'HVAC & District Cooling': 'hvac', 'Other Water-Intensive Industries': 'other',
  };

  const text = s => s.options[s.selectedIndex].text;
  const industryName = () => industry.value === 'other' ? (other.value.trim() || 'Other industry') : text(industry);

  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  function update() {
    $('#oemWrap').classList.toggle('show', role.value === 'oem');
    $('#otherWrap').classList.toggle('show', industry.value === 'other');
    // progress: profile, application, industry, details
    const done = [true, true, industry.value !== 'other' || !!other.value.trim(), !!(name.value.trim() && company.value.trim() && email.validity.valid && email.value)];
    $$('.prog i').forEach((b, i) => b.classList.toggle('ok', done[i] && (i < 3 ? form.dataset.touched || i === 0 : true)));
  }

  function summary() {
    const rows = [
      ['Profile', text(role) + (role.value === 'oem' ? ' (' + text(oem) + ')' : '')],
      ['Application', text(app)], ['Industry', industryName()],
      ['Name', name.value.trim()], ['Company', company.value.trim()], ['Email', email.value.trim()],
      ['Contact', phone.value.trim() ? cc.value + ' ' + phone.value.trim() : ''],
    ].filter(r => r[1]);
    return rows;
  }

  form.addEventListener('input', () => { form.dataset.touched = 1; update(); });
  form.addEventListener('change', () => { form.dataset.touched = 1; update(); });

  // Demo requests go to a dedicated Google Apps Script web app (separate from the launch-invitation one).
  // Paste its Web app URL (ending in /exec) between the quotes. Until then the form shows an error instead of sending.
  const ENDPOINT = 'https://script.google.com/macros/s/AKfycby10CDsjwxQ2z6ITcusaVa-LJNabWJ41N_b1r5XKabh0D3kcfRH-k-3z9fn7xRKq489/exec';
  const submitBtn = form.querySelector('.bk-submit');
  const btnLabel = submitBtn.innerHTML;
  const errMsg = document.createElement('p');
  errMsg.className = 'fine'; errMsg.setAttribute('role', 'alert'); errMsg.style.color = '#c0562a'; errMsg.hidden = true;
  submitBtn.insertAdjacentElement('afterend', errMsg);

  function payload() {
    return new URLSearchParams({
      form: 'demo',
      role: text(role),
      equipment: role.value === 'oem' ? text(oem) : '',
      application: text(app),
      industry: industryName(),
      name: name.value.trim(),
      company: company.value.trim(),
      email: email.value.trim(),
      phone: phone.value.trim() ? cc.value + ' ' + phone.value.trim() : '',
      page: location.href,
      website: (form.querySelector('[name=website]') || {}).value || '',   // spam trap, left empty by people
    });
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const bad = [name, company, email].find(f => !f.value.trim() || !f.checkValidity());
    if (bad) { bad.reportValidity(); bad.focus(); return; }
    errMsg.hidden = true;
    if (!ENDPOINT) {
      errMsg.textContent = 'Online booking is not available yet. Please contact us to arrange your demo.';
      errMsg.hidden = false;
      return;
    }
    submitBtn.disabled = true; submitBtn.textContent = 'Sending…';
    try {
      const res = await fetch(ENDPOINT, { method: 'POST', body: payload() });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || 'failed');
    } catch (err) {
      errMsg.textContent = 'Sorry, we could not send your request. Please check your connection and try again.';
      errMsg.hidden = false;
      submitBtn.disabled = false; submitBtn.innerHTML = btnLabel;
      return;
    }
    submitBtn.disabled = false; submitBtn.innerHTML = btnLabel;
    const rows = summary();
    $('#sum').innerHTML = rows.map(([k, v]) => `<b>${esc(k)}:</b> ${esc(v)}`).join('<br>');
    $('#bkForm').classList.add('sent');
    $('#bkForm').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  });

  $('#copySel').addEventListener('click', async e => {
    const t = summary().map(([k, v]) => `${k}: ${v}`).join(' | ');
    try { await navigator.clipboard.writeText(t); e.target.textContent = 'Copied'; }
    catch { e.target.textContent = 'Copy not available'; }
  });

  const q = new URLSearchParams(location.search).get('industry');
  if (q && FROM_SITE[q]) industry.value = FROM_SITE[q];
  update();
})();

// contact details under the form: copy the email / phone, and a soft light follows the cursor across each card
(() => {
  'use strict';
  const $$ = s => [...document.querySelectorAll(s)];
  $$('[data-copy-btn]').forEach(b => b.addEventListener('click', async () => {
    const v = b.parentElement.querySelector('[data-copy]').textContent.trim(), label = b.textContent;
    try { await navigator.clipboard.writeText(v); b.textContent = 'Copied'; }
    catch { b.textContent = 'Copy not available'; }
    setTimeout(() => { b.textContent = label; }, 1800);
  }));
  $$('.cd').forEach(c => c.addEventListener('pointermove', e => {
    const r = c.getBoundingClientRect();
    c.style.setProperty('--mx', e.clientX - r.left + 'px');
    c.style.setProperty('--my', e.clientY - r.top + 'px');
  }));
})();
