import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["src/cli.ts"],
  bundle: true,
  outfile: "dist/cli.js",
  platform: "node",
  target: "node18",
  format: "cjs",
  banner: { js: "#!/usr/bin/env node" },
  sourcemap: true,
});

console.log("built packages/cli/dist/cli.js");
