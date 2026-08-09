import { describe, it } from "node:test";
import assert from "node:assert";
import { signal } from "../src/sources/signal.js";
import { computed } from "../src/derived/computed.js";
import { effect } from "../src/derived/effect.js";
import { flushQueue } from "../src/scheduler/queue.js";

describe("Computed - Hardcore Derived Reactive Test Suite", () => {

    it("1. Lazy Evaluation (Does NOT run on creation)", () => {
        const count = signal(2);
        let computeCount = 0;

        const double = computed(() => {
            computeCount++;
            return count.value * 2;
        });

        assert.strictEqual(computeCount, 0); // 0 runs on creation!

        assert.strictEqual(double.value, 4); // First read triggers evaluation
        assert.strictEqual(computeCount, 1);
    });

    it("2. Value Caching (Multiple reads reuse cached result)", () => {
        const count = signal(5);
        let computeCount = 0;

        const squared = computed(() => {
            computeCount++;
            return count.value * count.value;
        });

        assert.strictEqual(squared.value, 25);
        assert.strictEqual(squared.value, 25);
        assert.strictEqual(squared.value, 25);
        assert.strictEqual(computeCount, 1); // Only evaluated ONCE for 3 reads
    });

    it("3. Signal Change Triggers Re-computation on Next Read", () => {
        const count = signal(10);
        let computeCount = 0;

        const plusFive = computed(() => {
            computeCount++;
            return count.value + 5;
        });

        assert.strictEqual(plusFive.value, 15);
        assert.strictEqual(computeCount, 1);

        count.set(20);
        assert.strictEqual(computeCount, 1); // Still 1 (lazy!)

        assert.strictEqual(plusFive.value, 25);
        assert.strictEqual(computeCount, 2);
    });

    it("4. Chained Computeds (C1 -> C2 -> C3)", () => {
        const first = signal(1);
        const c1 = computed(() => first.value + 1);
        const c2 = computed(() => c1.value * 2);
        const c3 = computed(() => c2.value + 10);

        assert.strictEqual(c3.value, 14); // (1+1)*2 + 10 = 14

        first.set(5);
        assert.strictEqual(c3.value, 22); // (5+1)*2 + 10 = 22
    });

    it("5. Object.is Equality Guarding (Downstream Effect skipped if Computed value unchanged)", () => {
        const count = signal(1);
        let computedCount = 0;
        let effectCount = 0;

        // Returns true if count > 10
        const isLarge = computed(() => {
            computedCount++;
            return count.value > 10;
        });

        effect(() => {
            isLarge.value;
            effectCount++;
        });

        assert.strictEqual(computedCount, 1);
        assert.strictEqual(effectCount, 1);

        // Change count from 1 to 2 -> isLarge is still false!
        count.set(2);
        flushQueue();

        assert.strictEqual(computedCount, 2); // Computed checked
        assert.strictEqual(effectCount, 1);   // Effect SKIPPED because isLarge stayed false!

        // Change count to 20 -> isLarge becomes true!
        count.set(20);
        flushQueue();

        assert.strictEqual(computedCount, 3);
        assert.strictEqual(effectCount, 2);   // Effect ran because isLarge changed!
    });

    it("6. Dynamic Branching & Edge Pruning inside Computed", () => {
        const cond = signal(true);
        const a = signal(100);
        const b = signal(200);

        let computeCount = 0;
        const branchResult = computed(() => {
            computeCount++;
            return cond.value ? a.value : b.value;
        });

        assert.strictEqual(branchResult.value, 100);
        assert.strictEqual(computeCount, 1);

        // Mutating b while cond is true should NOT trigger re-computation
        b.set(999);
        assert.strictEqual(branchResult.value, 100);
        assert.strictEqual(computeCount, 1);

        // Swap branch to false -> now reads b
        cond.set(false);
        assert.strictEqual(branchResult.value, 999);
        assert.strictEqual(computeCount, 2);

        // Mutating a while cond is false should NOT trigger re-computation (a is pruned)
        a.set(8888);
        assert.strictEqual(branchResult.value, 999);
        assert.strictEqual(computeCount, 2);
    });

});
