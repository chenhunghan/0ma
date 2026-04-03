import { GoogleGenAI } from "@google/genai";
import { execSync } from "child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import sharp from "sharp";
import { fileURLToPath } from "url";

const MODEL = "gemini-3-pro-image-preview";
const SCRIPTS_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPTS_DIR, "..");
const TMP_DIR = path.join(PROJECT_ROOT, "scripts", ".gen-tmp");

function parseArgs(argv: string[]): { prompt: string; model: string } {
  const args = argv.slice(2);
  let prompt = "";
  let model = MODEL;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "-p" && args[i + 1]) {
      prompt = args[++i];
    } else if (args[i] === "-m" && args[i + 1]) {
      model = args[++i];
    }
  }

  if (!prompt) {
    console.error("Usage: npx tsx scripts/generate.ts -p <prompt> [-m <model>]");
    console.error(`  -p  Prompt describing the logo (required)`);
    console.error(`  -m  Gemini model (default: ${MODEL})`);
    process.exit(1);
  }

  return { prompt, model };
}

const MAX_RETRIES = 3;

async function generateImage(
  ai: GoogleGenAI,
  model: string,
  prompt: string,
  outputPath: string,
): Promise<void> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const label = `Generating: ${path.basename(outputPath)}${attempt > 1 ? ` (attempt ${attempt}/${MAX_RETRIES})` : ""}`;
    const timer = setInterval(() => process.stdout.write("."), 2000);
    process.stdout.write(`${label}...`);
    const start = Date.now();
    let response;
    try {
      response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseModalities: ["IMAGE"],
        aspectRatio: "1:1",
        imageSize: "2K",
      },
    });
    } finally {
      clearInterval(timer);
      console.log(` ${((Date.now() - start) / 1000).toFixed(1)}s`);
    }

    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) throw new Error("No response parts returned from Gemini");

    for (const part of parts) {
      if (part.inlineData) {
        const rawBuffer = Buffer.from(part.inlineData.data!, "base64");
        const meta = await sharp(rawBuffer).metadata();

        if (meta.width !== meta.height) {
          console.log(`  Got ${meta.width}x${meta.height} (not square), retrying...`);
          break;
        }

        // Convert to PNG (Gemini may return JPEG/WebP)
        await sharp(rawBuffer).png().toFile(outputPath);
        console.log(`  Saved: ${outputPath} (${meta.width}x${meta.height}, from ${part.inlineData.mimeType})`);
        return;
      }
    }
  }

  throw new Error(`Failed to get a square image after ${MAX_RETRIES} attempts`);
}

async function applySquircleMask(inputPath: string, outputPath: string): Promise<void> {
  const canvasSize = 1024;
  const margin = Math.round(canvasSize * 0.04);
  const iconSize = canvasSize - margin * 2;

  // Trim outer background, then over-scale by 8% so any light border/glow
  // Gemini adds falls outside the squircle mask boundary
  const trimmed = await sharp(inputPath).trim({ threshold: 20 }).toBuffer();
  const overScale = Math.round(iconSize * 1.08);
  const cropOffset = Math.round((overScale - iconSize) / 2);
  const resized = await sharp(trimmed)
    .resize(overScale, overScale, { fit: "cover" })
    .extract({ left: cropOffset, top: cropOffset, width: iconSize, height: iconSize })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const canvas = Buffer.alloc(canvasSize * canvasSize * 4, 0);

  for (let y = 0; y < iconSize; y++) {
    for (let x = 0; x < iconSize; x++) {
      const srcOff = (y * iconSize + x) * 4;
      const dstOff = ((y + margin) * canvasSize + (x + margin)) * 4;
      canvas[dstOff] = resized.data[srcOff];
      canvas[dstOff + 1] = resized.data[srcOff + 1];
      canvas[dstOff + 2] = resized.data[srcOff + 2];
      canvas[dstOff + 3] = resized.data[srcOff + 3];
    }
  }

  const n = 5;
  const r = iconSize / 2;
  const cx = margin + r;
  const cy = margin + r;

  for (let y = 0; y < canvasSize; y++) {
    for (let x = 0; x < canvasSize; x++) {
      const nx = (x - cx + 0.5) / r;
      const ny = (y - cy + 0.5) / r;
      const dist = Math.pow(Math.abs(nx), n) + Math.pow(Math.abs(ny), n);
      if (dist > 1.0) {
        const offset = (y * canvasSize + x) * 4;
        canvas[offset + 3] = 0;
      }
    }
  }

  await sharp(canvas, { raw: { width: canvasSize, height: canvasSize, channels: 4 } })
    .png()
    .toFile(outputPath);
}

