export type LifeOptions = {
	// `| undefined` lets a caller pass its own optional setting straight
	// through under exactOptionalPropertyTypes.
	gliderEvery?: number | undefined;
	// Injectable so tests can make seeding and glider placement deterministic.
	random?: () => number;
};

// Offsets are all zero or positive, so placing a glider only ever has to wrap
// past the right and bottom edges.
const glider: [number, number][] = [
	[0, 0],
	[1, 0],
	[2, 0],
	[2, 1],
	[1, 2]
];

export class Life {
	// Private with getters below: the size and the generation are readable
	// from outside but only change through `resize` and `step`.
	private width: number;
	private height: number;
	// One byte per cell in a flat typed array: the step visits every cell and
	// its eight neighbors, and this keeps that loop on contiguous memory.
	private cells: Uint8Array;
	// A generation must be computed from the previous one as a whole, so the
	// results cannot be written into `cells` while it is still being read.
	// The second buffer is kept and swapped in, so a step allocates nothing.
	private scratch: Uint8Array;
	private ticks = 0;
	private gliderEvery: number | undefined;
	private random: () => number;

	constructor(cols: number, rows: number, options: LifeOptions = {}) {
		this.width = cols;
		this.height = rows;
		this.cells = new Uint8Array(cols * rows);
		this.scratch = new Uint8Array(cols * rows);
		this.gliderEvery = options.gliderEvery;
		this.random = options.random ?? Math.random;
	}

	get cols(): number {
		return this.width;
	}

	get rows(): number {
		return this.height;
	}

	get generation(): number {
		return this.ticks;
	}

	population(): number {
		let count = 0;
		for (let i = 0; i < this.cells.length; i++) {
			if (this.cells[i] === 1) {
				count++;
			}
		}
		return count;
	}

	randomize(density: number) {
		for (let i = 0; i < this.cells.length; i++) {
			this.cells[i] = this.random() < density ? 1 : 0;
		}
	}

	// Resizing keeps the world instead of starting a new one. The generation
	// count is untouched, and a cell survives if its old position, moved by
	// the shift, still falls inside the new grid. The shift lets the caller
	// say where the old grid sits in the new one (centred, for example)
	// instead of always pinning it to the top-left corner.
	resize(cols: number, rows: number, density = 0, shiftX = 0, shiftY = 0) {
		const cells = new Uint8Array(cols * rows);
		for (let y = 0; y < rows; y++) {
			for (let x = 0; x < cols; x++) {
				let alive: boolean;
				if (this.inside(x - shiftX, y - shiftY)) {
					alive = this.cells[(y - shiftY) * this.width + (x - shiftX)] === 1;
				} else {
					// Newly exposed ground is seeded at the given density, so a
					// grid that grows does not gain a dead border that the old
					// pattern would take a long time to colonise, if it ever did.
					alive = density > 0 && this.random() < density;
				}
				cells[y * cols + x] = alive ? 1 : 0;
			}
		}
		this.width = cols;
		this.height = rows;
		this.cells = cells;
		// The old scratch buffer has the old dimensions. Its contents never
		// matter, since every step overwrites all of it.
		this.scratch = new Uint8Array(cols * rows);
	}

	// Reads and writes outside the grid are answered, not thrown: callers such
	// as the ring seeder work on rectangles that may overhang the edge.
	// Unlike the neighbor count, these do not wrap. A caller naming a cell
	// off the grid means that cell, not the one on the opposite side.
	isAlive(x: number, y: number): boolean {
		return this.inside(x, y) && this.cells[y * this.width + x] === 1;
	}

	setAlive(x: number, y: number, alive: boolean) {
		if (this.inside(x, y)) {
			this.cells[y * this.width + x] = alive ? 1 : 0;
		}
	}

	step() {
		// An empty grid has nothing to compute, and it must not count
		// generations or spawn gliders: the glider placement would take a
		// modulo by zero. This is the state of a world whose surface has not
		// been measured yet.
		if (this.cells.length === 0) {
			return;
		}

		for (let y = 0; y < this.height; y++) {
			for (let x = 0; x < this.width; x++) {
				const neighbors = this.countNeighbors(x, y);
				const alive = this.cells[y * this.width + x] === 1;
				// Three neighbors give life either way; two only keep it.
				const lives = neighbors === 3 || (alive && neighbors === 2);
				this.scratch[y * this.width + x] = lives ? 1 : 0;
			}
		}

		const previous = this.cells;
		this.cells = this.scratch;
		this.scratch = previous;

		this.ticks++;
		// A closed world left alone settles into still lifes and blinkers. A
		// glider dropped in every so often collides with that debris and keeps
		// the picture moving. The truthiness test also treats 0 as "off",
		// which avoids a modulo by zero.
		if (this.gliderEvery && this.ticks % this.gliderEvery === 0) {
			this.spawnGlider();
		}
	}

	// Without this check an x past the last column would index into the next
	// row instead of missing the grid.
	private inside(x: number, y: number): boolean {
		return x >= 0 && y >= 0 && x < this.width && y < this.height;
	}

	private countNeighbors(x: number, y: number): number {
		let count = 0;
		for (let dy = -1; dy <= 1; dy++) {
			for (let dx = -1; dx <= 1; dx++) {
				if (dx === 0 && dy === 0) {
					continue;
				}
				// The grid wraps around. With hard edges, border cells would
				// have fewer neighbors and gliders would crash into the wall
				// and leave debris there. Adding the size before the modulo
				// keeps the result positive when the offset is -1.
				const nx = (x + dx + this.width) % this.width;
				const ny = (y + dy + this.height) % this.height;
				if (this.cells[ny * this.width + nx] === 1) {
					count++;
				}
			}
		}
		return count;
	}

	// Called after the buffers are swapped, so the glider is written into the
	// generation just computed and is whole when it is first seen. It is laid
	// over whatever is there and only sets cells alive, so it may land in a
	// crowd and not survive. That is accepted: another one follows.
	private spawnGlider() {
		const x = Math.floor(this.random() * this.width);
		const y = Math.floor(this.random() * this.height);
		for (const [dx, dy] of glider) {
			const gx = (x + dx) % this.width;
			const gy = (y + dy) % this.height;
			this.cells[gy * this.width + gx] = 1;
		}
	}
}
