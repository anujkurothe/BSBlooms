import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import {defineConfig} from 'vite';

const rootDir = import.meta.dirname;

function cleanHostingerDist() {
  return {
    name: 'clean-hostinger-dist',
    closeBundle() {
      const distAistudio = path.resolve(rootDir, 'dist', 'assets', 'aistudio');
      if (fs.existsSync(distAistudio)) {
        fs.rmSync(distAistudio, {recursive: true, force: true});
      }
      const unusedHeroShowcase = path.resolve(
        rootDir,
        'dist',
        'assets',
        'showcase',
        'hero-showcase.jpg',
      );
      if (fs.existsSync(unusedHeroShowcase)) {
        fs.rmSync(unusedHeroShowcase, {force: true});
      }
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), cleanHostingerDist()],
    resolve: {
      alias: {
        '@': path.resolve(rootDir, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
