import { describe, it } from "node:test";
import assert from "node:assert";
import { signal } from "../src/sources/signal.js";
import { effect } from "../src/derived/effect.js";
import { createScope } from "../src/scope/scope.js";
import { flushQueue } from "../src/scheduler/queue.js";

describe("Scope - Hierarchical Lifecycle Ownership Test Suite", () => {

    it("1. Scope auto-disposes child effects on scope.dispose()", () => {
        const count = signal(0);
        let runs = 0;

        const { scope } = createScope(() => {
            effect(() => {
                count.value;
                runs++;
            });
            effect(() => {
                count.value;
                runs++;
            });
        });

        assert.strictEqual(runs, 2);

        // Signal update runs both effects
        count.set(1);
        flushQueue();
        assert.strictEqual(runs, 4);

        // Dispose scope -> Tears down both child effects!
        scope.dispose();

        count.set(2);
        flushQueue();

        assert.strictEqual(runs, 4); // Still 4 (no more effect updates!)
    });

    it("2. Hierarchical Nested Scope Teardown", () => {
        const count = signal(10);
        let childRuns = 0;

        const { scope: parentScope } = createScope(() => {
            createScope(() => {
                effect(() => {
                    count.value;
                    childRuns++;
                });
            });
        });

        assert.strictEqual(childRuns, 1);

        count.set(20);
        flushQueue();
        assert.strictEqual(childRuns, 2);

        // Disposing parentScope should dispose nested child scope and child effect!
        parentScope.dispose();

        count.set(30);
        flushQueue();
        assert.strictEqual(childRuns, 2); // Disposed!
    });

    it("3. Scope Return Value Propagation", () => {
        const { result, scope } = createScope(() => {
            return 42 * 2;
        });

        assert.strictEqual(result, 84);
        assert.strictEqual(scope.isDisposed, false);
    });

});
