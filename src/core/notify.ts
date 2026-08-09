import { NodeFlags } from "./flags.js";
import type { Edge } from "./edge.js";
import type { Node } from "./node.js";
import { markDirty } from "./dirty.js";

/**
 * Notifies observers of a source node that its value has updated.
 * Passes DIRTY for direct signal updates or PENDING for computed updates.
 */
export function notify(source: Node, state: NodeFlags.DIRTY | NodeFlags.PENDING = NodeFlags.DIRTY): void {
    const link = source.observerLink;
    if (link === null) return;

    const version = source.version;

    // Single Observer mode (0/1 direct link)
    if ((source.flags & NodeFlags.OBSERVER_EDGE) === 0) {
        markDirty(link as Node, state);
        return;
    }

    // Multi Observer mode (Edge list)
    let edge: Edge | null = link as Edge;
    while (edge !== null) {
        const next: Edge | null = edge.nextSource;
        if (edge.seenVersion !== version) {
            edge.seenVersion = version;
            if (edge.target !== null) {
                markDirty(edge.target, state);
            }
        }
        edge = next;
    }
}