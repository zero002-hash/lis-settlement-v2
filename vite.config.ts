import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      output: {
        assetFileNames: '[name][extname]',
        chunkFileNames: '[name].js',
        entryFileNames: '[name].js',
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'tab-312': ['/Users/sue.su/lis-1/src/imports/312통합장부/index.tsx'],
          'tab-313': ['/Users/sue.su/lis-1/src/imports/313매출장부화주사/index.tsx'],
          'tab-314': ['/Users/sue.su/lis-1/src/imports/314매입장부정보망배차/index.tsx'],
          'tab-315': ['/Users/sue.su/lis-1/src/imports/315매출거래명세서화주사/index.tsx'],
          'tab-316': ['/Users/sue.su/lis-1/src/imports/316매입거래명세서소속기사/index.tsx'],
        },
      },
    },
  },
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
