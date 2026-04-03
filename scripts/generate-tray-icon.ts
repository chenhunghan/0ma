/**
 * Generate macOS tray icon with "0m" text on transparent background.
 *
 * Renders SVG at high resolution (512px) for crisp glyph outlines, then
 * downsamples to target sizes. This avoids aliasing artifacts that appear
 * when rendering small SVG text directly at 44/88px.
 *
 * The generated icon is a "template image" — black on transparent — so
 * macOS automatically handles light/dark menu bar adaptation.
 *
 * Usage:
 *   npx tsx scripts/generate-tray-icon.ts
 *   npx tsx scripts/generate-tray-icon.ts --text "0"
 *   npx tsx scripts/generate-tray-icon.ts --size 44
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const SCRIPTS_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPTS_DIR, "..");
const ICONS_DIR = path.join(PROJECT_ROOT, "src-tauri", "icons");

// macOS menu bar icons are typically 22pt, rendered at @2x = 44px
const DEFAULT_SIZE = 44;
const DEFAULT_TEXT = "0m";

// Render SVG at this size for maximum glyph fidelity, then downsample
const RENDER_SIZE = 512;

function parseArgs(argv: string[]): { text: string; size: number } {
  const args = argv.slice(2);
  let text = DEFAULT_TEXT;
  let size = DEFAULT_SIZE;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--text" && args[i + 1]) {
      text = args[++i];
    } else if (args[i] === "--size" && args[i + 1]) {
      size = parseInt(args[++i], 10);
    }
  }

  return { text, size };
}

function createTrayIconSvg(text: string, size: number): string {
  // Apple HIG: menu bar icons are 22pt with ~18pt content area (~82%).
  // Use dominant-baseline to vertically center the text precisely.
  const fontStack = `"JetBrains Mono", "SF Mono", "Menlo", monospace`;
  const fontSize = Math.round(size * 0.78);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <text
    x="50%"
    y="50%"
    text-anchor="middle"
    dominant-baseline="central"
    font-family='${fontStack}'
    font-size="${fontSize}"
    font-weight="300"
    fill="#000000"
  >${text}</text>
</svg>`;
}

async function main() {
  const { text, size } = parseArgs(process.argv);

  // Render at high resolution for crisp text
  const svg = createTrayIconSvg(text, RENDER_SIZE);
  const hiResBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

  // Generate @1x and @2x by downsampling from the hi-res render
  const outputs = [
    { label: "@1x", px: size, filename: "tray-icon@1x.png" },
    { label: "@2x", px: size * 2, filename: "tray-icon.png" },
  ];

  for (const { label, px, filename } of outputs) {
    const pngBuffer = await sharp(hiResBuffer)
      .resize(px, px, { kernel: sharp.kernel.lanczos3 })
      .png()
      .toBuffer();

    const outPath = path.join(ICONS_DIR, filename);
    fs.writeFileSync(outPath, pngBuffer);
    console.log(`Saved ${label}: ${outPath} (${px}x${px})`);
  }

  console.log("\nDone! Tray icon updated.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
