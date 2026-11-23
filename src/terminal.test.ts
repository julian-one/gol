import { describe, expect, it } from 'vitest';
import { Grid } from './grid.js';
import { Terminal } from './terminal.js';

describe('gridSize', () => {
	it('fits a classic 80 by 24 terminal when stdout is not a TTY', () => {
		// Tests run with stdout piped, so the terminal has no size of its own.
		const terminal = new Terminal();

		const size = terminal.gridSize();

		// 80 characters of 2 cells across; 23 lines of 4 cells down, the last line left for the cursor.
		expect(size.cols).toBe(160);
		expect(size.rows).toBe(92);
	});
});

describe('frame', () => {
	it('draws each live cell as one braille dot', () => {
		const grid = new Grid(3, 2);
		grid.setAlive(1, 0, true);
		grid.setAlive(0, 1, true);
		grid.setAlive(2, 1, true);
		const terminal = new Terminal();

		const frame = terminal.frame(grid);

		// First character: top right and second-row left dots. Second: second-row left dot.
		expect(frame).toBe('⠊⠂\n');
	});

	it('fills a character when all 2 by 4 cells are alive', () => {
		const grid = new Grid(2, 4);
		for (let row = 0; row < 4; row++) {
			for (let col = 0; col < 2; col++) {
				grid.setAlive(col, row, true);
			}
		}
		const terminal = new Terminal();

		const frame = terminal.frame(grid);

		expect(frame).toBe('⣿\n');
	});

	it('draws a block of dead cells as a space', () => {
		const grid = new Grid(4, 8);
		grid.setAlive(3, 7, true);
		const terminal = new Terminal();

		const frame = terminal.frame(grid);

		expect(frame).toBe('  \n ⢀\n');
	});

	it('is empty for an empty grid', () => {
		const grid = new Grid(0, 0);
		const terminal = new Terminal();

		const frame = terminal.frame(grid);

		expect(frame).toBe('');
	});
});
