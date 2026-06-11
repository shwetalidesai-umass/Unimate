import esbuild from 'esbuild';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, 'dist');
const indexPath = path.join(__dirname, 'index.html');
const outFile = path.join(distDir, 'bundle.js');

await fs.mkdir(distDir, { recursive: true });
await fs.copyFile(indexPath, path.join(distDir, 'index.html'));

const ctx = await esbuild.context({
  entryPoints: ['src/main.jsx'],
  bundle: true,
  outfile: outFile,
  sourcemap: true,
  jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"development"' },
  loader: {
    '.js': 'jsx',
    '.jsx': 'jsx'
  }
});

await ctx.watch();
const port = Number(process.env.PORT) || 3000;
const server = await ctx.serve({ servedir: distDir, port });
console.log(`Dev server running at http://localhost:${port}`);
