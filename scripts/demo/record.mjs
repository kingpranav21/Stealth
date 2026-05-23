#!/usr/bin/env node
/**
 * Record docs/stealth-demo.webm + docs/stealth-demo.gif via Playwright.
 * Requires: npm install && npx playwright install chromium
 */
import { chromium } from "playwright";
import { createRequire } from "module";
import {
  mkdirSync,
  rmSync,
  existsSync,
  statSync,
  copyFileSync,
  readFileSync,
  writeFileSync,
} from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const DEMO_HTML = join(__dirname, "ui.html");
const OUT_DIR = join(ROOT, "docs");
const TMP_DIR = join(ROOT, ".demo-record");

const STEPS = [
  { name: "palette", wait: 2800 },
  { name: "openRepo", wait: 2200 },
  { name: "expandTree", wait: 1800 },
  { name: "openFile", wait: 2800 },
  { name: "edit", wait: 2200 },
  { name: "save", wait: 2800 },
  { name: "statusBar", wait: 2000 },
  { name: "dashboard", wait: 4200 },
  { name: "end", wait: 2500 },
];

const FRAME_MS = 250;

async function captureFrames(page, framesDir) {
  mkdirSync(framesDir, { recursive: true });
  let index = 0;

  const snap = async () => {
    const file = join(framesDir, `frame${String(index++).padStart(4, "0")}.png`);
    await page.screenshot({ path: file, type: "png" });
  };

  await snap();
  for (const step of STEPS) {
    await page.evaluate(async (n) => {
      await window.demo.play(n);
    }, step.name);
    const ticks = Math.ceil(step.wait / FRAME_MS);
    for (let t = 0; t < ticks; t++) {
      await page.waitForTimeout(FRAME_MS);
      await snap();
    }
  }
  return index;
}

const require = createRequire(import.meta.url);
const { GIFEncoder, quantize, applyPalette } = require("gifenc");

async function pngsToGif(framesDir, gifOut, frameCount) {
  const { PNG } = await import("pngjs");
  const gif = GIFEncoder();
  const delay = Math.round(FRAME_MS / 10); // centiseconds for gifenc

  for (let i = 0; i < frameCount; i++) {
    const file = join(framesDir, `frame${String(i).padStart(4, "0")}.png`);
    const png = PNG.sync.read(readFileSync(file));
    const { width, height, data } = png;
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    gif.writeFrame(index, width, height, { palette, delay });
  }
  gif.finish();
  writeFileSync(gifOut, Buffer.from(gif.bytes()));
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  if (existsSync(TMP_DIR)) {
    rmSync(TMP_DIR, { recursive: true, force: true });
  }
  mkdirSync(TMP_DIR, { recursive: true });
  const framesDir = join(TMP_DIR, "frames");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: TMP_DIR, size: { width: 1280, height: 720 } },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.goto(`file://${DEMO_HTML}`);
  await page.waitForTimeout(400);

  const frameCount = await captureFrames(page, framesDir);

  const video = page.video();
  await context.close();

  const webmOut = join(OUT_DIR, "stealth-demo.webm");
  try {
    await video.saveAs(webmOut);
  } catch {
    copyFileSync(await video.path(), webmOut);
  }
  await browser.close();
  console.log(`Wrote ${webmOut} (${statSync(webmOut).size} bytes)`);

  const gifOut = join(OUT_DIR, "stealth-demo.gif");
  await pngsToGif(framesDir, gifOut, frameCount);
  console.log(`Wrote ${gifOut} (${statSync(gifOut).size} bytes, ${frameCount} frames)`);

  rmSync(TMP_DIR, { recursive: true, force: true });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
