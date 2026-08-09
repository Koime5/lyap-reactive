let isScheduled = false;
let customScheduler: ((fn: () => void) => void) | null = null;

/**
 * Schedules a callback to be run on the next microtask cycle.
 */
export function scheduleMicrotask(fn: () => void): void {
    if (isScheduled) return;
    isScheduled = true;

    const runner = () => {
        isScheduled = false;
        fn();
    };

    if (customScheduler !== null) {
        customScheduler(runner);
    } else if (typeof queueMicrotask === "function") {
        queueMicrotask(runner);
    } else {
        Promise.resolve().then(runner);
    }
}

export function setCustomScheduler(scheduler: ((fn: () => void) => void) | null): void {
    customScheduler = scheduler;
}