const ICONSET_SIZES = [
  { name: "icon_16x16.png", size: 16 },
  { name: "icon_16x16@2x.png", size: 32 },
  { name: "icon_32x32.png", size: 32 },
  { name: "icon_32x32@2x.png", size: 64 },
  { name: "icon_128x128.png", size: 128 },
  { name: "icon_128x128@2x.png", size: 256 },
  { name: "icon_256x256.png", size: 256 },
  { name: "icon_256x256@2x.png", size: 512 },
  { name: "icon_512x512.png", size: 512 },
  { name: "icon_512x512@2x.png", size: 1024 },
];

const TAURI_PNGS = [
  { name: "32x32.png", size: 32 },
  { name: "128x128.png", size: 128 },
  { name: "128x128@2x.png", size: 256 },
  { name: "icon.png", size: 512 },
];

async function generateMacIcons(squirclePng: string): Promise<void> {
  const iconsDir = path.join(PROJECT_ROOT, "src-tauri", "icons");

  // Generate .icns via iconutil (preserves transparency)
  const iconsetDir = path.join(TMP_DIR, "icon.iconset");
  fs.mkdirSync(iconsetDir, { recursive: true });

  for (const { name, size } of ICONSET_SIZES) {
    await sharp(squirclePng).resize(size, size).png().toFile(path.join(iconsetDir, name));
  }

  const icnsPath = path.join(iconsDir, "icon.icns");
  execSync(`iconutil -c icns "${iconsetDir}" -o "${icnsPath}"`, { stdio: "inherit" });
  console.log(`  Saved: ${icnsPath}`);

  // Generate Tauri PNGs (with squircle, matching the .icns)
  for (const { name, size } of TAURI_PNGS) {
    const outPath = path.join(iconsDir, name);
    await sharp(squirclePng).resize(size, size).png().toFile(outPath);
    console.log(`  Saved: ${outPath}`);
  }
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Error: GEMINI_API_KEY environment variable is not set.");
    console.error("  export GEMINI_API_KEY=<your-key>");
    process.exit(1);
  }

  const { prompt, model } = parseArgs(process.argv);
  const ai = new GoogleGenAI({ apiKey });

  fs.mkdirSync(TMP_DIR, { recursive: true });

  const rawPath = path.join(TMP_DIR, "app_raw.png");
  const iconPath = path.join(TMP_DIR, "app_icon.png");

  // Generate with user's prompt (no overrides)
  await generateImage(
    ai,
    model,
    `${prompt}. IMPORTANT: The design must fill the entire square image edge to edge. Do not draw a rounded rectangle or icon frame on a background. The entire square IS the icon surface. No outer background, no borders, no margins.`,
    rawPath,
  );

  // Apply macOS squircle mask
  console.log("Applying squircle mask...");
  await applySquircleMask(rawPath, iconPath);

  // Generate all macOS icons (.icns + PNGs) from squircle-masked source
  console.log("Generating macOS icons...");
  await generateMacIcons(iconPath);

  // Cleanup
  fs.rmSync(TMP_DIR, { recursive: true, force: true });

  console.log("\nDone! App icons updated in src-tauri/icons/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
