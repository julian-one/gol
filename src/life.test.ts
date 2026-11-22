import { describe, expect, it } from 'vitest';
import { Life } from './life.js';

describe('nextGeneration', () => {
	it('turns a horizontal blinker vertical', () => {
		const life = new Life(5, 5);
		life.setAlive(1, 2, true);
		life.setAlive(2, 2, true);
		life.setAlive(3, 2, true);

		life.nextGeneration();

		expect(life.isAlive(2, 1)).toBe(true);
		expect(life.isAlive(2, 2)).toBe(true);
		expect(life.isAlive(2, 3)).toBe(true);
		expect(life.isAlive(1, 2)).toBe(false);
		expect(life.isAlive(3, 2)).toBe(false);
	});

	it('wraps around the edges', () => {
		const life = new Life(5, 5);
		life.setAlive(4, 2, true);
		life.setAlive(0, 2, true);
		life.setAlive(1, 2, true);

		life.nextGeneration();

		expect(life.isAlive(0, 1)).toBe(true);
		expect(life.isAlive(0, 2)).toBe(true);
		expect(life.isAlive(0, 3)).toBe(true);
		expect(life.isAlive(4, 2)).toBe(false);
		expect(life.isAlive(1, 2)).toBe(false);
	});

	it('does nothing on an empty grid', () => {
		const life = new Life(0, 0);

		life.nextGeneration();

		expect(life.isAlive(0, 0)).toBe(false);
	});
});

describe('cells outside the grid', () => {
	it('reads as dead', () => {
		const life = new Life(5, 5);
		for (let y = 0; y < 5; y++) {
			for (let x = 0; x < 5; x++) {
				life.setAlive(x, y, true);
			}
		}

		expect(life.isAlive(-1, 0)).toBe(false);
		expect(life.isAlive(5, 0)).toBe(false);
		expect(life.isAlive(0, -1)).toBe(false);
		expect(life.isAlive(0, 5)).toBe(false);
	});

	it('ignores writes', () => {
		const life = new Life(5, 5);

		life.setAlive(5, 0, true);
		life.setAlive(-1, 1, true);

		expect(life.isAlive(0, 1)).toBe(false);
		expect(life.isAlive(4, 0)).toBe(false);
	});
});

describe('scatter', () => {
	it('places a cell at the top left of the box when the draw is 0', () => {
		const life = new Life(10, 10, {
			random: () => {
				return 0;
			}
		});

		life.scatter({ left: 2, top: 3, width: 4, height: 5 }, 1);

		expect(life.isAlive(2, 3)).toBe(true);
	});

	it('places a cell at the bottom right of the box when the draw is just under 1', () => {
		const life = new Life(10, 10, {
			random: () => {
				return 0.99;
			}
		});

		life.scatter({ left: 2, top: 3, width: 4, height: 5 }, 1);

		expect(life.isAlive(5, 7)).toBe(true);
	});

	it('wraps a box that crosses the right edge onto the left edge', () => {
		const life = new Life(10, 10, {
			random: () => {
				return 0.99;
			}
		});

		// The box covers columns 8 to 11; column 11 is column 1 after wrapping.
		life.scatter({ left: 8, top: 0, width: 4, height: 1 }, 1);

		expect(life.isAlive(1, 0)).toBe(true);
	});

	it('wraps a box that starts left of and above the grid', () => {
		const life = new Life(10, 10, {
			random: () => {
				return 0;
			}
		});

		life.scatter({ left: -2, top: -3, width: 4, height: 4 }, 1);

		expect(life.isAlive(8, 7)).toBe(true);
	});

	it('only adds cells', () => {
		const life = new Life(10, 10, {
			random: () => {
				return 0;
			}
		});
		life.setAlive(3, 3, true);

		// The box includes the live cell at 3, 3, but every draw lands on 2, 2.
		life.scatter({ left: 2, top: 2, width: 4, height: 4 }, 5);

		expect(life.isAlive(3, 3)).toBe(true);
		expect(life.isAlive(2, 2)).toBe(true);
	});

	it('does nothing on an empty grid', () => {
		const life = new Life(0, 0);

		life.scatter({ left: 0, top: 0, width: 4, height: 4 }, 5);

		expect(life.isAlive(0, 0)).toBe(false);
	});
});
