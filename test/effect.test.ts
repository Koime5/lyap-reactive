import { describe, it } from "node:test";
import assert from "node:assert";
import { signal } from "../src/sources/signal.js";
import { effect } from "../src/derived/effect.js";
import { batch, flushQueue } from "../src/scheduler/queue.js";

describe("Effect - Comprehensive Lifecycle & Execution Test Suite", () => {

    it("1. Immediate Execution on Creation", () => {
        const count = signal(10);
        let executedValue = 0;

        effect(() => {
            executedValue = count.value;
        });

        assert.strictEqual(executedValue, 10);
    });

    it("2. Signal Change Triggers Effect Re-execution via Microtask/Flush", () => {
        const count = signal(0);
        let runCount = 0;
        let lastVal = 0;

        effect(() => {
            lastVal = count.value;
            runCount++;
        });

        assert.strictEqual(runCount, 1);
        assert.strictEqual(lastVal, 0);

        count.set(5);
        flushQueue(); // Flush queued microtask effect execution

        assert.strictEqual(runCount, 2);
        assert.strictEqual(lastVal, 5);
    });

    it("3. Effect Disposal (Unlinking and Stopping Updates)", () => {
        const count = signal(100);
        let runCount = 0;

        const dispose = effect(() => {
            count.value;
            runCount++;
        });

        assert.strictEqual(runCount, 1);

        dispose(); // Dispose effect

        count.set(200);
        flushQueue();

        assert.strictEqual(runCount, 1); // Should NOT run again after disposal
    });

    it("4. Teardown / Cleanup Callback (onCleanup)", () => {
        const count = signal(1);
        let cleanupCount = 0;
        let runCount = 0;

        const dispose = effect((onCleanup) => {
            count.value;
            runCount++;

            onCleanup(() => {
                cleanupCount++;
            });
        });

        assert.strictEqual(runCount, 1);
        assert.strictEqual(cleanupCount, 0);

        count.set(2);
        flushQueue();

        assert.strictEqual(runCount, 2);
        assert.strictEqual(cleanupCount, 1); // Cleanup ran before 2nd pass

        dispose();
        assert.strictEqual(cleanupCount, 2); // Cleanup ran on dispose
    });

    it("5. Dynamic Branching & Edge Pruning", () => {
        const cond = signal(true);
        const a = signal(10);
        const b = signal(20);

        let runCount = 0;
        let result = 0;

        effect(() => {
            result = cond.value ? a.value : b.value;
            runCount++;
        });

        assert.strictEqual(result, 10);
        assert.strictEqual(runCount, 1);

        // Mutating b while cond is true should NOT trigger effect (b is not tracked)
        b.set(99);
        flushQueue();
        assert.strictEqual(runCount, 1);

        // Switch branch to false -> now b is tracked (value is 99), a is pruned
        cond.set(false);
        flushQueue();
        assert.strictEqual(result, 99);
        assert.strictEqual(runCount, 2);

        // Mutating a while cond is false should NOT trigger effect (a is now pruned!)
        a.set(888);
        flushQueue();
        assert.strictEqual(runCount, 2);

        // Mutating b SHOULD trigger effect
        b.set(1000);
        flushQueue();
        assert.strictEqual(result, 1000);
        assert.strictEqual(runCount, 3);
    });

    it("6. Atomic Batching (batch() groups multiple writes into 1 effect run)", () => {
        const a = signal(1);
        const b = signal(2);
        let runCount = 0;
        let sum = 0;

        effect(() => {
            sum = a.value + b.value;
            runCount++;
        });

        assert.strictEqual(runCount, 1);
        assert.strictEqual(sum, 3);

        batch(() => {
            a.set(10);
            b.set(20);
        });

        assert.strictEqual(runCount, 2); // Ran exactly ONCE for both signal updates
        assert.strictEqual(sum, 30);
    });

});
