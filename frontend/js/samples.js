"use strict";

/* ============================================================================
   PART 3 — SAMPLE LABELS
   Each sample carries its own drawing, so the demo works with no network and
   the overlay boxes line up exactly. Boxes use the 400 × 250 viewBox.
   ============================================================================ */
function panel(bg, ink, rows) {
  return `<svg viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg" id="labelSvg">
    <rect width="400" height="250" fill="${bg}"/>
    <rect x="6" y="6" width="388" height="238" fill="none" stroke="${ink}" stroke-opacity=".25"/>
    ${rows}
    <g id="overlay"></g>
  </svg>`;
}
const T = (x, y, s, txt, ink, w) =>
  `<text x="${x}" y="${y}" font-family="Roboto, Arial, sans-serif" font-size="${s}" font-weight="${w||400}" fill="${ink}">${txt}</text>`;

const SAMPLES = {

  chips: {
    product: "Nutri Crunch Masala Chips 90 g",
    params: { basis:"weight", qty:90, pdpAreaCm2:210, surface:"printed", ecommerce:false, imported:false },
    image: panel("#F7E9C9", "#3B2B12",
      T(24,46,22,"NUTRI CRUNCH","#B3341F",800) +
      T(24,68,13,"Masala Potato Chips","#3B2B12",600) +
      T(24,120,11,"Mfd by Nutri Foods Pvt Ltd, Plot 14,","#3B2B12") +
      T(24,136,11,"MIDC Ambad, Nashik 422010","#3B2B12") +
      T(24,178,9,"Net Qty. 90 g","#3B2B12",600) +
      T(24,206,12,"MRP ₹ 20.00","#3B2B12",700) +
      T(240,206,11,"Mfd: 03/2026","#3B2B12") +
      T(240,178,10,"Best before 6 months","#3B2B12")
    ),
    fields: {
      manufacturer: { value:"Nutri Foods Pvt Ltd, Plot 14, MIDC Ambad, Nashik 422010", heightMm:1.6, widthMm:0.8, box:[20,108,230,34] },
      commonName:   { value:"Masala Potato Chips", heightMm:2.0, widthMm:1.0, box:[20,54,190,20] },
      netQuantity:  { value:"Net Qty. 90 g", heightMm:0.8, widthMm:0.4, box:[20,168,110,14] },
      mfgDate:      { value:"03/2026", heightMm:1.5, widthMm:0.7, box:[236,194,110,16] },
      mrp:          { value:"MRP ₹ 20.00", heightMm:1.9, widthMm:0.9, box:[20,192,120,20] },
      consumerCare: { value:"", box:null },
      bestBefore:   { value:"Best before 6 months", heightMm:1.4, widthMm:0.7, box:[236,166,140,16] }
    }
  },

  oil: {
    product: "Sunrich Refined Sunflower Oil 1 L",
    params: { basis:"weight", qty:1000, pdpAreaCm2:640, surface:"printed", ecommerce:false, imported:false },
    image: panel("#FCF7E4", "#1B3A24",
      T(24,48,24,"SUNRICH","#C8901B",800) +
      T(24,72,13,"Refined Sunflower Oil","#1B3A24",600) +
      T(24,118,10,"Packed by Sunrich Agro Ltd, Survey 88,","#1B3A24") +
      T(24,132,10,"Chittoor 517001, Andhra Pradesh","#1B3A24") +
      T(24,164,10,"Consumer care: care@sunrich.in","#1B3A24") +
      T(24,196,13,"Net Volume 1 L","#1B3A24",600) +
      T(24,222,14,"MRP ₹ 175 (incl. of all taxes)","#1B3A24",700) +
      T(250,196,10,"Mfd: 01/2026","#1B3A24")
    ),
    fields: {
      manufacturer: { value:"Sunrich Agro Ltd, Survey 88, Chittoor 517001, Andhra Pradesh", heightMm:1.5, widthMm:0.7, box:[20,106,250,32] },
      commonName:   { value:"Refined Sunflower Oil", heightMm:2.1, widthMm:1.0, box:[20,58,180,20] },
      netQuantity:  { value:"Net Volume 1 L", heightMm:2.6, widthMm:1.2, box:[20,182,130,20] },
      mfgDate:      { value:"01/2026", heightMm:1.5, widthMm:0.7, box:[246,182,110,18] },
      mrp:          { value:"MRP ₹ 175 (incl. of all taxes)", heightMm:2.4, widthMm:1.1, box:[20,206,250,22] },
      consumerCare: { value:"Consumer care: care@sunrich.in", heightMm:1.5, widthMm:0.7, box:[20,152,230,18] }
    }
  },

  cream: {
    product: "GlowVeda Vitamin C Face Cream 50 g (imported)",
    params: { basis:"weight", qty:50, pdpAreaCm2:96, surface:"printed", ecommerce:false, imported:true },
    image: panel("#EFEAF6", "#2A2340",
      T(24,46,21,"GLOWVEDA","#5B3E9B",800) +
      T(24,90,10,"Imported and marketed by Veda Beauty LLP,","#2A2340") +
      T(24,104,10,"22 Link Road, Mumbai 400053","#2A2340") +
      T(24,140,10,"Care: 1800-266-4455, help@glowveda.in","#2A2340") +
      T(24,178,12,"Net Wt. 50 g","#2A2340",600) +
      T(24,206,13,"MRP ₹ 449 incl. all taxes","#2A2340",700) +
      T(250,178,10,"Mfd: 11/2025","#2A2340")
    ),
    fields: {
      manufacturer: { value:"Veda Beauty LLP, 22 Link Road, Mumbai 400053", heightMm:1.4, widthMm:0.7, box:[20,78,270,32] },
      commonName:   { value:"", box:null },
      netQuantity:  { value:"Net Wt. 50 g", heightMm:1.8, widthMm:0.9, box:[20,166,110,18] },
      mfgDate:      { value:"11/2025", heightMm:1.4, widthMm:0.7, box:[246,166,110,16] },
      mrp:          { value:"MRP ₹ 449 incl. all taxes", heightMm:2.0, widthMm:1.0, box:[20,192,220,20] },
      consumerCare: { value:"Care: 1800-266-4455, help@glowveda.in", heightMm:1.4, widthMm:0.7, box:[20,128,270,18] },
      countryOfOrigin: { value:"", box:null }
    }
  },

  listing: {
    product: "Sunrich Oil — marketplace listing",
    params: { basis:"weight", qty:1000, pdpAreaCm2:0, surface:"printed", ecommerce:true, imported:false },
    image: panel("#FFFFFF", "#1D2430",
      `<rect x="6" y="6" width="388" height="30" fill="#1D2430"/>` +
      T(16,26,12,"marketplace.example.in","#FFFFFF",600) +
      `<rect x="20" y="52" width="90" height="90" fill="#FCF7E4" stroke="#D9DCE2"/>` +
      T(34,102,11,"SUNRICH","#C8901B",800) +
      T(126,68,14,"Sunrich Refined Sunflower Oil","#1D2430",700) +
      T(126,88,11,"Sold by Agro Retail India","#5A6472") +
      T(126,116,15,"₹175","#B3341F",800) +
      T(126,136,10,"inclusive of all taxes","#5A6472") +
      T(20,176,11,"Manufacturer: Sunrich Agro Ltd, Chittoor 517001","#1D2430") +
      T(20,196,11,"Customer care: care@sunrich.in","#1D2430") +
      T(20,216,11,"Generic name: Refined Sunflower Oil","#1D2430")
    ),
    fields: {
      manufacturer: { value:"Sunrich Agro Ltd, Chittoor 517001", box:[16,164,320,18] },
      commonName:   { value:"Refined Sunflower Oil", box:[16,204,320,18] },
      netQuantity:  { value:"", box:null },
      mfgDate:      { value:"", box:null },
      mrp:          { value:"₹175 inclusive of all taxes", box:[122,104,120,38] },
      consumerCare: { value:"care@sunrich.in", box:[16,184,320,18] },
      countryOfOrigin: { value:"", box:null }
    }
  }
};

