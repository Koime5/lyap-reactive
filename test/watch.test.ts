import { describe, it } from "node:test";
import assert from "node:assert";
import { signal } from "../src/sources/signal.js";
import { watch } from "../src/derived/watch.js";
import { flushQueue } from "../src/scheduler/queue.js";
import { createScope } from "../src/scope/scope.js";

describe("Watch - Reactive Change Listener Test Suite", () => {

    it("1. Lazy Watch (Fires only when value updates)", () => {
        const count = signal(10);
        let calls = 0;
        let lastNew: number | undefined = undefined;
        let lastOld: number | undefined = undefined;

        watch(count, (newVal, oldVal) => {
            calls++;
            lastNew = newVal;
            lastOld = oldVal;
        });

        assert.strictEqual(calls, 0); // Does NOT fire on creation!

        count.set(20);
        flushQueue();

        assert.strictEqual(calls, 1);
        assert.strictEqual(lastNew, 20);
        assert.strictEqual(lastOld, 10);
    });

    it("2. Immediate Watch (options.immediate = true)", () => {
        const count = signal(5);
        let calls = 0;
        let lastNew: number | undefined = undefined;
        let lastOld: number | undefined = undefined;

        watch(count, (newVal, oldVal) => {
            calls++;
            lastNew = newVal;
            lastOld = oldVal;
        }, { immediate: true });

        assert.strictEqual(calls, 1); // Fires immediately!
        assert.strictEqual(lastNew, 5);
        assert.strictEqual(lastOld, undefined);

        count.set(15);
        flushQueue();

        assert.strictEqual(calls, 2);
        assert.strictEqual(lastNew, 15);
        assert.strictEqual(lastOld, 5);
    });

    it("3. Expression Function Source (() => a.value + b.value)", () => {
        const a = signal(1);
        const b = signal(2);
        let sumResult = 0;

        watch(() => a.value + b.value, (newSum) => {
            sumResult = newSum;
        });

        assert.strictEqual(sumResult, 0);

        a.set(10);
        flushQueue();
        assert.strictEqual(sumResult, 12); // 10 + 2 = 12

        b.set(20);
        flushQueue();
        assert.strictEqual(sumResult, 30); // 10 + 20 = 30
    });

    it("4. Watcher Disposer & Scope Auto-disposal", () => {
        const count = signal(1);
        let calls = 0;

        const { scope } = createScope(() => {
            watch(count, () => {
                calls++;
            });
        });

        count.set(2);
        flushQueue();
        assert.strictEqual(calls, 1);

        scope.dispose();

        count.set(3);
        flushQueue();
        assert.strictEqual(calls, 1); // Disposed!
    });

});
