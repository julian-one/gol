import { describe, expect, it } from 'vitest';
import { run } from './loop.js';
import type { Frame, Options, State, Surface } from './loop.js';

type Bench = {
	surface: Surface;
	size: { width: number; height: number; scale: number; color: string };
	frames: Frame[];
	states: State[];
	draw: number;
	pending: ((time: number) => void) | undefined;
	cancelled: boolean;
	next: number;
};

function bench(): Bench {
	const made: Bench = {
		size: { width: 100, height: 100, scale: 1, color: 'red' },
		frames: [],
		states: [],
		draw: 1,
		pending: undefined,
		cancelled: false,
		next: 0,
		surface: {
			measure: () => {
				if (!made.size.width || !made.size.height) {
					return undefined;
				}
				return {
					width: made.size.width,
					height: made.size.height,
					scale: made.size.scale,
					color: made.size.color
				};
			},
			draw: (frame) => {
				made.frames.push(frame);
			},
			schedule: (callback) => {
				made.pending = callback;
				made.next++;
				return made.next;
			},
			cancel: () => {
				made.pending = undefined;
				made.cancelled = true;
			}
		}
	};
	return made;
}

function start(made: Bench, options: Options = {}) {
	return run(made.surface, {
		cellSize: 10,
		random: () => {
			return made.draw;
		},
		onChange: (state) => {
			made.states.push(state);
		},
		...options
	});
}

function advance(made: Bench, time: number) {
	const callback = made.pending;
	if (callback) {
		callback(time);
	}
}

function latest(made: Bench): State {
	const state = made.states[made.states.length - 1];
	if (!state) {
		throw new Error('no state reported');
	}
	return state;
}

function last(made: Bench): Frame {
	const frame = made.frames[made.frames.length - 1];
	if (!frame) {
		throw new Error('nothing drawn');
	}
	return frame;
}

describe('first frame', () => {
	it('reports the accepted settings before any frame', () => {
		const made = bench();

		start(made, { speed: 8, running: false });

		expect(latest(made)).toEqual({
			generation: 0,
			population: 0,
			running: false,
			speed: 8,
			cellSize: 10
		});
	});

	it('falls back to the defaults for settings that make no sense', () => {
		const made = bench();

		start(made, { speed: 0, cellSize: -4 });

		expect(latest(made).speed).toBe(4);
		expect(latest(made).cellSize).toBe(22);
	});

	it('covers the surface, rounding up, and draws once', () => {
		const made = bench();
		made.size.width = 95;
		made.size.height = 41;
		made.draw = 0;

		start(made);
		advance(made, 1000);

		expect(made.frames.length).toBe(1);
		expect(last(made).cols).toBe(10);
		expect(last(made).rows).toBe(5);
		expect(latest(made).population).toBe(50);
		expect(latest(made).generation).toBe(0);
	});

	it('waits while the surface has no size', () => {
		const made = bench();
		made.size.width = 0;

		start(made);
		advance(made, 1000);

		expect(made.frames.length).toBe(0);

		made.size.width = 100;
		advance(made, 1016);

		expect(made.frames.length).toBe(1);
	});
});

describe('cadence', () => {
	it('steps once per interval, not on the first frame', () => {
		const made = bench();

		start(made, { speed: 4 });
		advance(made, 1000);
		expect(latest(made).generation).toBe(0);

		advance(made, 1200);
		expect(latest(made).generation).toBe(0);

		advance(made, 1250);
		expect(latest(made).generation).toBe(1);

		advance(made, 1500);
		expect(latest(made).generation).toBe(2);
	});

	it('follows a new speed', () => {
		const made = bench();
		const handle = start(made, { speed: 1 });
		advance(made, 1000);

		handle.setSpeed(10);
		advance(made, 1100);

		expect(latest(made).speed).toBe(10);
		expect(latest(made).generation).toBe(1);
	});

	it('keeps the speed when given one that makes no sense', () => {
		const made = bench();
		const handle = start(made, { speed: 4 });

		handle.setSpeed(0);

		expect(latest(made).speed).toBe(4);
	});
});

