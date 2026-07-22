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

async function downloadImage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download: ${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
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
               <linearGradient id="g" x1="0%" y1="0%" x2="0%" y2="100%">
                 <stop offset="0%" style="stop-color:${top};stop-opacity:1" />
                 <stop offset="100%" style="stop-color:${bottom};stop-opacity:1" />
               </linearGradient>
             </defs>
             <rect width="${width}" height="${height}" fill="url(#g)" />
             <rect width="${width}" height="${height}" fill="url(#noise)" opacity="0.15" />
           </svg>`
        ),
        top: 0,
        left: 0,
      },
    ])
    .avif({ quality: 70 });
}

async function saveImage(name, buffer) {
  for (const base of OUTPUTS) {
    ensureDir(dirname(join(base, name)));
    await sharp(buffer).avif({ quality: 70 }).toFile(join(base, name));
    console.log(`  ✓ ${join(base, name)}`);
  }
}

async function makePlaceholder(name, width, height, topColor, bottomColor) {
  console.log(`  Generating placeholder: ${name}`);
  const buf = await brandGradient(width, height, topColor, bottomColor).toBuffer();
  for (const base of OUTPUTS) {
    ensureDir(dirname(join(base, name)));
    await sharp(buf).toFile(join(base, name));
    console.log(`    ✓ ${join(base, name)}`);
  }
}

async function main() {
  console.log("CheckinBliss — Image Generator\n");

  // ── 1. Download Unsplash images used in production ──
  const downloads = [
    { url: "https://images.unsplash.com/photo-1522708323-2a93d582dbab?auto=format&fit=crop&w=1200&q=80", name: "works/step-3-arrive.avif" },
    { url: "https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?auto=format&fit=crop&w=800&q=80", name: "stays/abuja-hills-hush.avif" },
    { url: "https://images.unsplash.com/photo-1564078560-4ef4b9c5e5f0?auto=format&fit=crop&w=800&q=80", name: "stays/jabi-lake-penthouse.avif" },
    { url: "https://images.unsplash.com/photo-1564013799919-ab600027f3ae?auto=format&fit=crop&w=800&q=80", name: "stays/banana-island.avif" },
    { url: "https://images.unsplash.com/photo-1600585154526-990a2a80f3e7?auto=format&fit=crop&w=800&q=80", name: "stays/asokoro-calm.avif" },
  ];

  console.log("1. Downloading Unsplash images...");
  for (const d of downloads) {
    try {
      console.log(`  Downloading: ${d.name}`);
      const buf = await downloadImage(d.url);
      await saveImage(d.name, buf);
    } catch (e) {
      console.log(`  ✗ Failed: ${d.name} — ${e.message}`);
    }
  }

  // ── 2. Generate brand placeholder images for documented slots ──
  // CheckinBliss brand colors: lagoon (#5C6B4F), brass (#2F3D2C), bone (#E9ECE2), ink (#171915)

  const placeholders = [
    { name: "cats/pool.avif", w: 800, h: 1000, top: "#2F3D2C", bottom: "#171915" },
    { name: "cats/abuja-calm.avif", w: 800, h: 1000, top: "#5C6B4F", bottom: "#232E22" },
    { name: "stays/private-pools.avif", w: 800, h: 1000, top: "#5C6B4F", bottom: "#2F3D2C" },
    { name: "stays/banana-island.avif", w: 800, h: 1000, top: "#171915", bottom: "#2F3D2C" },
    { name: "stays/asokoro-calm.avif", w: 800, h: 1000, top: "#232E22", bottom: "#5C6B4F" },
    { name: "promise/inspected.avif", w: 800, h: 1000, top: "#2F3D2C", bottom: "#5C6B4F" },
    { name: "promise/mediated.avif", w: 800, h: 1000, top: "#5C6B4F", bottom: "#171915" },
    { name: "quotes/quote2-bg.avif", w: 2000, h: 800, top: "#171915", bottom: "#2F3D2C" },
  ];

  console.log("\n2. Generating brand placeholder images...");
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
