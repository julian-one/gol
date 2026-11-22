import { due } from './clock.js';
import type { Clock } from './clock.js';
import { Life } from './life.js';

// What the surface looks like right now, in CSS pixels. The loop asks for it
// on every frame and works out for itself what changed.
export type Measure = {
	width: number;
	height: number;
	scale: number;
	color: string;
};

// Everything a surface needs to draw one frame. Cells are exposed through
// `visible` and not as an array, so the grid stays private to the loop.
export type Frame = {
	width: number;
	height: number;
	scale: number;
	color: string;
	cell: number;
	inset: number;
	cols: number;
	rows: number;
	visible: (x: number, y: number) => boolean;
};

// The loop's only view of the outside world. Measuring, drawing and frame
// scheduling all go through it, so the loop holds every decision and can be
// run in tests with a fake surface and hand-fed timestamps.
export type Surface = {
	measure: () => Measure | undefined;
	draw: (frame: Frame) => void;
	schedule: (callback: (time: number) => void) => number;
	cancel: (id: number) => void;
};

export type State = {
	generation: number;
	population: number;
	running: boolean;
	speed: number;
	cellSize: number;
};

export type Options = {
	cellSize?: number;
	speed?: number;
	density?: number;
	gliderEvery?: number;
	inset?: number;
	running?: boolean;
	random?: () => number;
	onChange?: (state: State) => void;
};

export type Handle = {
	play: () => void;
	pause: () => void;
	step: () => void;
	setSpeed: (speed: number) => void;
	setCellSize: (cellSize: number) => void;
	destroy: () => void;
};

export const defaults = {
	cellSize: 22,
	speed: 4,
	density: 0.16,
	inset: 3
};

// A cell size or speed that is not positive would divide by zero or stop
// time. Such a value is ignored in favour of the one already in use, and
// `onChange` tells the host which value that is.
function positive(value: number | undefined, fallback: number): number {
	if (value !== undefined && value > 0) {
		return value;
	}
	return fallback;
}

export function run(surface: Surface, options: Options = {}): Handle {
	const random = options.random ?? Math.random;
	const density = options.density ?? defaults.density;
	const inset = options.inset ?? defaults.inset;

	// The world starts empty. The size of the surface is not known until the
	// first measurement, and the first `fit` grows the grid to match, seeding
	// it through the same path that handles every later resize.
	const life = new Life(0, 0, { random, gliderEvery: options.gliderEvery });
	const clock: Clock = { last: undefined };

	let cell = positive(options.cellSize, defaults.cellSize);
	let speed = positive(options.speed, defaults.speed);
	let running = options.running ?? true;

	let width = 0;
	let height = 0;
	let scale = 0;
	let color = '';
	let dirty = true;
	let destroyed = false;
	let frame = 0;

	// The one place a destroyed loop is silenced. Handle methods called after
	// `destroy` still run, but nothing they change is drawn or reported, so
	// a host holding a stale handle gets no more callbacks.
	const report = () => {
		if (destroyed || !options.onChange) {
			return;
		}
		options.onChange({
			generation: life.generation,
			population: life.population(),
			running,
			speed,
			cellSize: cell
		});
	};

	// Makes the grid exactly cover the surface and says whether it had to
	// change. Cells that no longer fit are dropped and new ground is seeded.
	const fit = (centre: boolean): boolean => {
		// Rounded up so the grid covers the whole surface. The last row and
		// column may be cut off by the edge, which looks better than a bare
		// strip.
		const cols = Math.ceil(width / cell);
		const rows = Math.ceil(height / cell);
		if (cols === life.cols && rows === life.rows) {
			return false;
		}
		// A surface that changes size keeps its top-left corner, so the world
		// stays pinned there and cells do not slide under the page. A change
		// of cell size is a zoom, and half the difference on each side keeps
		// the middle of the pattern in the middle of the surface.
		let shiftX = 0;
		let shiftY = 0;
		if (centre) {
			shiftX = Math.round((cols - life.cols) / 2);
			shiftY = Math.round((rows - life.rows) / 2);
		}
		life.resize(cols, rows, density, shiftX, shiftY);
		return true;
	};

	// Brings the world in line with the latest measurement. It runs on every
	// frame, so every branch has to do nothing when nothing changed. `dirty`
	// asks for a redraw; a grid that had to be refitted is also reported.
	const sync = (measure: Measure) => {
		// Color and pixel density do not affect the world, but what is on
		// screen is stale as soon as either changes.
		if (
			measure.width !== width ||
			measure.height !== height ||
			measure.scale !== scale ||
			measure.color !== color
		) {
			width = measure.width;
			height = measure.height;
			scale = measure.scale;
			color = measure.color;
			dirty = true;
		}

		if (fit(false)) {
			dirty = true;
			report();
		}
	};

	const draw = () => {
		surface.draw({
			width,
			height,
			scale,
			color,
			cell,
			inset,
			cols: life.cols,
			rows: life.rows,
			visible: (x, y) => {
				return life.isAlive(x, y);
			}
		});
	};

	const tick = (time: number) => {
		// The next frame is requested before anything else, so `frame` always
		// holds the pending id. If the host calls `destroy` from `onChange`
		// during this tick, it cancels the right frame. It also keeps the
		// loop going through the early return below.
		frame = surface.schedule(tick);
		const measure = surface.measure();
		// A surface with no size (hidden, or not laid out yet) is waited out.
		// Syncing to it would throw the whole world away.
		if (!measure || measure.width <= 0 || measure.height <= 0) {
			return;
		}
		sync(measure);
		if (running && due(clock, time, speed)) {
			life.step();
			dirty = true;
			report();
		}
		// Frames arrive far more often than generations. Most of them have
		// nothing new to show and skip the draw, which is the expensive part.
		if (dirty) {
			draw();
			dirty = false;
		}
	};

	// The host gets the accepted settings straight away, before any frame, so
	// its controls can show real values from the start.
	report();
	frame = surface.schedule(tick);

	// Every method reports, even when the call changed nothing. A host that
	// asked for a rejected value hears back which value is still in use.
	return {
		play: () => {
			running = true;
			report();
		},
		pause: () => {
			running = false;
			// Stops the clock, so that resuming waits a full interval. Left
			// running, the time spent paused would count as elapsed and the
			// first frame after `play` would step at once.
			clock.last = undefined;
			report();
		},
		step: () => {
			// Steps at once, so the report carries the new generation. The
			// drawing waits for the next frame like every other change.
			life.step();
			dirty = true;
			report();
		},
		setSpeed: (next: number) => {
			speed = positive(next, speed);
			report();
		},
		setCellSize: (next: number) => {
			const size = positive(next, cell);
			if (size !== cell) {
				cell = size;
				// Refitted here, from the last measured size, so the report
				// below describes the new grid. Before the first measurement
				// that size is zero and this does nothing.
				fit(true);
				dirty = true;
			}
			report();
		},
		destroy: () => {
			destroyed = true;
			surface.cancel(frame);
		}
	};
}
