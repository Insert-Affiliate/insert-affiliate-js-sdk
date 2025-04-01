import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'], // <- Use CJS for compatibility
  dts: true,
  clean: true,
  outDir: 'dist',
})
