import type { Grid, GridSize } from './grid.js';

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

/** Draws a `Grid` in the terminal, on stdout. */
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
	 * The current generation of `grid` as text, drawn with braille characters.
	 *
	 * Each character holds a block of cells 2 wide and 4 tall, one dot per live cell.
	 * Every line of characters ends in a newline.
	 */
	frame(grid: Grid): string {
		let text = '';
		for (let row = 0; row < grid.rows; row += cellsPerCharacterDown) {
			for (let col = 0; col < grid.cols; col += cellsPerCharacterAcross) {
				// Each dot of a braille character has its own value. The bottom row's values are out
				// of sequence because braille originally had three rows. Cells past the edge read as dead.
				let dots = 0;
				if (grid.isAlive(col, row)) {
					dots += 0x01;
				}
				if (grid.isAlive(col, row + 1)) {
					dots += 0x02;
				}
				if (grid.isAlive(col, row + 2)) {
					dots += 0x04;
				}
				if (grid.isAlive(col, row + 3)) {
					dots += 0x40;
				}
				if (grid.isAlive(col + 1, row)) {
					dots += 0x08;
				}
				if (grid.isAlive(col + 1, row + 1)) {
					dots += 0x10;
				}
				if (grid.isAlive(col + 1, row + 2)) {
					dots += 0x20;
				}
				if (grid.isAlive(col + 1, row + 3)) {
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
	 * Gets the terminal ready for drawing: hides the cursor and clears the screen.
	 * From then on `Ctrl+C` restores the cursor and exits. Call it once, before the first `draw`.
	 */
	open() {
		process.stdout.write(hideCursor + clearScreen);

		process.on('SIGINT', () => {
			process.stdout.write(showCursor + '\n');
			process.exit(0);
		});
	}

	/** Writes the current generation of `grid` to stdout as a frame, over the previous frame. */
	draw(grid: Grid) {
		// Redraw over the previous frame instead of scrolling.
		process.stdout.write(cursorHome + this.frame(grid));
	}
}
