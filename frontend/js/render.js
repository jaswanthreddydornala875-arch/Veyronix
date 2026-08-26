"use strict";

/* ============================================================================
   PART 5 — RENDERING
   ============================================================================ */
function renderResults() {
  const box = $('#results');
  const r = state.report;

  if (!r) {
    box.innerHTML = `<div class="card"><div class="empty">
      ${state.extraction ? 'Label loaded. Run the check to see findings.' : 'Pick a sample or upload a label,<br>then run the check.'}
    </div></div>`;
    return;
  }

  const verdict = `
    <div class="card">
      <div class="verdict ${r.compliant ? 'pass' : 'fail'}">
        <div class="status">${r.compliant ? 'Compliant' : 'Non-compliant'}</div>
        <div class="sub">${r.product} · ${r.id} · ${r.checkedAt.toLocaleString('en-IN')}</div>
        <div class="tallies">
          <div class="tally"><b>${r.violations}</b><span>violations</span></div>
          <div class="tally"><b>${r.advisories}</b><span>advisory</span></div>
          <div class="tally"><b>${r.passed}</b><span>passed</span></div>
          <div class="tally"><b class="mono">${r.required.mm} mm</b><span>min height, ${r.required.band}</span></div>
        </div>
      </div>
      <div class="btn-row" style="padding:0 16px 16px">
        <button class="btn" id="pdf">Download report</button>
        <button class="btn ghost" id="copy">Copy findings</button>
      </div>
    </div>`;

  const declarations = `
    <div class="card">
      <div class="card-head"><h3>Declarations</h3><span class="cite">Rule 6</span></div>
      ${r.findings.filter(f => !f.title.startsWith('Letter')).map(f => `
        <div class="finding ${f.level}" data-key="${f.key}">
          <div class="dot ${f.level === 'bad' ? 'bad' : f.level === 'warn' ? 'warn' : 'ok'}"></div>
          <div>
            <h4>${f.title} <span class="cite">${f.cite}</span></h4>
            <div class="found">${escapeHtml(f.found)}</div>
            ${f.note ? `<div class="note">${f.note}</div>` : ''}
          </div>
        </div>`).join('')}
    </div>`;

  const gauges = r.gauges.length ? `
    <div class="card">
      <div class="card-head"><h3>Letter height</h3><span class="cite">Rule 7(2) · ${r.required.band}</span></div>
      ${r.gauges.map(g => gaugeRow(g, r.required.mm)).join('')}
    </div>` : '';

  const penalty = r.compliant ? '' : `
    <div class="card"><div class="card-body">
      <div class="note-strip">
        A package that does not carry the required declarations attracts a fine of up to ₹25,000 on a
        first offence, rising to ₹50,000 and then ₹50,000–₹1,00,000 or imprisonment up to one year.
        Legal Metrology Act 2009, Sec. 36(1).
      </div>
    </div></div>`;

  box.innerHTML = verdict + declarations + gauges + penalty;

  $('#pdf').addEventListener('click', downloadReport);
  $('#copy').addEventListener('click', copyFindings);
  $$('#results .finding').forEach(el => {
    el.addEventListener('mouseenter', () => lightBox(el.dataset.key, true));
    el.addEventListener('mouseleave', () => lightBox(el.dataset.key, false));
  });
}

/* The millimetre gauge. Scale runs 0–8 mm so every band on both tables fits. */
function gaugeRow(g, reqMm) {
  const SPAN = 8;                                   // mm shown on the scale
  const pct  = mm => (mm / SPAN) * 100;
  let ticks = '';
  for (let i = 0; i <= SPAN; i++) {
    ticks += `<div class="tick ${i % 2 === 0 ? 'major' : ''}" style="left:${pct(i)}%">
      ${i % 2 === 0 ? `<i>${i}</i>` : ''}</div>`;
  }
  return `
    <div class="gauge-row">
      <div class="gauge-top">
        <h4>${g.title}</h4>
        <span class="verd ${g.ok ? 'ok' : 'bad'}">${g.ok ? 'within limit' : 'below minimum'}</span>
      </div>
      <div class="gauge">
        <div class="measured" style="left:${pct(Math.min(g.measured, SPAN))}%;transform:translateX(-100%);padding-right:6px">
          ${g.measured.toFixed(1)} mm
        </div>
        <div class="bar ${g.ok ? '' : 'bad'}" style="width:${pct(Math.min(g.measured, SPAN))}%"></div>
        <div class="req" style="left:${pct(reqMm)}%"><i>min ${reqMm} mm</i></div>
        <div class="scale"></div>
        ${ticks}
      </div>
      ${g.note ? `<div class="note" style="color:var(--fail);font-size:12.5px">${g.note}</div>` : ''}
    </div>`;
}

/* Overlay boxes on the sample label, coloured by verdict. */
function paintOverlay() {
  const svg = document.getElementById('overlay');
  if (!svg || !state.extraction || !state.report) return;
  const verdictOf = key => {
    const f = state.report.findings.find(x => x.key === key);
    return !f ? 'miss' : f.level === 'ok' ? 'ok' : f.level === 'warn' ? 'miss' : 'bad';
  };
  svg.innerHTML = Object.entries(state.extraction.fields)
    .filter(([, f]) => f.box)
    .map(([k, f]) => `<rect class="ovl ${verdictOf(k)}" data-key="${k}"
        x="${f.box[0]}" y="${f.box[1]}" width="${f.box[2]}" height="${f.box[3]}" rx="2"/>`)
    .join('');
}
function lightBox(key, on) {
  $$(`.ovl[data-key="${key}"]`).forEach(r => r.classList.toggle('lit', on));
}

/* ---- repository ---- */
function renderRepo() {
  $('#repoCount').textContent = state.repo.length + ' checks';
  $('#repoBody').innerHTML = state.repo.length ? state.repo.map(r => `
    <tr>
      <td>${r.product}<div class="mono" style="font-size:11px;color:var(--ink-35)">${r.id}</div></td>
      <td class="num">${r.checkedAt.toLocaleDateString('en-IN')}</td>
      <td><span class="pill ${r.compliant ? 'ok' : 'bad'}">${r.compliant ? 'Compliant' : 'Non-compliant'}</span></td>
      <td class="num">${r.violations}${r.advisories ? ` <span class="pill warn">${r.advisories} advisory</span>` : ''}</td>
      <td>${r.checkedBy}</td>
      <td><button class="chip" data-open="${r.id}">Open</button></td>
    </tr>`).join('')
    : `<tr><td colspan="6"><div class="empty">No checks yet.</div></td></tr>`;

  $$('#repoBody [data-open]').forEach(b => b.addEventListener('click', () => {
    state.report = state.repo.find(r => r.id === b.dataset.open);
    $$('.tabs button').forEach(x => x.setAttribute('aria-selected', String(x.dataset.view === 'scan')));
    $$('.view').forEach(v => v.hidden = v.id !== 'view-scan');
    renderResults();
  }));
}

/* ---- rule reference table ---- */
$('#rule6Body').innerHTML = DECLARATIONS.map(d => `
  <tr><td>${d.label}</td><td class="num">${d.cite}</td><td style="color:var(--ink-60)">${d.checks}</td></tr>
`).join('');

