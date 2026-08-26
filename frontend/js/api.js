"use strict";

/* ============================================================================
   PART 2 — THE VISION LAYER
   Demo mode returns a fixture. Point BACKEND at your own endpoint to go live.
   Keep the API key on the server; never ship one in this file.
   ============================================================================ */
const BACKEND = "";   // e.g. "https://labellens-api.onrender.com/extract"

function lineMatching(lines, pattern) {
  return lines.find(line => pattern.test(line)) || "";
}
function buildExtractionFromOcr(text, confidence) {
  const lines = text.split(/\r?\n/).map(line => line.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const find = pattern => lineMatching(lines, pattern);
  const emailOrPhone = find(/(?:[\w.+-]+@[\w.-]+\.[a-z]{2,}|\+?\d[\d\s().-]{7,})/i);
  const fields = {
    manufacturer: { value: find(/(?:manufactured|packed|marketed|imported|mfd\.?\s*by|plot|address|\b\d{6}\b)/i) },
    commonName: { value: find(/(?:chips|oil|cream|soap|biscuit|shampoo|powder|rice|tea|coffee|product|net\s*(?:wt|qty|volume))/i).replace(/net\s*(?:wt|qty|volume).*$/i, '').trim() },
    netQuantity: { value: find(/(?:net\s*(?:wt|weight|qty|quantity|volume)?\s*[:.-]?\s*\d+\s*(?:g|kg|ml|l|litre|m|cm|mm|pcs|pieces|nos?)\b|\b\d+\s*(?:g|kg|ml|l|litre|pcs|pieces|nos?)\b)/i) },
    mfgDate: { value: find(/(?:mfg|mfd|manufactur|packed on|pack date|\b\d{2}[/-]\d{2,4}\b)/i) },
    mrp: { value: find(/(?:\bmrp\b|maximum retail price|₹|rs\.?\s*\d+)/i) },
    consumerCare: { value: emailOrPhone },
    countryOfOrigin: { value: find(/(?:country of origin|made in|origin\s*:)/i) },
    bestBefore: { value: find(/(?:best before|use by|expiry|exp\.?\s*:)/i) }
  };
  const usableTitle = lines.find(line => line.length > 3 && line.length < 80 && !/(?:mrp|net\s*(?:wt|qty|volume)|mfg|mfd|manufactured|packed|₹|rs\.?\s*\d+)/i.test(line));
  return {
    product: usableTitle || 'OCR label scan', fields,
    params: { basis:'weight', qty:0, pdpAreaCm2:0, surface:'printed', ecommerce:false, imported:/imported|country of origin|made in/i.test(text) },
    image: null, ocr: { confidence: Math.round(confidence || 0), text }
  };
}
async function extractFromImages(files, onProgress = () => {}) {
  if (BACKEND) {
    /* Send every panel in one request so the vision service can treat the
       front, back and side photos as a single product instead of separate
       scans. Backends should read the repeated `images` form field. */
    const body = new FormData();
    files.forEach(file => body.append("images", file, file.name));
    const res = await fetch(BACKEND, { method: "POST", body });
    if (!res.ok) throw new Error("Extraction failed with status " + res.status);

    const data = await res.json();
    // Accept a single combined extraction, or an array if an older endpoint
    // still returns one extraction per panel.
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.extractions)) return data.extractions;
    if (Array.isArray(data.images)) return data.images;
    return [data];
  }
  if (!window.Tesseract) throw new Error('OCR engine could not load. Check your internet connection and try again.');

  let activeIndex = 0;
  const worker = await Tesseract.createWorker('eng', 1, {
    logger: message => {
      const prefix = files.length > 1 ? `Panel ${activeIndex + 1}/${files.length} · ` : '';
      if (message.status === 'recognizing text') onProgress(`${prefix}Reading label… ${Math.round(message.progress * 100)}%`);
      else if (message.status) onProgress(`${prefix}Preparing OCR engine…`);
    }
  });
  try {
    const results = [];
    for (activeIndex = 0; activeIndex < files.length; activeIndex++) {
      onProgress(`${files.length > 1 ? `Panel ${activeIndex + 1}/${files.length} · ` : ''}Reading label…`);
      const { data } = await worker.recognize(files[activeIndex]);
      results.push(buildExtractionFromOcr(data.text, data.confidence));
    }
    return results;
  } finally {
    await worker.terminate();
  }
}

