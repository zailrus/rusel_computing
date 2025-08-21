import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Репозиторий: zailrus/rusel_computing → base должен быть таким:
export default defineConfig({
  plugins: [react()],
  base: '/rusel_computing/',
})
