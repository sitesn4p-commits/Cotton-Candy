import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const isAdminBuild = env.VITE_APP_MODE === 'admin'
  const firebaseConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY || '',
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: env.VITE_FIREBASE_APP_ID || '',
  }

  return {
    plugins: [
      react(),
      {
        name: 'admin-service-worker-config',
        closeBundle() {
          if (!isAdminBuild) return
          const serviceWorkerPath = resolve(process.cwd(), 'dist/admin-sw.js')
          if (!existsSync(serviceWorkerPath)) return
          const source = readFileSync(serviceWorkerPath, 'utf8')
          writeFileSync(serviceWorkerPath, source.replace('const FIREBASE_CONFIG = null', `const FIREBASE_CONFIG = ${JSON.stringify(firebaseConfig)}`))
        },
      },
    ],
    server: {
      fs: {
        allow: ['..'],
      },
    },
  }
})
