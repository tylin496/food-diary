import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const port = Number(process.env.PORT) || undefined

export default defineConfig({
  base: '/food-diary/',
  plugins: [react()],
  server: { port },
  preview: { port },
})
