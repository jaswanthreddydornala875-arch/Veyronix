"use strict";

/* ============================================================================
   PART 4 — UI STATE AND WIRING
   ============================================================================ */
const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const state = {
  extraction: null,
  report: null,
  repo: []            /* swap for Supabase or localStorage when you have one */
};

/* ---- theme ---- */
const THEME_KEY = 'labellens-theme';
const themeToggle = $('#themeToggle');
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeToggle.setAttribute('aria-pressed', String(theme === 'light'));
  themeToggle.querySelector('.theme-toggle-icon').textContent = theme === 'light' ? '☀️' : '🌙';
  themeToggle.querySelector('.theme-toggle-label').textContent = theme === 'light' ? 'Light' : 'Dark';
}
function currentTheme() {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}
applyTheme(currentTheme());
themeToggle.addEventListener('click', () => {
  const next = currentTheme() === 'light' ? 'dark' : 'light';
  applyTheme(next);
  try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
});

/* ---- custom cursor ----
   Desktop with a precise pointer only; touch devices and reduced-motion
   preferences keep the native cursor untouched. */
const wantsCustomCursor =
  window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (wantsCustomCursor) {
  document.documentElement.classList.add('has-custom-cursor');
  const cursorDot = document.createElement('div');
  cursorDot.className = 'cursor-dot';
  const cursorRing = document.createElement('div');
  cursorRing.className = 'cursor-ring';
  document.body.append(cursorDot, cursorRing);

  const placeCursor = (el, x, y) => {
    el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
  };
  document.addEventListener('mousemove', ev => {
    placeCursor(cursorDot, ev.clientX, ev.clientY);
    placeCursor(cursorRing, ev.clientX, ev.clientY);
    cursorDot.classList.add('is-visible');
    cursorRing.classList.add('is-visible');
  });
  document.addEventListener('mouseleave', () => {
    cursorDot.classList.remove('is-visible');
    cursorRing.classList.remove('is-visible');
  });
  document.addEventListener('mousedown', () => cursorRing.classList.add('is-down'));
  document.addEventListener('mouseup', () => cursorRing.classList.remove('is-down'));

  const CURSOR_HOVER_SELECTOR = 'button, select, input, label, a';
  document.addEventListener('mouseover', ev => {
    if (ev.target.closest(CURSOR_HOVER_SELECTOR)) {
      cursorRing.classList.add('is-hover');
      cursorDot.classList.add('is-hover');
    }
  });
  document.addEventListener('mouseout', ev => {
    const stillInside = ev.relatedTarget && ev.relatedTarget.closest && ev.relatedTarget.closest(CURSOR_HOVER_SELECTOR);
    if (ev.target.closest(CURSOR_HOVER_SELECTOR) && !stillInside) {
      cursorRing.classList.remove('is-hover');
      cursorDot.classList.remove('is-hover');
    }
  });
}

/* ---- tabs ---- */
$$('.tabs button').forEach(b => b.addEventListener('click', () => {
  $$('.tabs button').forEach(x => x.setAttribute('aria-selected', String(x === b)));
  $$('.view').forEach(v => v.hidden = (v.id !== 'view-' + b.dataset.view));
}));

/* ---- sample chips ---- */
const LABELS = { chips:"Chips packet", oil:"Oil bottle", cream:"Imported cream", listing:"E-commerce listing" };
$('#samples').innerHTML = Object.keys(SAMPLES)
  .map(k => `<button class="chip" data-k="${k}" aria-pressed="false">${LABELS[k]}</button>`).join('');

$$('#samples .chip').forEach(c => c.addEventListener('click', () => loadSample(c.dataset.k)));

function loadSample(key) {
  $$('#samples .chip').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.k === key)));
  const s = SAMPLES[key];
  state.extraction = s;
  state.report = null;
  $('#stage').innerHTML = s.image + `<div class="hint">Simulated label · fields detected by the vision layer</div>`;
  applyParams(s.params);
  renderResults();
}

