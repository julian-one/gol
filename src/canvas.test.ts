import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Canvas } from './canvas.js';
import { Grid } from './grid.js';

type Square = {
	x: number;
	y: number;
	width: number;
	height: number;
	opacity: number;
};

// Tests run in Node, where there is no canvas. These stand in for the element and its 2D
// context, and record every square that is drawn, with the opacity it is drawn at.
let squares: Square[];
let context: { fillStyle: string; globalAlpha: number };
let fake: { clientWidth: number; clientHeight: number; width: number; height: number };
let element: HTMLCanvasElement;

beforeEach(() => {
	squares = [];
	context = {
		fillStyle: '',
		globalAlpha: 1,
		clearRect: () => {},
		beginPath: () => {},
		fill: () => {},
		rect: (x: number, y: number, width: number, height: number) => {
			squares.push({ x: x, y: y, width: width, height: height, opacity: context.globalAlpha });
		}
	} as { fillStyle: string; globalAlpha: number };
	fake = {
		clientWidth: 100,
		clientHeight: 50,
		width: 0,
		height: 0,
		getContext: () => {
			return context;
		}
	} as { clientWidth: number; clientHeight: number; width: number; height: number };
	element = fake as unknown as HTMLCanvasElement;

	vi.stubGlobal('devicePixelRatio', 1);
	vi.stubGlobal('getComputedStyle', () => {
		return { color: 'rgb(1, 2, 3)' };
	});
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('gridSize', () => {
	it('covers the canvas, rounding up', () => {
		const canvas = new Canvas(element, 20);

		const size = canvas.gridSize();

		// 100 pixels of 20 across; 50 pixels of 20 down is 2.5, so a third row is cut off.
		expect(size.cols).toBe(5);
		expect(size.rows).toBe(3);
	});

	it('follows a new cell size', () => {
		const canvas = new Canvas(element, 20);

		canvas.cellSize = 10;
		const size = canvas.gridSize();

		expect(size.cols).toBe(10);
		expect(size.rows).toBe(5);
	});
});

describe('draw', () => {
	it('draws each live cell as a faint border with a square inside it', () => {
		const grid = new Grid(5, 3);
		grid.setAlive(1, 0, true);
		grid.setAlive(4, 2, true);
		const canvas = new Canvas(element, 20);

		canvas.draw(grid);

		// The borders come first: each fills its whole 20 pixel cell. Then the squares, which sit
		// half a pixel inside their cell, so they are 19 wide.
		expect(squares).toEqual([
			{ x: 20, y: 0, width: 20, height: 20, opacity: 0.6 },
			{ x: 80, y: 40, width: 20, height: 20, opacity: 0.6 },
			{ x: 20.5, y: 0.5, width: 19, height: 19, opacity: 1 },
			{ x: 80.5, y: 40.5, width: 19, height: 19, opacity: 1 }
		]);
	});

	it('draws in device pixels on a high-density screen', () => {
		vi.stubGlobal('devicePixelRatio', 2);
		const grid = new Grid(5, 3);
		grid.setAlive(1, 0, true);
		const canvas = new Canvas(element, 20);

		canvas.draw(grid);

		expect(fake.width).toBe(200);
		expect(fake.height).toBe(100);
		expect(squares).toEqual([
			{ x: 40, y: 0, width: 40, height: 40, opacity: 0.6 },
			{ x: 41, y: 1, width: 38, height: 38, opacity: 1 }
		]);
	});

	it('takes the cell color from the CSS color of the canvas', () => {
		const grid = new Grid(5, 3);
		const canvas = new Canvas(element, 20);

		canvas.draw(grid);

		expect(context.fillStyle).toBe('rgb(1, 2, 3)');
	});

	it('draws nothing for an empty grid', () => {
		const grid = new Grid(0, 0);
		const canvas = new Canvas(element, 20);

		canvas.draw(grid);

		expect(squares).toEqual([]);
	});
});
