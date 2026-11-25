# gol

Conway's Game of Life, animated in the terminal or on a canvas.

## In the terminal

```sh
npx @julianone/gol
```

Fills the terminal window with the animation. Needs Node.js 26 or later.

## In the browser

```sh
npm install @julianone/gol
```

```ts
import { Canvas, Simulation } from '@julianone/gol';

const element = document.querySelector('canvas');
if (element) {
	// Cells are 12 CSS pixels wide and tall, and take the CSS `color` of the canvas element.
	const canvas = new Canvas(element, 12);
	const simulation = new Simulation(canvas);

	// One generation every 100 milliseconds, until `simulation.stop()`.
	simulation.start(100);
}
```

## Your own grid

`Grid` is the game itself, without a display or a timer:

```ts
import { Grid } from '@julianone/gol';

const grid = new Grid(40, 20);

// A blinker: three live cells in a row.
grid.setAlive(1, 2, true);
grid.setAlive(2, 2, true);
grid.setAlive(3, 2, true);

grid.nextGeneration();

grid.isAlive(2, 1); // true: the row became a column
grid.population(); // 3
```

The grid wraps around: cells on one edge are neighbors of the cells on the opposite edge.

To show a simulation somewhere else, pass `Simulation` any object with the two methods of the
`Display` type: `gridSize()` and `draw(grid)`.

## Rules

Every cell is alive or dead and has eight neighbors. Each generation:

1. A live cell with fewer than two live neighbors dies, as if by underpopulation.
2. A live cell with two or three live neighbors lives on to the next generation.
3. A live cell with more than three live neighbors dies, as if by overpopulation.
4. A dead cell with exactly three live neighbors becomes a live cell, as if by reproduction.

