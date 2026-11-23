import type { Grid, GridSize } from './grid.js';

// The width in CSS pixels of the border along each side of a cell's square. Two live cells
// side by side each bring their own border, so the line between them is twice as wide.
const border = 0.5;

// How strongly the border is drawn, from 0 (invisible) to 1 (the same as the square itself).
const borderOpacity = 0.6;

/**
 * Draws a `Grid` on a `<canvas>` element, one square per live cell.
 *
 * The squares have sharp corners and fill their cell, so live cells side by side join into one
 * block, divided by faint lines. The look follows the animation on Google's results page for
 * "conway's game of life".
 */
export class Canvas {
	/**
	 * Width and height of one cell in CSS pixels. Change it to draw larger or smaller cells;
	 * `gridSize` follows, so a grid made for the old size no longer covers the canvas exactly.
	 */
	cellSize: number;

	private element: HTMLCanvasElement;

	constructor(element: HTMLCanvasElement, cellSize: number) {
		this.element = element;
		this.cellSize = cellSize;
	}

	/**
	 * The size of the smallest grid that covers the whole canvas.
	 *
	 * A canvas of 100 by 50 CSS pixels with cells of 20 fits 5 by 3 cells: the last row is cut off
	 * by the edge, which looks better than a bare strip. The size is read when this is called;
	 * resizing the canvas later does not change a grid that was already made.
	 */
	gridSize(): GridSize {
		const cols = Math.ceil(this.element.clientWidth / this.cellSize);
		const rows = Math.ceil(this.element.clientHeight / this.cellSize);
		return { cols: cols, rows: rows };
	}

	/**
	 * Draws the current generation of `grid`, replacing whatever the canvas showed before.
	 *
	 * The cells take the CSS `color` of the canvas element, so they follow the page's theme.
	 * The border of each cell is the same color, drawn fainter.
	 */
	draw(grid: Grid) {
		const context = this.element.getContext('2d');
		if (!context) {
			return;
		}

		// The canvas bitmap is sized in device pixels, so cells stay sharp on high-density screens.
		// Assigning width or height clears the bitmap even when the value is the same, so only
		// assign on a real change.
		const scale = devicePixelRatio;
		const pixelWidth = Math.round(this.element.clientWidth * scale);
		const pixelHeight = Math.round(this.element.clientHeight * scale);
		if (this.element.width !== pixelWidth) {
			this.element.width = pixelWidth;
		}
		if (this.element.height !== pixelHeight) {
			this.element.height = pixelHeight;
		}

		const size = this.cellSize * scale;
		const edge = border * scale;
		const side = size - edge * 2;

		context.clearRect(0, 0, this.element.width, this.element.height);
		context.fillStyle = getComputedStyle(this.element).color;

		// First the borders: every live cell is filled whole, but faintly. All cells go into one
		// path that is filled once, instead of one fill per cell.
		context.globalAlpha = borderOpacity;
		context.beginPath();
		for (let row = 0; row < grid.rows; row++) {
			for (let col = 0; col < grid.cols; col++) {
				if (grid.isAlive(col, row)) {
					context.rect(col * size, row * size, size, size);
				}
			}
		}
		context.fill();

		// Then the squares at full strength, each a little smaller than its cell, which leaves the
		// faint fill showing around it as the border.
		context.globalAlpha = 1;
		context.beginPath();
		for (let row = 0; row < grid.rows; row++) {
			for (let col = 0; col < grid.cols; col++) {
				if (grid.isAlive(col, row)) {
					context.rect(col * size + edge, row * size + edge, side, side);
				}
			}
		}
		context.fill();
	}
}
