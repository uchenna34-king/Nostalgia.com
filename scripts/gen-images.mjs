// One-time generator for editorial SVG placeholder product imagery.
// Produces two tonal variants per product in public/products/.
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "public", "products");
mkdirSync(outDir, { recursive: true });

// [slug, label, baseColor, accentColor]
const items = [
  ["sepia-wool-overcoat", "OVERCOAT", "#8A6A4F", "#F4EEE4"],
  ["archive-bomber-jacket", "BOMBER", "#3A4A44", "#E8DFCF"],
  ["heritage-cable-knit", "CABLE KNIT", "#B08A5E", "#221E1A"],
  ["faded-mohair-cardigan", "MOHAIR", "#9E7B84", "#F4EEE4"],
  ["vintage-box-tee", "BOX TEE", "#C9B79C", "#221E1A"],
  ["grain-logo-tee", "LOGO TEE", "#1A1A1A", "#F4EEE4"],
  ["nostalgia-hoodie", "HOODIE", "#5A4632", "#F4EEE4"],
  ["pleated-trouser", "TROUSER", "#4C4A42", "#E8DFCF"],
  ["corduroy-cap", "CAP", "#A6552F", "#F4EEE4"],
  ["leather-tote", "TOTE", "#6E4A2E", "#F4EEE4"],
  ["tempo-road-runner", "RUNNER", "#2F3B45", "#E8DFCF"],
  ["stride-mesh-trainer", "TRAINER", "#B9B2A6", "#221E1A"],
  ["archive-oxford", "OXFORD", "#3B2A1E", "#F4EEE4"],
  ["city-penny-loafer", "LOAFER", "#6B4226", "#F4EEE4"],
  ["washed-canvas-low", "CANVAS", "#CFC6B4", "#221E1A"],
  ["loopback-crewneck", "CREWNECK", "#8C8C84", "#F4EEE4"],
  ["brushed-fleece-hoodie", "HOODIE", "#B7A99A", "#221E1A"],
  ["varsity-graphic-crew", "VARSITY", "#1F3A2E", "#E8DFCF"],
  ["selvedge-straight-jean", "SELVEDGE", "#1E2A44", "#E8DFCF"],
  ["high-rise-wide-jean", "WIDE LEG", "#4A6283", "#F4EEE4"],
  ["cord-five-pocket", "CORD", "#7A5230", "#F4EEE4"],
  ["twill-carpenter-jean", "CARPENTER", "#D9CFBC", "#221E1A"],
  ["oxford-button-down", "OXFORD CLOTH", "#9FB3C8", "#221E1A"],
  ["poplin-tunic-shirt", "POPLIN", "#EDE7DC", "#221E1A"],
  ["atelier-crest-tee", "CREST TEE", "#2A2A2A", "#E8DFCF"],
  ["monogram-jersey-tee", "MONOGRAM", "#5C4B3B", "#F4EEE4"],
];

function svg(label, base, accent, variant) {
  const angle = variant === 1 ? 25 : 145;
  const shade = variant === 1 ? base : shadeColor(base, -18);
  // The XML prolog is load-bearing: next/image's optimizer sniffs for it and
  // rejects an SVG without one as "not a valid image" (400).
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1" gradientTransform="rotate(${angle} .5 .5)">
      <stop offset="0" stop-color="${shade}"/>
      <stop offset="1" stop-color="${shadeColor(shade, -22)}"/>
    </linearGradient>
    <filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.06"/></feComponentTransfer>
      <feComposite operator="over" in2="SourceGraphic"/></filter>
  </defs>
  <rect width="900" height="1200" fill="url(#g)"/>
  <rect width="900" height="1200" filter="url(#n)" opacity="0.5"/>
  <circle cx="450" cy="470" r="215" fill="none" stroke="${accent}" stroke-width="1.5" opacity="0.5"/>
  <text x="450" y="1080" font-family="Georgia, serif" font-size="64" font-weight="700"
    fill="${accent}" text-anchor="middle" letter-spacing="4">${label}</text>
  <text x="450" y="1130" font-family="Helvetica, Arial, sans-serif" font-size="20"
    fill="${accent}" text-anchor="middle" letter-spacing="8" opacity="0.7">NOSTALGIA</text>
</svg>`;
}

function shadeColor(hex, percent) {
  const num = parseInt(hex.slice(1), 16);
  let r = (num >> 16) + Math.round(2.55 * percent);
  let g = ((num >> 8) & 0xff) + Math.round(2.55 * percent);
  let b = (num & 0xff) + Math.round(2.55 * percent);
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

for (const [slug, label, base, accent] of items) {
  writeFileSync(join(outDir, `${slug}-1.svg`), svg(label, base, accent, 1));
  writeFileSync(join(outDir, `${slug}-2.svg`), svg(label, base, accent, 2));
}
console.log(`Generated ${items.length * 2} product images in public/products/`);
