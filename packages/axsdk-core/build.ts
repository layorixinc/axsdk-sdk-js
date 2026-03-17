await Bun.build({
  entrypoints: ["./src/lib.ts"],
  outdir: "./dist",
  target: 'browser',
  format: "esm",
  naming: "[dir]/lib.js",
  sourcemap: "linked",
  minify: true,
  banner: '"use client";',
});

await Bun.build({
  entrypoints: ["./src/lib.ts"],
  outdir: "./dist",
  target: 'browser',
  format: "cjs",
  naming: "[dir]/lib.cjs",
  sourcemap: "linked",
  minify: true,
  banner: '"use client";',
});
