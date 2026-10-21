import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'deployment-metadata',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'deployment.json',
          source: JSON.stringify({
            sha: process.env.GITHUB_SHA ?? 'local',
            mocksEnabled: process.env.VITE_ENABLE_MOCKS !== 'false',
          }),
        })
      },
    },
  ],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: { target: 'es2022' },
})
