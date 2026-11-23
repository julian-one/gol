import { describe, expect, it } from 'vitest';
import { Grid } from './grid.js';

describe('nextGeneration', () => {
	it('turns a horizontal blinker vertical', () => {
		const grid = new Grid(5, 5);
		grid.setAlive(1, 2, true);
		grid.setAlive(2, 2, true);
		grid.setAlive(3, 2, true);

		grid.nextGeneration();

		expect(grid.isAlive(2, 1)).toBe(true);
		expect(grid.isAlive(2, 2)).toBe(true);
		expect(grid.isAlive(2, 3)).toBe(true);
		expect(grid.isAlive(1, 2)).toBe(false);
		expect(grid.isAlive(3, 2)).toBe(false);
	});

	it('wraps around the edges', () => {
		const grid = new Grid(5, 5);
		grid.setAlive(4, 2, true);
		grid.setAlive(0, 2, true);
		grid.setAlive(1, 2, true);

		grid.nextGeneration();

		expect(grid.isAlive(0, 1)).toBe(true);
		expect(grid.isAlive(0, 2)).toBe(true);
		expect(grid.isAlive(0, 3)).toBe(true);
		expect(grid.isAlive(4, 2)).toBe(false);
		expect(grid.isAlive(1, 2)).toBe(false);
	});

	it('does nothing on an empty grid', () => {
		const grid = new Grid(0, 0);

		grid.nextGeneration();

		expect(grid.isAlive(0, 0)).toBe(false);
	});
});

describe('cells outside the grid', () => {
	it('reads as dead', () => {
		const grid = new Grid(5, 5);
		for (let row = 0; row < 5; row++) {
			for (let col = 0; col < 5; col++) {
				grid.setAlive(col, row, true);
			}
		}

		expect(grid.isAlive(-1, 0)).toBe(false);
		expect(grid.isAlive(5, 0)).toBe(false);
		expect(grid.isAlive(0, -1)).toBe(false);
		expect(grid.isAlive(0, 5)).toBe(false);
	});

	it('ignores writes', () => {
		const grid = new Grid(5, 5);

		grid.setAlive(5, 0, true);
		grid.setAlive(-1, 1, true);

		expect(grid.isAlive(0, 1)).toBe(false);
		expect(grid.isAlive(4, 0)).toBe(false);
	});
});

describe('scatter', () => {
	it('places a cell at the top left of the region when the draw is 0', () => {
		const grid = new Grid(10, 10, {
			random: () => {
				return 0;
			}
		});

		grid.scatter({ col: 2, row: 3, cols: 4, rows: 5 }, 1);

		expect(grid.isAlive(2, 3)).toBe(true);
	});

	it('places a cell at the bottom right of the region when the draw is just under 1', () => {
		const grid = new Grid(10, 10, {
			random: () => {
				return 0.99;
			}
		});

		grid.scatter({ col: 2, row: 3, cols: 4, rows: 5 }, 1);

		expect(grid.isAlive(5, 7)).toBe(true);
	});

	it('wraps a region that crosses the right edge onto the left edge', () => {
		const grid = new Grid(10, 10, {
			random: () => {
				return 0.99;
			}
		});

		// The region covers columns 8 to 11; column 11 is column 1 after wrapping.
		grid.scatter({ col: 8, row: 0, cols: 4, rows: 1 }, 1);

		expect(grid.isAlive(1, 0)).toBe(true);
	});

	it('wraps a region that starts left of and above the grid', () => {
		const grid = new Grid(10, 10, {
			random: () => {
				return 0;
			}
		});

		grid.scatter({ col: -2, row: -3, cols: 4, rows: 4 }, 1);

		expect(grid.isAlive(8, 7)).toBe(true);
	});

	it('only adds cells', () => {
		const grid = new Grid(10, 10, {
			random: () => {
				return 0;
			}
		});
		grid.setAlive(3, 3, true);

		// The region includes the live cell at 3, 3, but every draw lands on 2, 2.
		grid.scatter({ col: 2, row: 2, cols: 4, rows: 4 }, 5);

		expect(grid.isAlive(3, 3)).toBe(true);
		expect(grid.isAlive(2, 2)).toBe(true);
	});

	it('does nothing on an empty grid', () => {
		const grid = new Grid(0, 0);

		grid.scatter({ col: 0, row: 0, cols: 4, rows: 4 }, 5);

		expect(grid.isAlive(0, 0)).toBe(false);
	});
});

describe('population', () => {
	it('is zero for a new grid', () => {
		const grid = new Grid(5, 5);

		expect(grid.population()).toBe(0);
	});

	it('counts the live cells', () => {
		const grid = new Grid(5, 5);
		grid.setAlive(0, 0, true);
		grid.setAlive(2, 3, true);
		grid.setAlive(4, 4, true);

		expect(grid.population()).toBe(3);
	});

	it('follows the grid as it changes', () => {
		const grid = new Grid(5, 5);
		grid.setAlive(2, 2, true);

		// A single cell has no neighbors and dies by underpopulation.
		grid.nextGeneration();

		expect(grid.population()).toBe(0);
	});
});
