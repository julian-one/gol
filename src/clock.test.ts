import { describe, expect, it } from 'vitest';
import { due } from './clock.js';

describe('due', () => {
	it('waits out the interval', () => {
		const clock = { last: 1000 };

		expect(due(clock, 1100, 4)).toBe(false);
		expect(due(clock, 1249, 4)).toBe(false);
		expect(due(clock, 1250, 4)).toBe(true);
	});

	it('holds the cadence when frames land late', () => {
		const clock = { last: 1000 };
		let steps = 0;

		for (let time = 1000; time <= 3000; time += 16) {
			if (due(clock, time, 20)) {
				steps++;
			}
		}

		expect(steps).toBe(40);
	});

	it('does not catch up after a long gap', () => {
		const clock = { last: 1000 };

		expect(due(clock, 60000, 4)).toBe(true);
		expect(due(clock, 60016, 4)).toBe(false);
		expect(clock.last).toBe(60000);
	});

	it('starts counting from the first frame it sees', () => {
		const clock: { last: number | undefined } = { last: undefined };

		expect(due(clock, 5000, 4)).toBe(false);
		expect(clock.last).toBe(5000);
		expect(due(clock, 5249, 4)).toBe(false);
		expect(due(clock, 5250, 4)).toBe(true);
	});

	it('never fires without a speed', () => {
		const clock = { last: 0 };

		expect(due(clock, 100000, 0)).toBe(false);
	});
});
