import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Plain JS + React. No TypeScript, no Tailwind, no router (per project constraints).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
