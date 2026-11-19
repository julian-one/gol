export type LifeOptions = {
	gliderEvery?: number;
	random?: () => number;
};

const glider: [number, number][] = [
	[0, 0],
	[1, 0],
	[2, 0],
	[2, 1],
	[1, 2]
];

export class Life {
	readonly cols: number;
	readonly rows: number;

	private cells: Uint8Array;
	private scratch: Uint8Array;
	private generation = 0;
	private gliderEvery: number | undefined;
	private random: () => number;

	constructor(cols: number, rows: number, options: LifeOptions = {}) {
		this.cols = cols;
		this.rows = rows;
		this.cells = new Uint8Array(cols * rows);
		this.scratch = new Uint8Array(cols * rows);
		this.gliderEvery = options.gliderEvery;
		this.random = options.random ?? Math.random;
	}

	randomize(density: number) {
		for (let i = 0; i < this.cells.length; i++) {
			this.cells[i] = this.random() < density ? 1 : 0;
		}
	}

	isAlive(x: number, y: number): boolean {
		if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) {
			return false;
		}
		return this.cells[y * this.cols + x] === 1;
	}

	setAlive(x: number, y: number, alive: boolean) {
		if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) {
			return;
		}
		this.cells[y * this.cols + x] = alive ? 1 : 0;
	}

	step() {
		if (this.cells.length === 0) {
			return;
		}

		for (let y = 0; y < this.rows; y++) {
			for (let x = 0; x < this.cols; x++) {
				const neighbors = this.countNeighbors(x, y);
				const alive = this.cells[y * this.cols + x] === 1;

				let lives: boolean;
				if (alive) {
					lives = neighbors === 2 || neighbors === 3;
				} else {
					lives = neighbors === 3;
				}

				this.scratch[y * this.cols + x] = lives ? 1 : 0;
			}
		}

		const previous = this.cells;
		this.cells = this.scratch;
		this.scratch = previous;

		this.generation++;
		if (this.gliderEvery && this.generation % this.gliderEvery === 0) {
			this.spawnGlider();
		}
	}

	private countNeighbors(x: number, y: number): number {
		let count = 0;
		for (let dy = -1; dy <= 1; dy++) {
			for (let dx = -1; dx <= 1; dx++) {
				if (dx === 0 && dy === 0) {
					continue;
				}
				const nx = (x + dx + this.cols) % this.cols;
				const ny = (y + dy + this.rows) % this.rows;
				if (this.cells[ny * this.cols + nx] === 1) {
					count++;
				}
			}
		}
		return count;
	}

	private spawnGlider() {
		const x = Math.floor(this.random() * this.cols);
		const y = Math.floor(this.random() * this.rows);
		for (const [dx, dy] of glider) {
			const gx = (x + dx) % this.cols;
			const gy = (y + dy) % this.rows;
			this.cells[gy * this.cols + gx] = 1;
		}
	}
}