function applyParams(p) {
  $('#basis').value   = p.basis;
  $('#qty').value     = p.qty || "";
  $('#pdp').value     = p.pdpAreaCm2 || "";
  $('#surface').value = p.surface;
  $('#ecom').checked  = !!p.ecommerce;
  syncBasisLabel();
}
function readParams() {
  return {
    basis: $('#basis').value,
    qty: Number($('#qty').value) || 0,
    pdpAreaCm2: Number($('#pdp').value) || 0,
    surface: $('#surface').value,
    ecommerce: $('#ecom').checked,
    imported: state.extraction ? !!state.extraction.params.imported : false
  };
}
function syncBasisLabel() {
  $('#qtyLabel').textContent = $('#basis').value === 'weight'
    ? 'Net quantity (g / ml)' : 'Net quantity (count or length)';
}
$('#basis').addEventListener('change', syncBasisLabel);

/* ---- upload ---- */
const drop = $('#drop');
['dragenter','dragover'].forEach(e => drop.addEventListener(e, ev => {
  ev.preventDefault(); drop.classList.add('over');
}));
['dragleave','drop'].forEach(e => drop.addEventListener(e, ev => {
  ev.preventDefault(); drop.classList.remove('over');
}));
drop.addEventListener('drop', ev => { if (ev.dataTransfer.files.length) handleFiles(ev.dataTransfer.files); });
$('#file').addEventListener('change', ev => {
  if (ev.target.files.length) handleFiles(ev.target.files);
  ev.target.value = '';
});

/* ---- camera capture ---- */
const cameraModal = $('#cameraModal');
const cameraVideo = $('#cameraVideo');
const cameraCanvas = $('#cameraCanvas');
let cameraStream = null;
let cameraFacing = 'environment';
let capturedLabel = null;

async function startCamera() {
  if (location.protocol === 'file:' || location.protocol === 'content:') {
    $('#cameraMessage').textContent = 'Camera needs this page opened from a web address (http:// or https://), not a local file. Host it (e.g. on your own domain, Netlify or GitHub Pages) and open that link instead.';
    $('#capturePhoto').disabled = true;
    return;
  }
  if (!window.isSecureContext) {
    $('#cameraMessage').textContent = 'Camera requires a secure connection. Open this page over https:// and try again.';
    $('#capturePhoto').disabled = true;
    return;
  }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    $('#cameraMessage').textContent = 'Camera access is not supported in this browser. Please choose a photo instead.';
    $('#capturePhoto').disabled = true;
    return;
  }
  $('#cameraMessage').textContent = 'Opening camera…';
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: cameraFacing }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false
    });
    cameraVideo.srcObject = cameraStream;
    cameraVideo.style.display = '';
    cameraCanvas.hidden = true;
    $('#capturePhoto').disabled = false;
    $('#usePhoto').disabled = true;
    $('#cameraMessage').textContent = 'Align the product label inside the guide.';
  } catch (err) {
    const detail = err.name === 'NotAllowedError'
      ? 'Camera permission was denied. Allow access in your browser settings and try again.'
      : 'Could not open a camera. You can still upload a label photo.';
    $('#cameraMessage').textContent = detail;
    $('#capturePhoto').disabled = true;
  }
}
function stopCamera() {
  if (cameraStream) cameraStream.getTracks().forEach(track => track.stop());
  cameraStream = null;
  cameraVideo.srcObject = null;
}
function closeCamera() {
  stopCamera();
  cameraModal.hidden = true;
  capturedLabel = null;
}
$('#openCamera').addEventListener('click', async () => {
  cameraModal.hidden = false;
  capturedLabel = null;
  await startCamera();
});
$('#closeCamera').addEventListener('click', closeCamera);
cameraModal.addEventListener('click', ev => { if (ev.target === cameraModal) closeCamera(); });
document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape' && !cameraModal.hidden) closeCamera();
});
$('#flipCamera').addEventListener('click', async () => {
  cameraFacing = cameraFacing === 'environment' ? 'user' : 'environment';
  stopCamera();
  await startCamera();
});
$('#capturePhoto').addEventListener('click', () => {
  if (!cameraStream || !cameraVideo.videoWidth) return;
  cameraCanvas.width = cameraVideo.videoWidth;
  cameraCanvas.height = cameraVideo.videoHeight;
  cameraCanvas.getContext('2d').drawImage(cameraVideo, 0, 0, cameraCanvas.width, cameraCanvas.height);
  cameraCanvas.hidden = false;
  cameraVideo.style.display = 'none';
  cameraCanvas.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block';
  capturedLabel = true;
  $('#usePhoto').disabled = false;
  $('#cameraMessage').textContent = 'Photo captured. Use it for the compliance scan.';
  stopCamera();
});
$('#usePhoto').addEventListener('click', () => {
  if (!capturedLabel) return;
  cameraCanvas.toBlob(blob => {
    if (!blob) return;
    closeCamera();
    handleFiles([new File([blob], `labellens-camera-${Date.now()}.jpg`, { type: 'image/jpeg' })]);
  }, 'image/jpeg', .92);
});

