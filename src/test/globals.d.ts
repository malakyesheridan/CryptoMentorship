// src/test/globals.d.ts

// Ambient declarations so TypeScript recognizes test globals during typecheck.
// (Keeps strictness elsewhere; no config or tool changes needed.)
declare const describe: (name: string, fn: () => void | Promise<void>) => void
declare const it: (name: string, fn: () => void | Promise<void>) => void
declare const test: (name: string, fn: () => void | Promise<void>) => void
declare const expect: (...args: any[]) => any
