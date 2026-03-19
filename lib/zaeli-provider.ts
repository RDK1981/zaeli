/**
 * lib/zaeli-provider.ts
 * Shared AI provider toggle state — used by zaeli-chat.tsx and more.tsx
 */

export type ZaeliProvider = 'claude' | 'openai';

let _provider: ZaeliProvider = 'openai'; // GPT-5.4 mini default — change to 'claude' to switch

export function getZaeliProvider(): ZaeliProvider { return _provider; }
export function setZaeliProvider(p: ZaeliProvider) { _provider = p; }
