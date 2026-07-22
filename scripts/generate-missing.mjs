import sharp from "sharp";
import { existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PUBLIC = join(ROOT, "public", "assets", "images");
const CONTEXT = join(ROOT, ".context", "landing", "assets", "images");

const OUTPUTS = [PUBLIC, CONTEXT];

function ensureDir(p) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

function brandGradient(width, height, top, bottom) {
  return sharp({
    create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      {
        input: Buffer.from(
          `<svg width="${width}" height="${height}">
             <defs>
               <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
                 <stop offset="0%" style="stop-color:${top};stop-opacity:1" />
                 <stop offset="100%" style="stop-color:${bottom};stop-opacity:1" />
               </linearGradient>
             </defs>
             <rect width="${width}" height="${height}" fill="url(#g)" />
           </svg>`
        ),
        top: 0,
        left: 0,
      },
    ])
    .avif({ quality: 70 });
}

async function makePlaceholder(name, width, height, topColor, bottomColor) {
  console.log(`  Generating: ${name} (${width}x${height})`);
  const buf = await brandGradient(width, height, topColor, bottomColor).toBuffer();
  for (const base of OUTPUTS) {
    ensureDir(dirname(join(base, name)));
    await sharp(buf).toFile(join(base, name));
  }
}

async function main() {
  console.log("CheckinBliss — Fill remaining image gaps\n");

  const placeholders = [
    { name: "works/step-3-arrive.avif", w: 800, h: 1000, top: "#2F3D2C", bottom: "#5C6B4F" },
    { name: "stays/jabi-lake-penthouse.avif", w: 800, h: 1000, top: "#5C6B4F", bottom: "#232E22" },
  ];

  for (const p of placeholders) {
    try {
      await makePlaceholder(p.name, p.w, p.h, p.top, p.bottom);
    } catch (e) {
      console.log(`  ✗ Failed: ${p.name} — ${e.message}`);
    }
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
