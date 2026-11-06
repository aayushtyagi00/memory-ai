export type StorageMode = {kind:'signed-out'} | {kind:'demo'} | {kind:'cloud';userId:string};
let mode: StorageMode = {kind:'signed-out'};
let generation = 0;
export function setStorageMode(next: StorageMode) { if(JSON.stringify(mode)!==JSON.stringify(next)){mode=next; generation++;} }
export function getStorageMode() { return mode; }
export function getGeneration() { return generation; }
export function requireMode() { if(mode.kind==='signed-out') throw new Error('Please sign in or open the local demo.'); return mode; }
export function demoKey(name:string) { if(requireMode().kind!=='demo') throw new Error('Local demo storage is unavailable in cloud mode.'); return `memory_ai:v2:demo:${name}`; }
