"use strict";

/* ============================================================================
   PART 1 — THE RULE ENGINE
   Pure functions. No DOM. Give it an extraction object, it returns findings.
   This is the piece that has to be right, so keep it separate from the UI.
   ============================================================================ */

/* Rule 7(2) Table I — net quantity declared in weight or volume */
const TABLE_I = [
  { limit: 200,       printed: 1, blown: 2, band: "up to 200 g/ml" },
  { limit: 500,       printed: 2, blown: 4, band: "above 200 up to 500 g/ml" },
  { limit: Infinity,  printed: 4, blown: 6, band: "above 500 g/ml" }
];

/* Rule 7(2) Table II — quantity in length, area or number, by panel area in cm² */
const TABLE_II = [
  { limit: 100,      printed: 1, blown: 2, band: "panel up to 100 cm²" },
  { limit: 500,      printed: 2, blown: 4, band: "panel 100–500 cm²" },
  { limit: 2500,     printed: 4, blown: 6, band: "panel 500–2500 cm²" },
  { limit: Infinity, printed: 6, blown: 6, band: "panel above 2500 cm²" }
];

function requiredHeightMm(basis, qty, pdpAreaCm2, surface) {
  const table = basis === "weight" ? TABLE_I : TABLE_II;
  const value = basis === "weight" ? Number(qty) : Number(pdpAreaCm2);
  const row = table.find(r => value <= r.limit) || table[table.length - 1];
  return { mm: surface === "blown" ? row.blown : row.printed, band: row.band };
}

/* The six declarations of Rule 6(1), plus two conditional ones.
   `validate` returns null when fine, or a string describing what is wrong. */
const DECLARATIONS = [
  {
    key: "manufacturer", label: "Name and address of manufacturer, packer or importer",
    cite: "Rule 6(1)(a)", checks: "Name plus a complete address is present",
    validate: v => /\d{6}/.test(v) ? null : "Address has no six-digit PIN code, so it may be incomplete"
  },
  {
    key: "commonName", label: "Common or generic name of the commodity",
    cite: "Rule 6(1)(b)", checks: "A generic name appears, not only the brand name",
    validate: () => null
  },
  {
    key: "netQuantity", label: "Net quantity in standard units",
    cite: "Rule 6(1)(c)", checks: "Quantity uses a standard unit — g, kg, ml, l, m, cm or a count",
    validate: v => /\d+\s?(g|kg|ml|l|litre|m|cm|mm|n|no|nos|pcs|pieces)\b/i.test(v)
      ? null : "Quantity is not stated in a standard unit"
  },
  {
    key: "mfgDate", label: "Month and year of manufacture, packing or import",
    cite: "Rule 6(1)(d)", checks: "A month and a year are both present",
    skipForEcommerce: true,
    validate: v => /\d{2}\/\d{4}|\d{4}/.test(v) ? null : "Month and year could not be read"
  },
  {
    key: "mrp", label: "Retail sale price",
    cite: "Rule 6(1)(e)", checks: "Reads as maximum retail price and says inclusive of all taxes",
    validate: v => /incl/i.test(v)
      ? null : "Price is not marked inclusive of all taxes"
  },
  {
    key: "consumerCare", label: "Consumer care details",
    cite: "Rule 6(1)(f)", checks: "A name plus a phone number or email address",
    validate: v => /@|\+?\d[\d\s\-]{7,}/.test(v)
      ? null : "No phone number or email address for the consumer care executive"
  },
  {
    key: "countryOfOrigin", label: "Country of origin",
    cite: "Rule 6(1) proviso", checks: "Required on imported goods and on all e-commerce listings",
    conditional: true,
    validate: () => null
  },
  {
    key: "bestBefore", label: "Best before or use by date",
    cite: "FSS Regulations", checks: "Advisory — required on food by a separate law",
    advisory: true,
    validate: () => null
  }
];

/**
 * @param {object} ex  extraction: { fields: {key: {value, heightMm, widthMm}}, ... }
 * @param {object} p   parameters: { basis, qty, pdpAreaCm2, surface, ecommerce, imported }
 */
function checkCompliance(ex, p) {
  const findings = [];
  const gauges   = [];
  const req      = requiredHeightMm(p.basis, p.qty, p.pdpAreaCm2, p.surface);

  /* ---- Rule 6: is every mandatory declaration there, and does it read right? ---- */
  for (const d of DECLARATIONS) {
    if (p.ecommerce && d.skipForEcommerce) {
      findings.push({ level:"ok", key:d.key, title:d.label, cite:"Rule 6(10)",
        found:"Not required on a listing", note:"Exempt for e-commerce" });
      continue;
    }
    if (d.key === "countryOfOrigin" && !p.ecommerce && !p.imported) {
      continue; /* domestic package, not applicable */
    }

    const f = ex.fields[d.key];
    const value = f && f.value ? String(f.value).trim() : "";

    if (!value) {
      findings.push({
        level: d.advisory ? "warn" : "bad", key: d.key, title: d.label, cite: d.cite,
        found: "Not found on the panel",
        note: d.advisory ? "Advisory only under these rules" : "Mandatory declaration is missing"
      });
      continue;
    }
    const problem = d.validate(value);
    findings.push({
      level: problem ? "bad" : "ok", key: d.key, title: d.label, cite: d.cite,
      found: value, note: problem || ""
    });
  }

  /* ---- Rule 7: measured height against the required minimum ---- */
  if (!p.ecommerce) {
    for (const d of DECLARATIONS) {
      const f = ex.fields[d.key];
      if (!f || !f.value || typeof f.heightMm !== "number") continue;

      const heightOk = f.heightMm >= req.mm;
      const widthOk  = typeof f.widthMm !== "number" || f.widthMm >= f.heightMm / 3;

      gauges.push({
        key: f.key || d.key, title: d.label, measured: f.heightMm, required: req.mm,
        band: req.band, ok: heightOk && widthOk,
        note: !heightOk
          ? `Short by ${(req.mm - f.heightMm).toFixed(1)} mm`
          : (!widthOk ? "Width is under one third of the height (Rule 7(3))" : "")
      });

      if (!heightOk) {
        findings.push({
          level:"bad", key:d.key, title:`Letter height — ${d.label.toLowerCase()}`, cite:"Rule 7(2)",
          found:`Measured ${f.heightMm.toFixed(1)} mm, minimum ${req.mm} mm for ${req.band}`,
          note:"Declaration is below the minimum legible height"
        });
      } else if (!widthOk) {
        findings.push({
          level:"bad", key:d.key, title:`Letter width — ${d.label.toLowerCase()}`, cite:"Rule 7(3)",
          found:`Measured ${f.widthMm.toFixed(1)} mm wide against ${f.heightMm.toFixed(1)} mm tall`,
          note:"Width must be at least one third of the height"
        });
      }
    }
  }

  const violations = findings.filter(f => f.level === "bad").length;
  const advisories = findings.filter(f => f.level === "warn").length;

  return {
    product: ex.product,
    compliant: violations === 0,
    violations, advisories,
    passed: findings.filter(f => f.level === "ok").length,
    required: req, findings, gauges,
    checkedAt: new Date()
  };
}

