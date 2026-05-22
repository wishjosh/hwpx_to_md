import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    assetsInlineLimit: 100000000, // 모든 자산을 인라인화 하도록 큰 임계값 설정
    chunkSizeWarningLimit: 10000000,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
