"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vite_1 = require("vite");
const path_1 = require("path");
const vite_plugin_obfuscator_1 = require("vite-plugin-obfuscator");
exports.default = (0, vite_1.defineConfig)({
    plugins: [
        (0, vite_plugin_obfuscator_1.viteObfuscateFile)({
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
            selfDefending: true,
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
            unicodeEscapeSequence: false
        })
    ],
    build: {
        outDir: 'dist',
        lib: {
            entry: (0, path_1.resolve)(__dirname, 'src/extension.ts'),
            formats: ['cjs'],
            fileName: 'extension'
        },
        rollupOptions: {
            external: [
                'vscode',
                'path',
                'fs',
                'crypto',
                'url',
                'http',
                'https'
            ],
            output: {
                entryFileNames: 'extension.js',
                chunkFileNames: '[name].js',
                assetFileNames: '[name].[ext]'
            }
        },
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true,
                drop_debugger: true
            }
        }
    }
});
//# sourceMappingURL=vite.config.js.map