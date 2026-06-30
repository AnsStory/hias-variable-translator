declare module 'vite-plugin-obfuscator' {
  import { Plugin } from 'vite'

  export interface JavaScriptObfuscatorOptions {
    compact?: boolean
    controlFlowFlattening?: boolean
    controlFlowFlatteningThreshold?: number
    deadCodeInjection?: boolean
    deadCodeInjectionThreshold?: number
    debugProtection?: boolean
    disableConsoleOutput?: boolean
    identifierNamesGenerator?: string
    log?: boolean
    numbersToExpressions?: boolean
    renameGlobals?: boolean
    selfDefending?: boolean
    simplify?: boolean
    splitStrings?: boolean
    splitStringsChunkLength?: number
    stringArray?: boolean
    stringArrayCallsTransform?: boolean
    stringArrayCallsTransformThreshold?: number
    stringArrayEncoding?: string[]
    stringArrayIndexShift?: boolean
    stringArrayRotate?: boolean
    stringArrayShuffle?: boolean
    stringArrayWrappersCount?: number
    stringArrayWrappersChainedCalls?: boolean
    stringArrayWrappersParametersMaxCount?: number
    stringArrayWrappersType?: string
    stringArrayThreshold?: number
    target?: string
    transformObjectKeys?: boolean
    unicodeEscapeSequence?: boolean
  }

  export function viteObfuscateFile(options?: JavaScriptObfuscatorOptions): Plugin
}
