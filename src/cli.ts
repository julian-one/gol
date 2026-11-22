// Entry point for `npm start`: grows a pattern from one small box on a grid sized to the terminal.
// The approach follows the animation on Google's results page for "conway's game of life".
import { Life } from './life.js';
import { Terminal } from './terminal.js';

// The grid is as large as the terminal window can show.
const terminal = new Terminal();
const size = terminal.gridSize();
const cols = size.cols;
const rows = size.rows;

// The grid starts empty. All new cells come from the box below.
const life = new Life(cols, rows);

// New cells appear in a small box centered on the seam where the left and right edges meet,
// so the pattern shows at both edges and grows inward.
const boxSize = 10;
const box = {
	left: cols - boxSize / 2,
	top: Math.floor((rows - boxSize) / 2),
	width: boxSize,
	height: boxSize
};

// The box gets a batch of random live cells at the start, then a few more before every
// generation. That steady trickle keeps the pattern from ever settling down.
const startCells = 40;
const cellsPerGeneration = 3;
let cellsToAdd = startCells;

// One generation every 100 milliseconds.
terminal.start(life, 100, () => {
	life.scatter(box, cellsToAdd);
	cellsToAdd = cellsPerGeneration;
});
