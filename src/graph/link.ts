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
 * 
 * IMPORTANT:
 * The caller must have established that 
 * this relationship does not already exit.
 * 
 * There is no duplication check.
 */
export function link(source: Node, target: Node): void {

    const sourceNeedsEdges = source.observerLink !== null;
    const targetNeedsEdges = target.sourceLink !== null;

    if (!sourceNeedsEdges && !targetNeedsEdges) {
        source.observerLink = target;
        target.sourceLink = source;
        return;
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

    insertSourceEdge(source, edge);
    insertTargetEdge(target, edge);
}

/**
 * Promote the source's existing direct relationship:
 *
 *     source.observerLink = target
 *
 * into:
 *
 *     source.observerLink = Edge
 *     target.sourceLink   = Edge
 */

function promoteSource(source: Node): void {
    const target = source.observerLink as Node;
    const edge = globalEdgePool.acquire();

    edge.source = source;
    edge.target = target;
    edge.seenVersion = source.version;

    source.observerLink = edge;

    addFlag(source, NodeFlags.OBSERVER_EDGE);

    /*
     * The target must also be promoted if it is currently using
     * direct representation.
     */

    if (!hasFlag(target, NodeFlags.SOURCE_EDGE)) {
        target.sourceLink = edge;
        addFlag(target, NodeFlags.SOURCE_EDGE);
        return;
    }

    /*
     * Target is already Edge-backed.
     *
     * Insert the SAME edge into its existing source list.
     */
    insertTargetEdge(target, edge);
}

/**
 * Promote the target's existing direct relationship:
 *
 *     target.sourceLink = source
 *
 * into:
 *
 *     target.sourceLink   = Edge
 *     source.observerLink = Edge
 */
function promoteTarget(target: Node): void {
    const source = target.sourceLink as Node;
    const edge = globalEdgePool.acquire();

    edge.source = source;
    edge.target = target;
    edge.seenVersion = source.version;

    target.sourceLink = edge;

    addFlag(target, NodeFlags.SOURCE_EDGE);

    /*
     * The source must also be promoted if it is currently using
     * direct representation.
     */
    if (!hasFlag(source, NodeFlags.OBSERVER_EDGE)) {
        source.observerLink = edge;
        addFlag(source, NodeFlags.OBSERVER_EDGE);
        return;
    }

    /*
     * Source is already Edge-backed.
     *
     * Insert the SAME edge into its existing observer list.
     */
    insertSourceEdge(source, edge);

}

/**
 * Insert an Edge into the source's observer list.
 */
function insertSourceEdge(source: Node, edge: Edge): void {

    const head = source.observerLink as Edge;
    edge.prevSource = null;
    edge.nextSource = head;

    if (head !== null) {
        head.prevSource = edge;
    }

    source.observerLink = edge;
    addFlag(source, NodeFlags.OBSERVER_EDGE);
}

/**
 * Insert an Edge into the target's dependency list.
 */
function insertTargetEdge(target: Node, edge: Edge): void {

    const head = target.sourceLink as Edge;
    edge.prevTarget = null;
    edge.nextTarget = head;

    if (head !== null) {
        head.prevTarget = edge;
    }

    target.sourceLink = edge;
    addFlag(target, NodeFlags.SOURCE_EDGE);
}
