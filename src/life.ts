export type LifeOptions = {
	/**
	 * Source of random numbers from 0 (inclusive) to 1 (exclusive), used by `scatter`.
	 * Defaults to `Math.random`. Pass your own to get a repeatable grid, for example in tests.
	 */
	random?: () => number;
};

/**
 * A rectangle of cells: `width` by `height` cells, with its top left cell at column `left`,
 * row `top`. All four are whole numbers.
 */
export type Box = {
	left: number;
	top: number;
	width: number;
	height: number;
};

// Rule 1: a live cell with fewer than two live neighbors dies, as if by underpopulation.
function diesByUnderpopulation(alive: boolean, neighbors: number): boolean {
	return alive && neighbors < 2;
}

// Rule 2: a live cell with two or three live neighbors lives on to the next generation.
function livesOn(alive: boolean, neighbors: number): boolean {
	const twoOrThree = neighbors === 2 || neighbors === 3;
	return alive && twoOrThree;
}

// Rule 3: a live cell with more than three live neighbors dies, as if by overpopulation.
function diesByOverpopulation(alive: boolean, neighbors: number): boolean {
	return alive && neighbors > 3;
}

// Rule 4: a dead cell with exactly three live neighbors becomes a live cell, as if by reproduction.
function becomesAlive(alive: boolean, neighbors: number): boolean {
	return !alive && neighbors === 3;
}

/**
 * A Game of Life grid of `cols` by `rows` cells.
 *
 * The grid wraps around: cells on one edge are neighbors of the cells on the opposite edge.
 * A new grid starts with every cell dead.
 */
export class Life {
	/** Width of the grid in cells. */
	readonly cols: number;
	/** Height of the grid in cells. */
	readonly rows: number;

	// The current generation, one byte per cell (1 is alive, 0 is dead), stored row by row.
	private currentCells: Uint8Array;
	// Where nextGeneration writes the new grid, so every cell is decided from the same old grid.
	private nextCells: Uint8Array;
	private random: () => number;

	constructor(cols: number, rows: number, options: LifeOptions = {}) {
		this.cols = cols;
		this.rows = rows;
		this.currentCells = new Uint8Array(cols * rows);
		this.nextCells = new Uint8Array(cols * rows);
		this.random = options.random ?? Math.random;
	}

	/**
	 * Makes cells alive at `count` random positions inside `box`. Cells are only added, never killed.
	 *
	 * Two positions can land on the same cell, or on a cell that is already alive, so fewer than
	 * `count` new cells may appear. The box wraps around: the part of it that sticks out past one
	 * edge of the grid continues from the opposite edge, and it may start left of or above the grid.
	 * Does nothing on an empty grid or with an empty box.
	 */
	scatter(box: Box, count: number) {
		if (this.currentCells.length === 0) {
			return;
		}
		if (box.width <= 0 || box.height <= 0) {
			return;
		}

		for (let i = 0; i < count; i++) {
			const dx = Math.floor(this.random() * box.width);
			const dy = Math.floor(this.random() * box.height);

			// The remainder is negative for a position left of or above the grid.
			// Adding cols (or rows) and taking the remainder again brings it into the grid.
			const remainderX = (box.left + dx) % this.cols;
			const remainderY = (box.top + dy) % this.rows;
			const x = (remainderX + this.cols) % this.cols;
			const y = (remainderY + this.rows) % this.rows;

			this.currentCells[y * this.cols + x] = 1;
		}
	}

	/**
	 * Whether the cell at column `x`, row `y` is alive, counting from 0 at the top left.
	 * Positions outside the grid are dead; this method does not wrap around.
	 */
	isAlive(x: number, y: number): boolean {
		if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) {
			return false;
		}
		return this.currentCells[y * this.cols + x] === 1;
	}

	/**
	 * Makes the cell at column `x`, row `y` alive or dead.
	 * Positions outside the grid are ignored; this method does not wrap around.
	 */
	setAlive(x: number, y: number, alive: boolean) {
		if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) {
			return;
		}
		this.currentCells[y * this.cols + x] = alive ? 1 : 0;
	}

	/**
	 * Advances the grid by one generation, applying the four rules to every cell at once.
	 */
	nextGeneration() {
		if (this.currentCells.length === 0) {
			return;
		}

		for (let y = 0; y < this.rows; y++) {
			for (let x = 0; x < this.cols; x++) {
				const neighbors = this.countNeighbors(x, y);
				// Every cell is alive or dead.
				const alive = this.currentCells[y * this.cols + x] === 1;

				const underpopulated = diesByUnderpopulation(alive, neighbors);
				const survives = livesOn(alive, neighbors);
				const overpopulated = diesByOverpopulation(alive, neighbors);
				const reproduced = becomesAlive(alive, neighbors);

				// Exactly one rule applies to a live cell; a dead cell stays dead unless rule 4 applies.
				let lives = alive;
				if (underpopulated) {
					lives = false;
				}
				if (survives) {
					lives = true;
				}
				if (overpopulated) {
					lives = false;
				}
				if (reproduced) {
					lives = true;
				}

				this.nextCells[y * this.cols + x] = lives ? 1 : 0;
			}
		}

		// Swap the two grids: the old one is overwritten in full by the next call.
		const oldCells = this.currentCells;
		this.currentCells = this.nextCells;
		this.nextCells = oldCells;
	}

	// Counts the live cells among the eight neighbors of a cell, wrapping around the edges.
	private countNeighbors(x: number, y: number): number {
		// Every cell has eight neighbors: the 3x3 block around it, minus itself.
		let count = 0;
		for (let dy = -1; dy <= 1; dy++) {
			for (let dx = -1; dx <= 1; dx++) {
				if (dx === 0 && dy === 0) {
					continue;
				}
				// Adding cols (or rows) before the remainder keeps the result from going negative.
				const nx = (x + dx + this.cols) % this.cols;
				const ny = (y + dy + this.rows) % this.rows;
				if (this.currentCells[ny * this.cols + nx] === 1) {
					count++;
				}
			}
		}
		return count;
	}
}
