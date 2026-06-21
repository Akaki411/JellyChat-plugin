import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import cssInjectedByJs from 'vite-plugin-css-injected-by-js';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    plugins: [react(), cssInjectedByJs()],
    define: {
        'process.env.NODE_ENV': JSON.stringify('production')
    },
    build: {
        outDir: resolve(here, '../Jellyfin.Plugin.JellyChat/web'),
        emptyOutDir: false,
        target: 'es2018',
        minify: 'esbuild',
        cssCodeSplit: false,
        lib: {
            entry: resolve(here, 'src/main.jsx'),
            name: 'JellyChat',
            formats: ['iife'],
            fileName: () => 'interface.js'
        },
        rollupOptions: {
            output: {
                inlineDynamicImports: true
            }
        }
    }
});
