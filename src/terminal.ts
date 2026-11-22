import type { Life } from './life.js';

// ANSI escape codes, understood by terminals as commands instead of text.
const hideCursor = '\x1b[?25l';
const showCursor = '\x1b[?25h';
const clearScreen = '\x1b[2J';
const cursorHome = '\x1b[H';

// The first braille character, with no dots raised. Adding dot values to it raises dots.
const brailleBlank = 0x2800;

// Each braille character holds a block of cells 2 wide and 4 tall, one dot per cell.
const cellsPerCharacterAcross = 2;
const cellsPerCharacterDown = 4;

/** The size of a grid in cells. */
export type GridSize = {
	cols: number;
	rows: number;
};

/** Draws a `Life` grid in the terminal and animates it on stdout. */
export class Terminal {
	/**
	 * The size of the largest grid that fits in the terminal window.
	 *
	 * A terminal of 80 by 24 characters fits 160 by 92 cells: each character shows 2 by 4 cells,
	 * and the last line is left free for the cursor. The size is read once, when this is called;
	 * resizing the window later does not change a grid that was already made.
	 */
	gridSize(): GridSize {
		// Fall back to a classic 80x24 terminal when stdout is not a TTY.
		const terminalColumns = process.stdout.columns ?? 80;
		const terminalRows = process.stdout.rows ?? 24;

		// Every line of a frame ends in a newline, which moves the cursor onto the line below.
		const frameLines = terminalRows - 1;

		const cols = terminalColumns * cellsPerCharacterAcross;
		const rows = frameLines * cellsPerCharacterDown;
		return { cols: cols, rows: rows };
	}

	/**
	 * The current grid of `life` as text, drawn with braille characters.
	 *
	 * Each character holds a block of cells 2 wide and 4 tall, one dot per live cell.
	 * Every line of characters ends in a newline.
	 */
	frame(life: Life): string {
		let text = '';
		for (let y = 0; y < life.rows; y += cellsPerCharacterDown) {
			for (let x = 0; x < life.cols; x += cellsPerCharacterAcross) {
				// Each dot of a braille character has its own value. The bottom row's values are out
				// of sequence because braille originally had three rows. Cells past the edge read as dead.
				let dots = 0;
				if (life.isAlive(x, y)) {
					dots += 0x01;
				}
				if (life.isAlive(x, y + 1)) {
					dots += 0x02;
				}
				if (life.isAlive(x, y + 2)) {
					dots += 0x04;
				}
				if (life.isAlive(x, y + 3)) {
					dots += 0x40;
				}
				if (life.isAlive(x + 1, y)) {
					dots += 0x08;
				}
				if (life.isAlive(x + 1, y + 1)) {
					dots += 0x10;
				}
				if (life.isAlive(x + 1, y + 2)) {
					dots += 0x20;
				}
				if (life.isAlive(x + 1, y + 3)) {
					dots += 0x80;
				}

				// Some fonts draw the blank braille character as faint empty dots, so use a space.
				if (dots === 0) {
					text += ' ';
				} else {
					text += String.fromCharCode(brailleBlank + dots);
				}
			}
			text += '\n';
		}
		return text;
	}

	/**
	 * Starts the animation of `life`: every `intervalMs` milliseconds it draws the grid, calls
	 * `beforeGeneration`, where the caller can change the grid, and then advances one generation.
	 * Runs until `Ctrl+C`, which restores the cursor and exits.
	 */
	start(life: Life, intervalMs: number, beforeGeneration: () => void) {
		process.stdout.write(hideCursor + clearScreen);

		const timer = setInterval(() => {
			// Redraw over the previous frame instead of scrolling.
			process.stdout.write(cursorHome + this.frame(life));
			beforeGeneration();
			life.nextGeneration();
		}, intervalMs);

		process.on('SIGINT', () => {
			clearInterval(timer);
			process.stdout.write(showCursor + '\n');
			process.exit(0);
		});
	}
}
