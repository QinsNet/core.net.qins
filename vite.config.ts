import { defineConfig } from 'vite'
import dtsPlugin from 'vite-plugin-dts'
export default defineConfig({
  build: {
    lib: {
      formats: ['es', 'cjs'],
      entry: './lib/qins-net/index.ts',
      name: 'QinsNet',
      fileName: 'qins-net',
    },
    rollupOptions: {
      external: ['reflect-metadata','express'],
    }
  },
  server: {
    watch: {
      ignored: ['**/node_modules/**'],
    },
  },
  optimizeDeps: {
    noDiscovery: true,
  },
  plugins: [
    dtsPlugin({
      insertTypesEntry: true, // 在 package.json 中添加 types 字段
      tsconfigPath: './tsconfig.json',
    })
  ]
})