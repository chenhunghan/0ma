import sharp from "sharp";
import { fileURLToPath } from "url";

export interface RGB {
  r: number;
  g: number;
  b: number;
}

const BG_DISTANCE = Math.sqrt(3 * 255 * 255);
const MIN_VISIBLE_ALPHA = 0.01;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function readPixel(data: Buffer, offset: number): RGB {
  return {
    r: data[offset],
    g: data[offset + 1],
    b: data[offset + 2],
  };
}

function computeAlpha(whitePixel: RGB, blackPixel: RGB): number {
  const pixelDist = Math.sqrt(
    Math.pow(whitePixel.r - blackPixel.r, 2) +
      Math.pow(whitePixel.g - blackPixel.g, 2) +
      Math.pow(whitePixel.b - blackPixel.b, 2),
  );
  return clamp(1 - pixelDist / BG_DISTANCE, 0, 1);
}

function recoverForegroundColor(alpha: number, blackPixel: RGB): RGB {
  if (alpha <= MIN_VISIBLE_ALPHA) {
    return { b: 0, g: 0, r: 0 };
  }

  return {
    r: blackPixel.r / alpha,
    g: blackPixel.g / alpha,
    b: blackPixel.b / alpha,
  };
}

function writeOutputPixel(outputBuffer: Buffer, offset: number, color: RGB, alpha: number): void {
  outputBuffer[offset] = Math.round(Math.min(255, color.r));
  outputBuffer[offset + 1] = Math.round(Math.min(255, color.g));
  outputBuffer[offset + 2] = Math.round(Math.min(255, color.b));
  outputBuffer[offset + 3] = Math.round(alpha * 255);
}

async function readRawImageWithMeta(path: string): Promise<{
  data: Buffer;
  info: sharp.OutputInfo;
}> {
  return sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

async function readRawImage(path: string): Promise<Buffer> {
  const { data } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return data;
}

export async function extractAlphaTwoPass(
  imgOnWhitePath: string,
  imgOnBlackPath: string,
  outputPath: string,
): Promise<void> {
  const { data: dataWhite, info: meta } = await readRawImageWithMeta(imgOnWhitePath);
  const dataBlack = await readRawImage(imgOnBlackPath);

  if (dataWhite.length !== dataBlack.length) {
    throw new Error("Dimension mismatch: Images must be identical size");
  }

  const outputBuffer = Buffer.alloc(dataWhite.length);

  for (let i = 0; i < meta.width * meta.height; i++) {
    const offset = i * 4;
    const whitePixel = readPixel(dataWhite, offset);
    const blackPixel = readPixel(dataBlack, offset);
    const alpha = computeAlpha(whitePixel, blackPixel);
    const foreground = recoverForegroundColor(alpha, blackPixel);
    writeOutputPixel(outputBuffer, offset, foreground, alpha);
  }

  await sharp(outputBuffer, {
    raw: { channels: 4, height: meta.height, width: meta.width },
  })
    .png()
    .toFile(outputPath);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error("Usage: node scripts/convert.ts <imgOnWhitePath> <imgOnBlackPath> [outputPath]");
    process.exit(1);
  }
  const outputPath = args[2] || "output.png";
  extractAlphaTwoPass(args[0], args[1], outputPath)
    .then(() => console.log(`Done! Saved to ${outputPath}`))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
