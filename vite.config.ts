import { defineConfig } from 'vite'
import { resolve } from 'path'
import obfuscator from 'rollup-plugin-obfuscator'

export default defineConfig(({ mode }) => ({
  build: {
    // sourcemap: true,
    outDir: 'dist',
    lib: {
      entry: resolve(__dirname, 'src/extension.ts'),
      formats: ['cjs'],
      fileName: 'extension',
    },
    rollupOptions: {
      external: ['vscode', 'path', 'fs', 'fs/promises', 'crypto', 'url', 'http', 'https'],
      output: {
        entryFileNames: 'extension.js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
        // 第三方依赖拆为独立 vendor chunk，主文件仅保留自有混淆代码
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor'
          }
        },
      },
      plugins:
        mode === 'production'
          ? [
              obfuscator({
                // 仅处理自有代码文件混淆，node_modules 内部不做混淆
                global: false,
                include: ['src/**/*'],
                exclude: ['node_modules/**'],
                options: {
                  compact: true,
                  controlFlowFlattening: true,
                  controlFlowFlatteningThreshold: 0.75,
                  deadCodeInjection: true,
                  deadCodeInjectionThreshold: 0.4,
                  debugProtection: false,
                  disableConsoleOutput: true,
                  identifierNamesGenerator: 'hexadecimal',
                  log: false,
                  numbersToExpressions: true,
                  renameGlobals: false,
                  // 混淆后还会经过 terser 压缩改写，selfDefending 会导致产物自毁，必须关闭
                  selfDefending: false,
                  simplify: true,
                  splitStrings: true,
                  splitStringsChunkLength: 10,
                  stringArray: true,
                  stringArrayCallsTransform: true,
                  stringArrayEncoding: ['base64'],
                  stringArrayIndexShift: true,
                  stringArrayRotate: true,
                  stringArrayShuffle: true,
                  stringArrayWrappersCount: 1,
                  stringArrayWrappersChainedCalls: true,
                  stringArrayWrappersParametersMaxCount: 2,
                  stringArrayWrappersType: 'function',
                  stringArrayThreshold: 0.75,
                  transformObjectKeys: true,
                  unicodeEscapeSequence: false,
                },
              }),
            ]
          : [],
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
}))
