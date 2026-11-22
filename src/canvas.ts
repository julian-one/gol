import { run } from './loop.js';
import type { Frame, Handle, Measure, Options, Surface } from './loop.js';

export { defaults } from './loop.js';
export type { Handle, Options, State } from './loop.js';

// This file is the only one that touches the DOM. It adapts a canvas to the
// `Surface` the loop expects, and the loop itself stays testable without a
// browser.
export function mount(canvas: HTMLCanvasElement, options: Options = {}): Handle {
	const context = canvas.getContext('2d');
	// Null only when the canvas already has a context of another kind, which
	// is a mistake in the host page. Failing here says so; carrying on would
	// return a handle that runs a world nobody can see.
	if (!context) {
		throw new Error('gol: the canvas has no 2D context');
	}

	// Called on every frame. Everything is read fresh instead of being kept
	// up to date through resize observers and media queries: one poll
	// covers layout changes, a theme switch, and a move to a screen with a
	// different pixel density.
	const measure = (): Measure | undefined => {
		// The CSS size, not `canvas.width`: the host sizes the canvas with
		// CSS, and the backing store is derived from that in `draw`.
		const width = canvas.clientWidth;
		const height = canvas.clientHeight;
		if (!width || !height) {
			return undefined;
		}
		return {
			width,
			height,
			scale: window.devicePixelRatio || 1,
			// The host picks the cell color with CSS `color` on the canvas, so
			// the library needs no color option and follows theme changes.
			color: getComputedStyle(canvas).color
		};
	};

	const draw = (frame: Frame) => {
		// The backing store is sized in device pixels so cells stay sharp on
		// high-density screens.
		const pixelWidth = Math.round(frame.width * frame.scale);
		const pixelHeight = Math.round(frame.height * frame.scale);
		// Only on a real change: assigning `width` or `height` reallocates
		// the bitmap and resets the context, even when the value is the same.
		if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
			canvas.width = pixelWidth;
			canvas.height = pixelHeight;
		}
		// Coordinates are scaled by hand instead of with `context.scale`,
		// because the resize above would reset a transform set on the context.
		const size = frame.cell * frame.scale;
		const gap = frame.inset * frame.scale;
		context.clearRect(0, 0, canvas.width, canvas.height);
		// Set on every draw, since a resize resets it along with the rest of
		// the context state.
		context.fillStyle = frame.color;
		// All cells go into one path that is filled once. A fill per cell
		// would cost thousands of draw calls on a large canvas.
		context.beginPath();
		for (let y = 0; y < frame.rows; y++) {
			for (let x = 0; x < frame.cols; x++) {
				if (!frame.visible(x, y)) {
					continue;
				}
				context.roundRect(x * size + gap, y * size + gap, size - gap * 2, size - gap * 2, gap);
			}
		}
		context.fill();
	};

	const surface: Surface = {
		measure,
		draw,
		// Wrapped, not passed as they are: called as methods of this object
		// they would lose `window` as their receiver and throw.
		schedule: (callback) => {
			return requestAnimationFrame(callback);
		},
		cancel: (id) => {
			cancelAnimationFrame(id);
		}
	};

	return run(surface, options);
}
