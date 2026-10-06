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
  // km-deploy.onkakao.net 배포 슬러그(lis-settlement)에 맞춘 경로. 슬러그를 바꾸면 DEPLOY_BASE 환경변수로 덮어쓸 수 있음
  // 예: DEPLOY_BASE=/p/다른슬러그/ npm run build
  base: process.env.DEPLOY_BASE || '/p/lis-settlement/',
  build: {
    rollupOptions: {
      output: {
        assetFileNames: '[name][extname]',
        chunkFileNames: '[name].js',
        entryFileNames: '[name].js',
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'tab-312': [path.resolve(__dirname, 'src/imports/312통합장부/index.tsx')],
          'tab-313': [path.resolve(__dirname, 'src/imports/313매출장부화주사/index.tsx')],
          'tab-314': [path.resolve(__dirname, 'src/imports/314매입장부정보망배차/index.tsx')],
          'tab-315': [path.resolve(__dirname, 'src/imports/315매출거래명세서화주사/index.tsx')],
          'tab-316': [path.resolve(__dirname, 'src/imports/316매입거래명세서소속기사/index.tsx')],
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

  server: {
    proxy: {
      // AI 문의 백엔드(server/index.mjs, 기본 포트 8787)로 프록시
      '/api': {
        target: `http://localhost:${process.env.PORT || 8787}`,
        changeOrigin: true,
      },
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
