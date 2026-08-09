import { NodeFlags, NodeKind } from "./flags.js";
import type { Node } from "./node.js";
import { notify } from "./notify.js";
import { queueEffect } from "../scheduler/queue.js";

/**
 * Marks a node DIRTY or PENDING and propagates downstream.
 * - DIRTY: Direct signal update (must re-evaluate).
 * - PENDING: Downstream computed update (re-evaluate if computed value changes).
 */
export function markDirty(node: Node, state: NodeFlags.DIRTY | NodeFlags.PENDING = NodeFlags.DIRTY): void {
    const flags = node.flags;

    // Short-circuit if already DIRTY
    if ((flags & NodeFlags.DIRTY) !== 0) {
        return;
    }

    // Short-circuit if already PENDING and new state is PENDING
    if (state === NodeFlags.PENDING && (flags & NodeFlags.PENDING) !== 0) {
        return;
    }

    // Update flag: Promote PENDING to DIRTY if state is DIRTY, or set PENDING
    if (state === NodeFlags.DIRTY) {
        node.flags = (flags & ~NodeFlags.PENDING) | NodeFlags.DIRTY;
    } else {
        node.flags |= NodeFlags.PENDING;
    }

    // Dispatch by NodeKind
    if (node.kind === NodeKind.COMPUTED) {
        // Computed notifies downstream observers as PENDING
        notify(node, NodeFlags.PENDING);
    } else if (node.kind === NodeKind.EFFECT) {
        // Effect queues for batch execution
        queueEffect(node);
    }
}