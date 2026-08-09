import { describe, it } from "node:test";
import assert from "node:assert";
import { signal } from "../src/sources/signal.js";
import { effect, onCleanup } from "../src/derived/effect.js";
import { flushQueue } from "../src/scheduler/queue.js";

describe("onCleanup - Top-level Teardown Hook Test Suite", () => {

    it("1. Basic top-level onCleanup hook", () => {
        const count = signal(0);
        let cleanedValue = -1;

        effect(() => {
            const current = count.value;
            onCleanup(() => {
                cleanedValue = current;
            });
        });

        assert.strictEqual(cleanedValue, -1);

        count.set(1);
        flushQueue();

        assert.strictEqual(cleanedValue, 0); // Cleaned up previous value (0)
    });

    it("2. Chained Multiple onCleanup Hooks", () => {
        const count = signal(10);
        const log: string[] = [];

        effect(() => {
            count.value;
            onCleanup(() => log.push("first"));
            onCleanup(() => log.push("second"));
        });

        assert.deepStrictEqual(log, []);

        count.set(20);
        flushQueue();

        assert.deepStrictEqual(log, ["first", "second"]); // Both executed in order!
    });

    it("3. Disposal triggers onCleanup hooks", () => {
        const s = signal(5);
        let disposed = false;

        const dispose = effect(() => {
            s.value;
            onCleanup(() => {
                disposed = true;
            });
        });

        assert.strictEqual(disposed, false);

        dispose();

        assert.strictEqual(disposed, true);
    });

    it("4. Calling onCleanup outside active effect is safe no-op", () => {
        let ran = false;
        onCleanup(() => {
            ran = true;
        });

        assert.strictEqual(ran, false);
    });

});
