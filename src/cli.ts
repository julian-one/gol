// Entry point for `npm start`: shows the simulation in the terminal, on a grid as large as the
// terminal window can show.
import { Simulation } from './simulation.js';
import { Terminal } from './terminal.js';

const terminal = new Terminal();
const simulation = new Simulation(terminal);

terminal.open();

// One generation every 100 milliseconds.
simulation.start(100);
