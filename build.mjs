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

await esbuild.build({
  entryPoints: ['src/main.jsx'],
  bundle: true,
  outfile: outFile,
  minify: true,
  sourcemap: false,
  jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
  loader: {
    '.js': 'jsx',
    '.jsx': 'jsx'
  }
});
console.log('Build complete.');
