import { globalEdgePool, type Edge } from "../core/edge.js";
import { addFlag, hasFlag, NodeFlags } from "../core/flags.js";
import { Node } from "../core/node.js";

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
 * Create a new source -> observer relationship.
 */
export function link(source: Node, target: Node): Edge | null {

    const sourceNeedsEdges = source.observerLink !== null;
    const targetNeedsEdges = target.sourceLink !== null;

    if (!sourceNeedsEdges && !targetNeedsEdges) {
        source.observerLink = target;
        target.sourceLink = source;
        return null;
    }

    if (sourceNeedsEdges && !hasFlag(source, NodeFlags.OBSERVER_EDGE)) {
        promoteSource(source);
    }

    if (targetNeedsEdges && !hasFlag(target, NodeFlags.SOURCE_EDGE)) {
        promoteTarget(target);
    }

    const edge = globalEdgePool.acquire();

    edge.source = source;
    edge.target = target;
    edge.seenVersion = source.version;
    edge.seenEpoch = target.trackingEpoch;

    insertSourceEdge(source, edge);
    insertTargetEdge(target, edge);

    return edge;
}

/**
 * Promote the source's existing direct relationship into an Edge.
 */
function promoteSource(source: Node): void {
    const target = source.observerLink as Node;
    const edge = globalEdgePool.acquire();

    edge.source = source;
    edge.target = target;
    edge.seenVersion = source.version;
    edge.seenEpoch = target.trackingEpoch;

    source.observerLink = edge;
    addFlag(source, NodeFlags.OBSERVER_EDGE);

    if (!hasFlag(target, NodeFlags.SOURCE_EDGE)) {
        target.sourceLink = edge;
        addFlag(target, NodeFlags.SOURCE_EDGE);
        return;
    }

    insertTargetEdge(target, edge);
}

/**
 * Promote the target's existing direct relationship into an Edge.
 */
function promoteTarget(target: Node): void {
    const source = target.sourceLink as Node;
    const edge = globalEdgePool.acquire();

    edge.source = source;
    edge.target = target;
    edge.seenVersion = source.version;
    edge.seenEpoch = target.trackingEpoch;

    target.sourceLink = edge;
    addFlag(target, NodeFlags.SOURCE_EDGE);

    if (!hasFlag(source, NodeFlags.OBSERVER_EDGE)) {
        source.observerLink = edge;
        addFlag(source, NodeFlags.OBSERVER_EDGE);
        return;
    }

    insertSourceEdge(source, edge);
}

/**
 * Insert an Edge into the source's observer list.
 */
function insertSourceEdge(source: Node, edge: Edge): void {
    const head = source.observerLink as Edge | null;

    if (head !== null) {
        edge.nextSource = head;
        head.prevSource = edge;
    }

    source.observerLink = edge;
    addFlag(source, NodeFlags.OBSERVER_EDGE);
}

/**
 * Insert an Edge into the target's source list.
 */
function insertTargetEdge(target: Node, edge: Edge): void {
    const head = target.sourceLink as Edge | null;

    if (head !== null) {
        edge.nextTarget = head;
        head.prevTarget = edge;
    }

    target.sourceLink = edge;
    addFlag(target, NodeFlags.SOURCE_EDGE);
}
