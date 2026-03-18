/**
 * lib/zaeli-provider.ts
 * Shared AI provider toggle state — used by zaeli-chat.tsx and more.tsx
 */

export type ZaeliProvider = 'claude' | 'openai';

let _provider: ZaeliProvider = 'claude';

export function getZaeliProvider(): ZaeliProvider { return _provider; }
export function setZaeliProvider(p: ZaeliProvider) { _provider = p; }
