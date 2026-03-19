import { defineConfig } from 'vite'
import dtsPlugin from 'vite-plugin-dts'
export default defineConfig({
  build: {
    lib: {
      formats: ['es', 'cjs'],
      entry: './lib/qins-net/net.ts',
      name: 'QinsNet',
      fileName: 'qins-net',
    },
    rollupOptions: {
      treeshake: false,
      output: {
        preserveModules: true, // ✅ 保留文件结构
        entryFileNames: '[name].[format]', // ✅ 输出文件名规则
        dir: 'dist',
        inlineDynamicImports: false,
      }
    },
  },
  optimizeDeps: {
    include: ['reflect-metadata'],
  },
  plugins: [
    dtsPlugin({
      insertTypesEntry: true, // 在 package.json 中添加 types 字段
      tsconfigPath: './tsconfig.json',
    })
  ]
})