describe('pause, step and play', () => {
	it('holds while paused', () => {
		const made = bench();
		const handle = start(made, { speed: 4 });
		advance(made, 1000);

		handle.pause();
		advance(made, 5000);

		expect(latest(made).running).toBe(false);
		expect(latest(made).generation).toBe(0);
	});

	it('steps once on request and redraws on the next frame', () => {
		const made = bench();
		const handle = start(made, { running: false });
		advance(made, 1000);
		const drawn = made.frames.length;

		handle.step();
		expect(latest(made).generation).toBe(1);

		advance(made, 1016);
		expect(made.frames.length).toBe(drawn + 1);
	});

	it('waits a full interval after play', () => {
		const made = bench();
		const handle = start(made, { speed: 4, running: false });
		advance(made, 1000);

		handle.play();
		advance(made, 9000);
		expect(latest(made).running).toBe(true);
		expect(latest(made).generation).toBe(0);

		advance(made, 9250);
		expect(latest(made).generation).toBe(1);
	});
});

describe('drawing', () => {
	it('draws only when something changed', () => {
		const made = bench();
		start(made, { running: false });
		advance(made, 1000);
		advance(made, 1016);
		advance(made, 1032);

		expect(made.frames.length).toBe(1);
	});

	it('redraws when the color or the pixel density changes', () => {
		const made = bench();
		start(made, { running: false });
		advance(made, 1000);

		made.size.color = 'blue';
		advance(made, 1016);
		expect(made.frames.length).toBe(2);
		expect(last(made).color).toBe('blue');

		made.size.scale = 2;
		advance(made, 1032);
		expect(made.frames.length).toBe(3);
		expect(last(made).scale).toBe(2);
	});
});

describe('resizing the surface', () => {
	it('keeps the generation and seeds the new cells', () => {
		const made = bench();
		const handle = start(made, { running: false });
		advance(made, 1000);
		handle.step();
		handle.step();

		made.draw = 0;
		made.size.width = 200;
		advance(made, 1016);

		expect(latest(made).generation).toBe(2);
		expect(last(made).cols).toBe(20);
		expect(last(made).visible(0, 0)).toBe(false);
		expect(last(made).visible(15, 5)).toBe(true);
		expect(latest(made).population).toBe(100);
	});

	it('drops the cells past the edge when narrowing', () => {
		const made = bench();
		made.draw = 0;
		start(made, { running: false });
		advance(made, 1000);

		made.draw = 1;
		made.size.width = 50;
		advance(made, 1016);
		expect(last(made).cols).toBe(5);
		expect(latest(made).population).toBe(50);

		made.size.width = 100;
		advance(made, 1032);
		expect(last(made).cols).toBe(10);
		expect(last(made).visible(4, 9)).toBe(true);
		expect(last(made).visible(9, 9)).toBe(false);
		expect(latest(made).population).toBe(50);
	});
});

describe('changing the cell size', () => {
	it('keeps the generation and the pattern, centred', () => {
		const made = bench();
		made.draw = 0;
		const handle = start(made, { running: false });
		advance(made, 1000);
		handle.step();

		made.draw = 1;
		handle.setCellSize(5);
		advance(made, 1016);

		expect(latest(made).cellSize).toBe(5);
		expect(latest(made).generation).toBe(1);
		expect(last(made).cols).toBe(20);
		expect(last(made).cell).toBe(5);
	});

	it('centres the old world in the new grid', () => {
		const made = bench();
		made.draw = 0;
		const handle = start(made, { running: false });
		advance(made, 1000);

		made.draw = 1;
		handle.setCellSize(5);
		advance(made, 1016);

		expect(last(made).visible(5, 5)).toBe(true);
		expect(last(made).visible(14, 14)).toBe(true);
		expect(last(made).visible(4, 4)).toBe(false);
		expect(last(made).visible(15, 15)).toBe(false);
		expect(latest(made).population).toBe(100);
	});

	it('ignores a size that makes no sense', () => {
		const made = bench();
		const handle = start(made, { running: false });
		advance(made, 1000);

		handle.setCellSize(0);
		advance(made, 1016);

		expect(latest(made).cellSize).toBe(10);
		expect(last(made).cols).toBe(10);
	});
});

describe('destroy', () => {
	it('stops the loop and ignores later calls', () => {
		const made = bench();
		const handle = start(made, { running: false });
		advance(made, 1000);
		const reports = made.states.length;

		handle.destroy();
		handle.step();
		handle.play();
		handle.setSpeed(9);

		expect(made.cancelled).toBe(true);
		expect(made.pending).toBe(undefined);
		expect(made.states.length).toBe(reports);
	});
});
