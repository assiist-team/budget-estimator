#!/usr/bin/env node
/*
Simple image optimizer using sharp.

Usage:
  node scripts/optimize-tool-bgs.js --src "/path/to/source" --out "./client/src/assets/tool-bgs"

It will: strip metadata, create webp + jpg fallbacks, and produce two widths: 800 and 1600.
*/
const fs = require('fs');
const path = require('path');
let sharp;
try {
  sharp = require('sharp');
} catch (err) {
  try {
    // try to load sharp from the current working directory's node_modules (e.g. client/node_modules)
    sharp = require(path.join(process.cwd(), 'node_modules', 'sharp'));
  } catch (err2) {
    console.error('Cannot find sharp. Please install it in the client or project root: npm install sharp --save-dev');
    process.exit(1);
  }
}

function usage() {
  console.log('Usage: node scripts/optimize-tool-bgs.js --src " /path/to/source" --out "./client/src/assets/tool-bgs"');
}

const args = process.argv.slice(2);
const srcIndex = args.indexOf('--src');
const outIndex = args.indexOf('--out');

if (srcIndex === -1 || outIndex === -1) {
  usage();
  process.exit(1);
}

const srcDir = args[srcIndex + 1];
const outDir = args[outIndex + 1];

if (!fs.existsSync(srcDir)) {
  console.error('Source directory does not exist:', srcDir);
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

const sizes = [800, 1600];

async function processFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const base = path.basename(filePath, ext).replace(/\s+/g, '-').toLowerCase();
  const image = sharp(filePath).rotate();

  for (const width of sizes) {
    const outBasename = `${base}--w${width}`;

    // webp
    await image
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 75 })
      .toFile(path.join(outDir, `${outBasename}.webp`));

    // jpeg fallback
    await image
      .resize({ width, withoutEnlargement: true })
      .jpeg({ quality: 80, progressive: true })
      .toFile(path.join(outDir, `${outBasename}.jpg`));
  }
}

async function main() {
  const files = fs.readdirSync(srcDir).filter(f => /\.(jpe?g|png)$/i.test(f));
  for (const f of files) {
    const full = path.join(srcDir, f);
    try {
      process.stdout.write(`Optimizing ${f}... `);
      await processFile(full);
      console.log('done');
    } catch (err) {
      console.error('error', err);
    }
  }
}

main();


