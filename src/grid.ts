export type GridOptions = {
	/**
	 * Source of random numbers from 0 (inclusive) to 1 (exclusive), used by `scatter`.
	 * Defaults to `Math.random`. Pass your own to get a repeatable grid, for example in tests.
	 */
	random?: () => number;
};

/**
 * A rectangle of cells: `cols` by `rows` cells, with its top left cell at column `col`,
 * row `row`. All four are whole numbers.
 */
export type Region = {
	col: number;
	row: number;
	cols: number;
	rows: number;
};

/** The size of a grid in cells. */
export type GridSize = {
	cols: number;
	rows: number;
};

// Rule 1: a live cell with fewer than two live neighbors dies, as if by underpopulation.
function diesByUnderpopulation(alive: boolean, liveNeighbors: number): boolean {
	return alive && liveNeighbors < 2;
}

// Rule 2: a live cell with two or three live neighbors lives on to the next generation.
function livesOn(alive: boolean, liveNeighbors: number): boolean {
	const twoOrThree = liveNeighbors === 2 || liveNeighbors === 3;
	return alive && twoOrThree;
}

// Rule 3: a live cell with more than three live neighbors dies, as if by overpopulation.
function diesByOverpopulation(alive: boolean, liveNeighbors: number): boolean {
	return alive && liveNeighbors > 3;
}

// Rule 4: a dead cell with exactly three live neighbors becomes a live cell, as if by reproduction.
function becomesAlive(alive: boolean, liveNeighbors: number): boolean {
	return !alive && liveNeighbors === 3;
}

/**
 * A Game of Life grid of `cols` by `rows` cells.
 *
 * The grid wraps around: cells on one edge are neighbors of the cells on the opposite edge.
 * A new grid starts with every cell dead.
 */
export class Grid {
	/** Width of the grid in cells. */
	readonly cols: number;
	/** Height of the grid in cells. */
	readonly rows: number;

	// The current generation, one byte per cell (1 is alive, 0 is dead), stored row by row.
	private currentCells: Uint8Array;
	// Where nextGeneration writes the new grid, so every cell is decided from the same old grid.
	private nextCells: Uint8Array;
	private random: () => number;

	constructor(cols: number, rows: number, options: GridOptions = {}) {
		this.cols = cols;
		this.rows = rows;
		this.currentCells = new Uint8Array(cols * rows);
		this.nextCells = new Uint8Array(cols * rows);
		this.random = options.random ?? Math.random;
	}

	/**
	 * Makes cells alive at `count` random positions inside `region`. Cells are only added, never
	 * killed.
	 *
	 * Two positions can land on the same cell, or on a cell that is already alive, so fewer than
	 * `count` new cells may appear. The region wraps around: the part of it that sticks out past
	 * one edge of the grid continues from the opposite edge, and it may start left of or above the
	 * grid. Does nothing on an empty grid or with an empty region.
	 */
	scatter(region: Region, count: number) {
		if (this.currentCells.length === 0) {
			return;
		}
		if (region.cols <= 0 || region.rows <= 0) {
			return;
		}

		for (let i = 0; i < count; i++) {
			const colOffset = Math.floor(this.random() * region.cols);
			const rowOffset = Math.floor(this.random() * region.rows);

			// The remainder is negative for a position left of or above the grid.
			// Adding cols (or rows) and taking the remainder again brings it into the grid.
			const remainderCol = (region.col + colOffset) % this.cols;
			const remainderRow = (region.row + rowOffset) % this.rows;
			const col = (remainderCol + this.cols) % this.cols;
			const row = (remainderRow + this.rows) % this.rows;

			this.currentCells[row * this.cols + col] = 1;
		}
	}

	/**
	 * Whether the cell at column `col`, row `row` is alive, counting from 0 at the top left.
	 * Positions outside the grid are dead; this method does not wrap around.
	 */
	isAlive(col: number, row: number): boolean {
		if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) {
			return false;
		}
		return this.currentCells[row * this.cols + col] === 1;
	}

	/**
	 * Makes the cell at column `col`, row `row` alive or dead.
	 * Positions outside the grid are ignored; this method does not wrap around.
	 */
	setAlive(col: number, row: number, alive: boolean) {
		if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) {
			return;
		}
		this.currentCells[row * this.cols + col] = alive ? 1 : 0;
	}

	/**
	 * The number of live cells in the grid.
	 */
	population(): number {
		let count = 0;
		for (let i = 0; i < this.currentCells.length; i++) {
			if (this.currentCells[i] === 1) {
				count++;
			}
		}
		return count;
	}

	/**
	 * Advances the grid by one generation, applying the four rules to every cell at once.
	 */
	nextGeneration() {
		if (this.currentCells.length === 0) {
			return;
		}

		for (let row = 0; row < this.rows; row++) {
			for (let col = 0; col < this.cols; col++) {
				const liveNeighbors = this.countLiveNeighbors(col, row);
				// Every cell is alive or dead.
				const alive = this.currentCells[row * this.cols + col] === 1;

				const underpopulated = diesByUnderpopulation(alive, liveNeighbors);
				const survives = livesOn(alive, liveNeighbors);
				const overpopulated = diesByOverpopulation(alive, liveNeighbors);
				const reproduced = becomesAlive(alive, liveNeighbors);

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

				this.nextCells[row * this.cols + col] = lives ? 1 : 0;
			}
		}

		// Swap the two grids: the old one is overwritten in full by the next call.
		const oldCells = this.currentCells;
		this.currentCells = this.nextCells;
		this.nextCells = oldCells;
	}

	// Counts the live cells among the eight neighbors of a cell, wrapping around the edges.
	private countLiveNeighbors(col: number, row: number): number {
		// Every cell has eight neighbors: the 3x3 block around it, minus itself.
		let count = 0;
		for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
			for (let colOffset = -1; colOffset <= 1; colOffset++) {
				if (colOffset === 0 && rowOffset === 0) {
					continue;
				}
				// Adding cols (or rows) before the remainder keeps the result from going negative.
				const neighborCol = (col + colOffset + this.cols) % this.cols;
				const neighborRow = (row + rowOffset + this.rows) % this.rows;
				if (this.currentCells[neighborRow * this.cols + neighborCol] === 1) {
					count++;
				}
			}
		}
		return count;
	}
}
