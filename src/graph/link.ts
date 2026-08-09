import { globalEdgePool, type Edge } from "../core/edge.js";
import { addFlag, hasFlag, NodeFlags } from "../core/flags.js";
import type { Node } from "../core/node.js";


export type ExistingLink = Edge | true | null;

export function findLink(
    source: Node,
    target: Node
): ExistingLink {
    const link = source.observerLink;

    if (link === null) {
        return null;
    }

    // Single relationship stored directly as Node.
    if (!hasFlag(source, NodeFlags.OBSERVER_EDGE)) {
        return link === target ? true : null;
    }

    // Multiple relationships stored as Edges.
    let edge: Edge | null = link as Edge;

    while (edge !== null) {
        if (edge.target === target) {
            return edge;
        }

        edge = edge.nextSource;
    }

    return null;
}
/**
 * Connects a source (dependency) to a target (observer) in the reactive graph.
 *
 * Duplicate detection is handled upstream by {@link track} (epoch-based, O(1)),
 * so this function assumes the edge does not already exist.
 *
 * Pipeline:
 * 1. Check if source or target will need Edge representation (has >1)
 * 2. Fast-path: Both empty -> direct Node <-> Node
 * 3. Promote source's existing single relationship to Edge mode
 * 4. Promote target's existing single relationship to Edge mode
 * 5. Create ONE Edge for (source -> target)
 * 6. Insert that SAME Edge into both linked lists
 */
export function link(source: Node, target: Node): void {
    // 1. Check if source or target will need Edge representation
    const sourceNeedsEdge = source.observerLink !== null;
    const targetNeedsEdge = target.sourceLink !== null;

    // 2. Fast-path: Both empty -> direct Node <-> Node
    if (!sourceNeedsEdge && !targetNeedsEdge) {
        source.observerLink = target;
        target.sourceLink = source;
        return;
    }

    // 3. Promote source's existing single relationship to Edge mode
    if (source.observerLink !== null && !hasFlag(source, NodeFlags.OBSERVER_EDGE)) {
        const oldTarget = source.observerLink as Node;
        const oldEdge = globalEdgePool.acquire();
        oldEdge.source = source;
        oldEdge.target = oldTarget;
        oldEdge.seenVersion = source.version;

        source.observerLink = oldEdge;
        addFlag(source, NodeFlags.OBSERVER_EDGE);

        if (hasFlag(oldTarget, NodeFlags.SOURCE_EDGE)) {
            const head = oldTarget.sourceLink as Edge;
            oldEdge.nextTarget = head;
            head.prevTarget = oldEdge;
            oldTarget.sourceLink = oldEdge;
        }
    }

    // 4. Promote target's existing single relationship to Edge mode
    if (target.sourceLink !== null && !hasFlag(target, NodeFlags.SOURCE_EDGE)) {
        const oldSource = target.sourceLink as Node;
        const oldEdge = globalEdgePool.acquire();
        oldEdge.source = oldSource;
        oldEdge.target = target;
        oldEdge.seenVersion = oldSource.version;

        target.sourceLink = oldEdge;
        addFlag(target, NodeFlags.SOURCE_EDGE);

        if (hasFlag(oldSource, NodeFlags.OBSERVER_EDGE)) {
            const head = oldSource.observerLink as Edge;
            oldEdge.nextSource = head;
            head.prevSource = oldEdge;
            oldSource.observerLink = oldEdge;
        }
    }

    // 5. Create ONE Edge for (source -> target)
    const edge = globalEdgePool.acquire();
    edge.source = source;
    edge.target = target;
    edge.seenVersion = source.version;

    // 6. Insert the edge into target's source list
    if (hasFlag(target, NodeFlags.SOURCE_EDGE)) {
        const head = target.sourceLink as Edge;
        edge.nextTarget = head;
        head.prevTarget = edge;
        target.sourceLink = edge;
    } else {
        addFlag(target, NodeFlags.SOURCE_EDGE);
        target.sourceLink = edge;
    }

    // 7. Insert the SAME edge into source's observer list
    if (hasFlag(source, NodeFlags.OBSERVER_EDGE)) {
        const head = source.observerLink as Edge;
        edge.nextSource = head;
        head.prevSource = edge;
        source.observerLink = edge;
    } else {
        source.observerLink = target;
    }
}
