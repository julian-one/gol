// The clock is a plain object owned by the caller, not module state, so each
// running loop has its own cadence and tests can drive time by hand. An unset
// `last` means the clock has not started: the caller has no timestamp of its
// own when it starts or resumes, so it clears the clock and the next frame
// starts it.
export type Clock = {
	last: number | undefined;
};

// A speed of zero needs no guard: the interval is infinite and never elapses.
export function due(clock: Clock, time: number, speed: number): boolean {
	// Starting counts from this frame, so the first generation comes a full
	// interval later instead of at once.
	if (clock.last === undefined) {
		clock.last = time;
		return false;
	}
	const interval = 1000 / speed;
	const elapsed = time - clock.last;
	if (elapsed < interval) {
		return false;
	}
	if (elapsed >= interval * 2) {
		// A long gap means the frames stopped coming (a background tab, a
		// stall). Start again from now: catching up would play the missed
		// generations as a burst.
		clock.last = time;
	} else {
		// Advance by the interval, not to `time`. Frames never land exactly on
		// the interval, and carrying the overshoot forward keeps the average
		// rate at `speed` instead of drifting slower by a fraction of a frame
		// on every step.
		clock.last += interval;
	}
	return true;
}
