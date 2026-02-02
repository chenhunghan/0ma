import sharp from "sharp";
import { fileURLToPath } from "url";

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export async function extractAlphaTwoPass(
  imgOnWhitePath: string,
  imgOnBlackPath: string,
  outputPath: string,
): Promise<void> {
  const img1 = sharp(imgOnWhitePath);
  const img2 = sharp(imgOnBlackPath);

  // Ensure we are working with raw pixel data
  const { data: dataWhite, info: meta } = await img1
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data: dataBlack } = await img2.ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  if (dataWhite.length !== dataBlack.length) {
    throw new Error("Dimension mismatch: Images must be identical size");
  }

  const outputBuffer = Buffer.alloc(dataWhite.length);

  // Distance between White (255,255,255) and Black (0,0,0)
  // Sqrt(255^2 + 255^2 + 255^2) ≈ 441.67
  const bgDist = Math.sqrt(3 * 255 * 255);

  for (let i = 0; i < meta.width * meta.height; i++) {
    const offset = i * 4;

    // Get RGB values for the same pixel in both images
    const rW = dataWhite[offset];
    const gW = dataWhite[offset + 1];
    const bW = dataWhite[offset + 2];

    const rB = dataBlack[offset];
    const gB = dataBlack[offset + 1];
    const bB = dataBlack[offset + 2];

    // Calculate the distance between the two observed pixels
    const pixelDist = Math.sqrt(Math.pow(rW - rB, 2) + Math.pow(gW - gB, 2) + Math.pow(bW - bB, 2));

    // THE FORMULA:
    // If the pixel is 100% opaque, it looks the same on Black and White (pixelDist = 0).
    // If the pixel is 100% transparent, it looks exactly like the backgrounds (pixelDist = bgDist).
    // Therefore:
    let alpha = 1 - pixelDist / bgDist;

    // Clamp results to 0-1 range
    alpha = Math.max(0, Math.min(1, alpha));

    // Color Recovery:
    // We use the image on black to recover the color, dividing by alpha
    // To un-premultiply it (brighten the semi-transparent pixels)
    let rOut = 0,
      gOut = 0,
      bOut = 0;

    if (alpha > 0.01) {
      // Recover foreground color from the version on black
      // (C - (1-alpha) * BG) / alpha
      // Since BG is black (0,0,0), this simplifies to C / alpha
      rOut = rB / alpha;
      gOut = gB / alpha;
      bOut = bB / alpha;
    }

    outputBuffer[offset] = Math.round(Math.min(255, rOut));
    outputBuffer[offset + 1] = Math.round(Math.min(255, gOut));
    outputBuffer[offset + 2] = Math.round(Math.min(255, bOut));
    outputBuffer[offset + 3] = Math.round(alpha * 255);
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
