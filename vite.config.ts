import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import obfuscatorPlugin from 'vite-plugin-javascript-obfuscator'
import fs from 'fs'
const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'))
const version = pkg.version

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    obfuscatorPlugin({
      include: ['src/**/*.js', 'src/**/*.jsx', 'src/**/*.ts', 'src/**/*.tsx'],
      apply: 'build',
      options: {
        compact: true,
        // controlFlowFlattening e deadCodeInjection rimossi:
        // aumentavano del 30-50% la size del bundle e i tempi di build
        // senza garantire sicurezza reale (le API key restano leggibili via network inspector)
        controlFlowFlattening: false,
        deadCodeInjection: false,
        debugProtection: false,
        disableConsoleOutput: true,
        identifierNamesGenerator: 'hexadecimal',
        stringArray: true,
        stringArrayThreshold: 0.6,
      }
    })
  ],
  define: {
    __APP_VERSION__: JSON.stringify(version),
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(version)
  }
})
