import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
    plugins: [react(), tailwindcss()],
    root: path.resolve(__dirname, 'src/dashboard/frontend'),
    build: {
        outDir: path.resolve(__dirname, 'src/dashboard/public'),
        emptyOutDir: true,
    },
    server: {
        port: 5173,
        proxy: {
            '/api': 'http://localhost:6666',
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src/dashboard/frontend/src'),
        },
    },
});
