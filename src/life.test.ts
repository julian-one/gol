import { describe, expect, it } from 'vitest';
import { Life } from './life.js';

describe('step', () => {
	it('turns a horizontal blinker vertical', () => {
		const life = new Life(5, 5);
		life.setAlive(1, 2, true);
		life.setAlive(2, 2, true);
		life.setAlive(3, 2, true);

		life.step();

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

		life.step();

		expect(life.isAlive(0, 1)).toBe(true);
		expect(life.isAlive(0, 2)).toBe(true);
		expect(life.isAlive(0, 3)).toBe(true);
		expect(life.isAlive(4, 2)).toBe(false);
		expect(life.isAlive(1, 2)).toBe(false);
	});

	it('does nothing on an empty grid', () => {
		const life = new Life(0, 0, { gliderEvery: 1 });

		life.step();

		expect(life.isAlive(0, 0)).toBe(false);
	});
});

describe('cells outside the grid', () => {
	it('reads as dead', () => {
		const life = new Life(5, 5);
		life.randomize(1);

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

describe('randomize', () => {
	it('fills cells whose draw falls under the density', () => {
		const life = new Life(4, 4, {
			random: () => {
				return 0.5;
			}
		});

		life.randomize(0.6);
		expect(life.isAlive(0, 0)).toBe(true);
		expect(life.isAlive(3, 3)).toBe(true);

		life.randomize(0.4);
		expect(life.isAlive(0, 0)).toBe(false);
		expect(life.isAlive(3, 3)).toBe(false);
	});
});

describe('glider cadence', () => {
	it('spawns a glider every given number of generations', () => {
		const life = new Life(8, 8, {
			gliderEvery: 2,
			random: () => {
				return 0;
			}
		});

		life.step();
		expect(life.isAlive(0, 0)).toBe(false);

		life.step();
		expect(life.isAlive(0, 0)).toBe(true);
		expect(life.isAlive(1, 0)).toBe(true);
		expect(life.isAlive(2, 0)).toBe(true);
		expect(life.isAlive(2, 1)).toBe(true);
		expect(life.isAlive(1, 2)).toBe(true);
	});

	it('wraps a glider spawned at the far corner', () => {
		const life = new Life(8, 8, {
			gliderEvery: 1,
			random: () => {
				return 0.99;
			}
		});

		life.step();

		expect(life.isAlive(7, 7)).toBe(true);
		expect(life.isAlive(0, 7)).toBe(true);
		expect(life.isAlive(1, 7)).toBe(true);
		expect(life.isAlive(1, 0)).toBe(true);
		expect(life.isAlive(0, 1)).toBe(true);
	});

	it('spawns nothing without a cadence', () => {
		const life = new Life(8, 8, {
			random: () => {
				return 0;
			}
		});

		life.step();
		life.step();

		expect(life.isAlive(0, 0)).toBe(false);
	});
});

describe('generation', () => {
	it('counts the steps taken', () => {
		const life = new Life(5, 5);
		expect(life.generation).toBe(0);

		life.step();
		life.step();

		expect(life.generation).toBe(2);
	});

	it('stays at zero on an empty grid', () => {
		const life = new Life(0, 0);

		life.step();

		expect(life.generation).toBe(0);
	});
});

describe('population', () => {
	it('counts live cells', () => {
		const life = new Life(5, 5);
		expect(life.population()).toBe(0);

		life.setAlive(1, 2, true);
		life.setAlive(2, 2, true);
		life.setAlive(3, 2, true);

		expect(life.population()).toBe(3);
	});

	it('follows the grid as it evolves', () => {
		const life = new Life(5, 5);
		life.setAlive(2, 2, true);

		life.step();

		expect(life.population()).toBe(0);
	});

	it('counts every cell after a full randomize', () => {
		const life = new Life(4, 3);

		life.randomize(1);

		expect(life.population()).toBe(12);
	});
});

describe('resize', () => {
	it('keeps the cells that still fit', () => {
		const life = new Life(4, 4);
		life.setAlive(1, 1, true);
		life.setAlive(3, 3, true);

		life.resize(6, 3);

		expect(life.cols).toBe(6);
		expect(life.rows).toBe(3);
		expect(life.isAlive(1, 1)).toBe(true);
		expect(life.population()).toBe(1);
	});

	it('keeps the generation', () => {
		const life = new Life(4, 4);
		life.step();
		life.step();

		life.resize(8, 8);

		expect(life.generation).toBe(2);
	});

	it('leaves new cells dead without a density', () => {
		const life = new Life(2, 2);
		life.randomize(1);

		life.resize(4, 4);

		expect(life.population()).toBe(4);
	});

	it('seeds only the new cells with a density', () => {
		const life = new Life(2, 2, {
			random: () => {
				return 0.1;
			}
		});

		life.resize(3, 3, 0.5);

		expect(life.isAlive(0, 0)).toBe(false);
		expect(life.isAlive(1, 1)).toBe(false);
		expect(life.isAlive(2, 0)).toBe(true);
		expect(life.isAlive(0, 2)).toBe(true);
		expect(life.population()).toBe(5);
	});

	it('still steps after growing', () => {
		const life = new Life(3, 3);

		life.resize(5, 5);
		life.setAlive(1, 2, true);
		life.setAlive(2, 2, true);
		life.setAlive(3, 2, true);
		life.step();

		expect(life.isAlive(2, 1)).toBe(true);
		expect(life.isAlive(2, 3)).toBe(true);
		expect(life.isAlive(1, 2)).toBe(false);
	});

	it('moves kept cells by the shift', () => {
		const life = new Life(2, 2);
		life.setAlive(0, 0, true);
		life.setAlive(1, 1, true);

		life.resize(6, 6, 0, 2, 3);

		expect(life.isAlive(2, 3)).toBe(true);
		expect(life.isAlive(3, 4)).toBe(true);
		expect(life.population()).toBe(2);
	});

	it('drops cells shifted off the grid', () => {
		const life = new Life(4, 4);
		life.setAlive(0, 0, true);
		life.setAlive(3, 3, true);

		life.resize(2, 2, 0, -2, -2);

		expect(life.isAlive(1, 1)).toBe(true);
		expect(life.population()).toBe(1);
	});
});
