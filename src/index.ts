// The package root exports only the engine, which touches no DOM API, so it
// can be imported where there is no browser. Everything that needs a canvas
// is behind the separate `gol/canvas` entry.
export { Life } from './life.js';
export type { LifeOptions } from './life.js';