function renderBatchStage(items, message = '') {
  $('#stage').innerHTML = `<div class="batch-preview">${items.map((item, index) =>
    `<figure><img src="${item.url}" alt="Label photo ${index + 1}"><figcaption>Panel ${index + 1}</figcaption></figure>`).join('')}</div>
    <div class="batch-progress">${message}</div>`;
}
function combineExtractions(extractions, files) {
  const fields = {};
  DECLARATIONS.forEach(d => {
    fields[d.key] = extractions.map(ex => ex.fields?.[d.key]).find(f => f?.value) || { value:'' };
  });
  const ocrResults = extractions.map(ex => ex.ocr).filter(Boolean);
  return {
    product: files.length === 1 ? extractions[0].product : `${files.length}-panel package scan`,
    fields,
    params: extractions[0].params || { basis:'weight', qty:0, pdpAreaCm2:0, surface:'printed', ecommerce:false, imported:false },
    image: null,
    ocr: ocrResults.length ? {
      confidence: Math.round(ocrResults.reduce((total, item) => total + item.confidence, 0) / ocrResults.length),
      text: ocrResults.map(item => item.text).join('\n')
    } : null
  };
}
async function handleFiles(fileList) {
  const files = Array.from(fileList).filter(file => file.type.startsWith('image/'));
  if (!files.length) return;
  $$('#samples .chip').forEach(c => c.setAttribute('aria-pressed', 'false'));
  const items = files.map(file => ({ file, url:URL.createObjectURL(file) }));
  renderBatchStage(items, files.length === 1 ? 'Reading label…' : `Preparing ${files.length} label panels for OCR…`);
  $('#run').disabled = true;
  try {
    const extractions = await extractFromImages(files, message => renderBatchStage(items, message));
    const ex = combineExtractions(extractions, files);
    state.extraction = ex;
    state.report = null;
    renderBatchStage(items, `${ex.ocr ? `OCR complete · ${ex.ocr.confidence}% confidence · ` : ''}${Object.values(ex.fields).filter(f => f.value).length} declarations found across ${files.length} panel${files.length === 1 ? '' : 's'}`);
    applyParams(ex.params);
    renderResults();
  } catch (err) {
    renderBatchStage(items, `Could not read the panels: ${escapeHtml(err.message)}. Try sharper photos of the display panel.`);
  } finally {
    $('#run').disabled = false;
  }
}

function handleFile(file) { handleFiles([file]); }

/* ---- run ---- */
$('#run').addEventListener('click', () => {
  if (!state.extraction) {
    $('#stage').innerHTML = `<div class="empty">Pick a sample or upload a photo first.</div>`;
    return;
  }
  const report = checkCompliance(state.extraction, readParams());
  report.checkedBy = $('#role').value;
  report.id = 'LL-' + String(state.repo.length + 1).padStart(4, '0');
  state.report = report;
  state.repo.unshift(report);
  renderResults();
  renderRepo();
  paintOverlay();
});

