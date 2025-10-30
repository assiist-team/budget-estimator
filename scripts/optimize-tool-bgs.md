# Optimize Tool Backgrounds

Place your source images in a directory (for example `/Users/you/Downloads/Tool Kit Photos`).

Run from the `client` directory:

```bash
npm run optimize-tool-bgs
```

The script will output optimized images to `client/src/assets/tool-bgs` (creates it if missing). It produces `.webp` and `.jpg` at widths 800 and 1600.

If you want different sizes or quality, edit `scripts/optimize-tool-bgs.js`.


