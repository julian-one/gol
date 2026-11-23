import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Simulation } from './simulation.js';
import type { Grid } from './grid.js';

// Stands in for a terminal or a canvas: a display of 20 by 20 cells that records what each
// drawing showed.
let populations: number[];
let lastDrawn: Grid | undefined;
const display = {
	gridSize: () => {
		return { cols: 20, rows: 20 };
	},
	draw: (grid: Grid) => {
		populations.push(grid.population());
		lastDrawn = grid;
	}
};

// Random numbers that cycle through four positions in the region, two draws per position: columns
// 4 and 5, rows 0 and 1. On a 20 by 20 grid the region starts at column 15, row 5, so the positions
// are the cells 19,5 and 0,5 and 19,6 and 0,6: a block of four across the left and right edges.
// A block is stable, so it is still there in every later generation.
let randomCalls: number;
const randomValues = [0.45, 0.05, 0.55, 0.05, 0.45, 0.15, 0.55, 0.15];
const random = () => {
	const value = randomValues[randomCalls % randomValues.length];
	randomCalls++;
	return value ?? 0;
};

beforeEach(() => {
	populations = [];
	lastDrawn = undefined;
	randomCalls = 0;
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe('start', () => {
	it('draws a grid as large as the display', () => {
		const simulation = new Simulation(display, { random: random });

		simulation.start(100);
		vi.advanceTimersByTime(100);

		expect(lastDrawn?.cols).toBe(20);
		expect(lastDrawn?.rows).toBe(20);
	});

	it('draws the empty grid first', () => {
		const simulation = new Simulation(display, { random: random });

		simulation.start(100);
		vi.advanceTimersByTime(100);

		expect(populations).toEqual([0]);
	});

	it('draws once per interval', () => {
		const simulation = new Simulation(display, { random: random });

		simulation.start(100);
		vi.advanceTimersByTime(350);

		expect(populations.length).toBe(3);
	});

	it('scatters into a region centered on the left and right edges', () => {
		const simulation = new Simulation(display, { random: random });

		simulation.start(100);
		vi.advanceTimersByTime(200);

		expect(populations).toEqual([0, 4]);
		expect(lastDrawn?.isAlive(19, 5)).toBe(true);
		expect(lastDrawn?.isAlive(0, 5)).toBe(true);
		expect(lastDrawn?.isAlive(19, 6)).toBe(true);
		expect(lastDrawn?.isAlive(0, 6)).toBe(true);
	});

	it('scatters 40 cells at the start, then 3 before every generation', () => {
		const simulation = new Simulation(display, { random: random });

		simulation.start(100);

		// Every scattered cell takes two random numbers, one for its column and one for its row.
		vi.advanceTimersByTime(100);
		expect(randomCalls).toBe(80);
		vi.advanceTimersByTime(100);
		expect(randomCalls).toBe(86);
		vi.advanceTimersByTime(100);
		expect(randomCalls).toBe(92);
	});

	it('does nothing when already running', () => {
		const simulation = new Simulation(display, { random: random });

		simulation.start(100);
		simulation.start(100);
		vi.advanceTimersByTime(100);

		expect(populations.length).toBe(1);
	});
});

describe('stop', () => {
	it('stops drawing', () => {
		const simulation = new Simulation(display, { random: random });
		simulation.start(100);
		vi.advanceTimersByTime(100);

		simulation.stop();
		vi.advanceTimersByTime(500);

		expect(populations.length).toBe(1);
	});

	it('lets start continue from where it stopped', () => {
		const simulation = new Simulation(display, { random: random });
		simulation.start(100);
		vi.advanceTimersByTime(100);
		simulation.stop();

		simulation.start(100);
		vi.advanceTimersByTime(100);

		// The block scattered before the stop is still there, not a new empty grid.
		expect(populations).toEqual([0, 4]);
	});
});
