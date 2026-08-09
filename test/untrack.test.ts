import { describe, it } from "node:test";
import assert from "node:assert";
import { signal } from "../src/sources/signal.js";
import { effect } from "../src/derived/effect.js";
import { untrack } from "../src/core/tracking.js";
import { flushQueue } from "../src/scheduler/queue.js";

describe("Untrack - Ignored Tracking Scope Test Suite", () => {

    it("1. Untracked Signal Read does NOT register dependency", () => {
        const a = signal(10);
        let runs = 0;
        let lastVal = 0;

        effect(() => {
            runs++;
            lastVal = untrack(() => a.value);
        });

        assert.strictEqual(runs, 1);
        assert.strictEqual(lastVal, 10);

        // Updating signal 'a' should NOT trigger effect re-execution
        a.set(20);
        flushQueue();

        assert.strictEqual(runs, 1); // Still 1 run!
        assert.strictEqual(lastVal, 10);
    });

    it("2. Mixed Tracked & Untracked Reads in Same Effect", () => {
        const tracked = signal(1);
        const untrackedSig = signal(100);
        let runs = 0;
        let result = 0;

        effect(() => {
            runs++;
            const t = tracked.value;
            const u = untrack(() => untrackedSig.value);
            result = t + u;
        });

        assert.strictEqual(runs, 1);
        assert.strictEqual(result, 101);

        // Mutating untrackedSig should NOT trigger effect
        untrackedSig.set(500);
        flushQueue();
        assert.strictEqual(runs, 1);
        assert.strictEqual(result, 101);

        // Mutating tracked signal SHOULD trigger effect & pick up updated untrackedSig value
        tracked.set(2);
        flushQueue();
        assert.strictEqual(runs, 2);
        assert.strictEqual(result, 502); // 2 + 500 = 502
    });

    it("3. Untrack Return Value Propagation", () => {
        const a = signal(5);
        const res = untrack(() => a.value * 10);
        assert.strictEqual(res, 50);
    });

    it("4. Nested Untrack Call Scope Restoration", () => {
        const a = signal(1);
        const b = signal(2);
        let runs = 0;

        effect(() => {
            runs++;
            a.value;
            untrack(() => {
                b.value;
                untrack(() => {
                    b.value;
                });
            });
        });

        assert.strictEqual(runs, 1);

        // Updating b should NOT trigger effect
        b.set(99);
        flushQueue();
        assert.strictEqual(runs, 1);

        // Updating a SHOULD trigger effect
        a.set(10);
        flushQueue();
        assert.strictEqual(runs, 2);
    });

});
