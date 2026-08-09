import { NodeFlags, NodeKind } from "./flags.js";
import type { Node } from "./node.js";
import type { Edge } from "./edge.js";
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

    // Dispatch by NodeKind integer comparison
    const kind = node.kind;
    if (kind === NodeKind.COMPUTED) {
        // Computed notifies downstream observers as PENDING
        notify(node, NodeFlags.PENDING);
    } else if (kind === NodeKind.EFFECT) {
        // Effect queues for batch execution
        queueEffect(node);
    }
}

/**
 * Checks if any source dependency of a PENDING observer node updated its version.
 */
export function checkDependencies(node: Node): boolean {
    if ((node.flags & NodeFlags.SOURCE_EDGE) === 0) {
        const source = node.sourceLink as Node | null;
        if (source === null) return false;

        if ((source.flags & (NodeFlags.DIRTY | NodeFlags.PENDING)) !== 0) {
            if (source.kind === NodeKind.COMPUTED) {
                (source as unknown as { update(): void }).update();
            }
        }
        return source.version !== node.lastCheckedVersion;
    }

    let edge = node.sourceLink as Edge | null;
    while (edge !== null) {
        const source = edge.source!;
        if ((source.flags & (NodeFlags.DIRTY | NodeFlags.PENDING)) !== 0) {
            if (source.kind === NodeKind.COMPUTED) {
                (source as unknown as { update(): void }).update();
            }
        }
        if (source.version !== edge.seenVersion) {
            return true;
        }
        edge = edge.nextTarget;
    }

    return false;
}