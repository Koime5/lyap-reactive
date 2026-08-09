import { NodeFlags, NodeKind } from "./flags.js";
import type { Node } from "./node.js";
import { notify } from "./notify.js";
import { queueEffect } from "../scheduler/queue.js";

/**
 * Marks a node DIRTY and propagates to computed observers or enqueues effect observers.
 * Uses integer node.kind for monomorphic V8 JIT jump table dispatch.
 */
export function markDirty(node: Node): void {
    if ((node.flags & NodeFlags.DIRTY) !== 0) {
        return;
    }

    node.flags |= NodeFlags.DIRTY;

    // Dispatch by NodeKind
    if (node.kind === NodeKind.COMPUTED) {
        // Computed is both observer and source: notify downstream observers!
        notify(node);
    } else if (node.kind === NodeKind.EFFECT) {
        // Effect is an observer: queue for batch execution!
        queueEffect(node);
    }
}