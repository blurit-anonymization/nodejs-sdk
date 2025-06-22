import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/blurit.ts'],
  format: ['esm', 'cjs'],
  dts: true, // génère les .d.ts
  sourcemap: true,
  clean: true, // vide le dossier dist avant build
});
