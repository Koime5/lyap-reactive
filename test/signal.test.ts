import { describe, it } from "node:test";
import assert from "node:assert";
import { signal } from "../src/sources/signal.js";
import { Node } from "../src/core/node.js";
import { Edge } from "../src/core/edge.js";
import { NodeFlags, hasFlag } from "../src/core/flags.js";
import { beginTracking, endTracking } from "../src/core/tracking.js";
import { unlink, unlinkEdge } from "../src/graph/unlink.js";

function reconcileObserver(observer: Node): void {
    const epoch = observer.trackingEpoch;

    if (!hasFlag(observer, NodeFlags.SOURCE_EDGE)) {
        const source = observer.sourceLink as Node | null;
        if (source !== null) {
            if (source.lastLinkedObserver !== observer || source.lastLinkedEpoch !== epoch) {
                unlink(observer);
            }
        }
        return;
    }

    let edge = observer.sourceLink as Edge | null;
    while (edge !== null) {
        const next = edge.nextTarget;
        if (edge.seenEpoch !== epoch) {
            unlinkEdge(edge);
        }
        edge = next;
    }
}

class TestObserver extends Node {
    fn: () => void;
    constructor(fn: () => void) {
        super();
        this.fn = fn;
    }

    run(): void {
        const prev = beginTracking(this);
        try {
            this.fn();
        } finally {
            reconcileObserver(this);
            endTracking(prev);
        }
    }
}

describe("Signal - Hardcore Edge Case Test Suite", () => {

    it("1. Basic Read and Write", () => {
        const count = signal(0);
        assert.strictEqual(count.value, 0);

        count.set(10);
        assert.strictEqual(count.value, 10);

        count.set(-5);
        assert.strictEqual(count.value, -5);
    });

    it("2. Object.is Equality Guarding (No-op updates)", () => {
        const s = signal(100);
        let runCount = 0;

        const obs = new TestObserver(() => {
            s.value;
            runCount++;
        });

        obs.run();
        assert.strictEqual(runCount, 1);
        assert.strictEqual(hasFlag(obs, NodeFlags.DIRTY), false);

        // Set SAME value -> Object.is(100, 100) is true -> Should NOT mark DIRTY
        s.set(100);
        assert.strictEqual(hasFlag(obs, NodeFlags.DIRTY), false);

        // Set NEW value -> Should mark DIRTY
        s.set(200);
        assert.strictEqual(hasFlag(obs, NodeFlags.DIRTY), true);
    });

    it("3. Special JS Floating Point Equality (NaN, +0, -0)", () => {
        // NaN === NaN in Object.is
        const nanSig = signal(NaN);
        const obs1 = new TestObserver(() => { nanSig.value; });
        obs1.run();

        nanSig.set(NaN); // Should be no-op
        assert.strictEqual(hasFlag(obs1, NodeFlags.DIRTY), false);

        // Object.is(+0, -0) is FALSE -> Setting -0 when value is +0 SHOULD trigger notification!
        const zeroSig = signal(+0);
        const obs2 = new TestObserver(() => { zeroSig.value; });
        obs2.run();

        zeroSig.set(-0);
        assert.strictEqual(hasFlag(obs2, NodeFlags.DIRTY), true);
    });

    it("4. Object/Array Reference Equality", () => {
        const obj1 = { name: "Alice" };
        const objSig = signal(obj1);

        const obs = new TestObserver(() => { objSig.value; });
        obs.run();

        // Mutating object properties without changing reference -> Object.is same -> No notification
        obj1.name = "Bob";
        objSig.set(obj1);
        assert.strictEqual(hasFlag(obs, NodeFlags.DIRTY), false);

        // Setting NEW object reference -> Object.is false -> Triggers notification
        const obj2 = { name: "Bob" };
        objSig.set(obj2);
        assert.strictEqual(hasFlag(obs, NodeFlags.DIRTY), true);
    });

    it("5. Untracked Reads (Reading outside active observer)", () => {
        const sig = signal(42);
        // Reading value when activeObserver === null should work cleanly without errors
        assert.strictEqual(sig.value, 42);

        sig.set(99);
        assert.strictEqual(sig.value, 99);
    });

    it("6. Multi-Observer Notification (Upgrading 1 -> 2 -> Many observers)", () => {
        const sig = signal(1);

        const obs1 = new TestObserver(() => { sig.value; });
        const obs2 = new TestObserver(() => { sig.value; });
        const obs3 = new TestObserver(() => { sig.value; });

        // 1 observer (Single mode)
        obs1.run();

        // 2 observers (Promoted to Multi Edge mode)
        obs2.run();

        // 3 observers
        obs3.run();

        assert.strictEqual(hasFlag(obs1, NodeFlags.DIRTY), false);
        assert.strictEqual(hasFlag(obs2, NodeFlags.DIRTY), false);
        assert.strictEqual(hasFlag(obs3, NodeFlags.DIRTY), false);

        // Setting signal should mark ALL 3 observers DIRTY
        sig.set(2);

        assert.strictEqual(hasFlag(obs1, NodeFlags.DIRTY), true);
        assert.strictEqual(hasFlag(obs2, NodeFlags.DIRTY), true);
        assert.strictEqual(hasFlag(obs3, NodeFlags.DIRTY), true);
    });

    it("7. Diamond Dependency Structure", () => {
        const rootSig = signal(10);

        // Observer A & Observer B both depend on rootSig
        const obsA = new TestObserver(() => { rootSig.value; });
        const obsB = new TestObserver(() => { rootSig.value; });

        obsA.run();
        obsB.run();

        rootSig.set(20);

        assert.strictEqual(hasFlag(obsA, NodeFlags.DIRTY), true);
        assert.strictEqual(hasFlag(obsB, NodeFlags.DIRTY), true);
    });

    it("8. Repeated Reads in Same Run (Duplicate read protection)", () => {
        const sig = signal(100);
        let readCount = 0;

        const obs = new TestObserver(() => {
            // Read 5 times in 1 pass
            const sum = sig.value + sig.value + sig.value + sig.value + sig.value;
            readCount++;
        });

        obs.run();
        assert.strictEqual(readCount, 1);
        assert.strictEqual(hasFlag(obs, NodeFlags.DIRTY), false);

        sig.set(200);
        assert.strictEqual(hasFlag(obs, NodeFlags.DIRTY), true);
    });

    it("9. Stress Test: 100 Observers Reading Same Signal", () => {
        const sig = signal(0);
        const observers: TestObserver[] = [];

        for (let i = 0; i < 100; i++) {
            const obs = new TestObserver(() => { sig.value; });
            obs.run();
            observers.push(obs);
        }

        // Verify none are dirty
        for (const obs of observers) {
            assert.strictEqual(hasFlag(obs, NodeFlags.DIRTY), false);
        }

        // Update signal
        sig.set(1);

        // Verify ALL 100 are marked dirty
        for (const obs of observers) {
            assert.strictEqual(hasFlag(obs, NodeFlags.DIRTY), true);
        }
    });

});
