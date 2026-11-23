import { Grid } from './grid.js';
import type { GridOptions, GridSize, Region } from './grid.js';

/** Where a simulation shows its generations, for example a `Terminal` or a `Canvas`. */
export type Display = {
	/** The size of the grid that fills the display. */
	gridSize(): GridSize;
	/** Shows the current generation of `grid`, replacing whatever was shown before. */
	draw(grid: Grid): void;
};

// New cells appear in a square seed region this many cells wide and tall.
const seedRegionSize = 10;

// The seed region gets a batch of random live cells at the start, then a few more before every
// generation. That steady trickle keeps the pattern from ever settling down.
const seedCells = 40;
const cellsPerGeneration = 3;

/**
 * Grows a pattern from one small seed region on a grid sized to a display, and shows it there
 * generation after generation.
 *
 * The grid starts empty. All new cells come from a region centered on the line where the left and
 * right edges of the grid meet, so the pattern shows at both edges and grows inward. The approach
 * follows the animation on Google's results page for "conway's game of life".
 */
export class Simulation {
	private display: Display;
	private grid: Grid;
	private seedRegion: Region;
	private cellsToAdd: number;
	private timer: ReturnType<typeof setInterval> | undefined;

	/**
	 * Makes an empty grid as large as `display` can show. The size is read once, here; resizing
	 * the display later does not change the grid. `options` are passed on to the grid.
	 */
	constructor(display: Display, options: GridOptions = {}) {
		const size = display.gridSize();

		this.display = display;
		this.grid = new Grid(size.cols, size.rows, options);
		this.seedRegion = {
			col: size.cols - seedRegionSize / 2,
			row: Math.floor((size.rows - seedRegionSize) / 2),
			cols: seedRegionSize,
			rows: seedRegionSize
		};
		this.cellsToAdd = seedCells;
		this.timer = undefined;
	}

	/**
	 * Starts the simulation: every `intervalMs` milliseconds it draws the grid on the display,
	 * scatters new cells into the seed region, and then advances one generation. The first drawing
	 * shows the empty grid. Runs until `stop`; does nothing when already running.
	 */
	start(intervalMs: number) {
		if (this.timer !== undefined) {
			return;
		}

		this.timer = setInterval(() => {
			this.display.draw(this.grid);
			this.grid.scatter(this.seedRegion, this.cellsToAdd);
			this.cellsToAdd = cellsPerGeneration;
			this.grid.nextGeneration();
		}, intervalMs);
	}

	/**
	 * Stops the simulation. The display keeps showing the last grid that was drawn, and `start`
	 * continues from where it stopped.
	 */
	stop() {
		if (this.timer === undefined) {
			return;
		}

		clearInterval(this.timer);
		this.timer = undefined;
	}
}
