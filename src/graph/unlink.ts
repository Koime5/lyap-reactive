import { globalEdgePool, type Edge } from "../core/edge.js";
import { removeFlag, NodeFlags, hasFlag } from "../core/flags.js";
import { Node } from "../core/node";
import { findLink } from "./link";

/**
 * Removes an existing source -> observer relationship.
 *
 * IMPORTANT:
 * - The Edge must already be known.
 * - No duplicate/relationship lookup is performed.
 * - O(1).
 * - Does not demote Edge-backed nodes back to direct Node representation.
 *
 * Representation:
 *
 *     0 relationships -> null
 *     1 relationship  -> Node OR Edge
 *     2+ relationships -> Edge
 *
 * Once a node has entered Edge mode, it remains Edge-backed
 * until its edge list becomes empty.
 */
export function unlinkEdge(edge: Edge): void {
    const source = edge.source!;
    const target = edge.target!;

    // Source
    const prevSource = edge.prevSource;
    const nextSource = edge.nextSource;

    if (prevSource !== null) {
        prevSource.nextSource = nextSource;
    } else {
        // Edge was the head.
        source.observerLink = nextSource;
    }

    if (nextSource !== null) {
        nextSource.prevSource = prevSource;
    }

    if (source.observerLink === null) {
        removeFlag(source, NodeFlags.OBSERVER_EDGE);
    }

    // target
    const prevTarget = edge.prevTarget;
    const nextTarget = edge.nextTarget;

    if (prevTarget !== null) {
        prevTarget.nextTarget = nextTarget;
    } else {
        // Edge was the head.
        target.sourceLink = nextTarget;
    }

    if (nextTarget !== null) {
        nextTarget.prevTarget = prevTarget;
    }


    if (target.sourceLink === null) {
        removeFlag(target, NodeFlags.SOURCE_EDGE);
    }

    globalEdgePool.release(edge);
}

/**
 * Remove all dependencies of a target node.
 *
 * Used when:
 * - an effect/computed is about to re-evaluate
 * - a node is disposed
 *
 * O(number of dependencies).
 */
export function unlink(target: Node): void {

    const link = target.sourceLink; 
    if (link === null) {
        return;
    }

    /*
     * Fast path:
     *
     * target.sourceLink = source
     * source.observerLink = target
     *
     * No Edge exists on the target side.
     */
    if (!hasFlag(target, NodeFlags.SOURCE_EDGE)) {

        const source = link as Node;
        target.sourceLink = null;

        /*
         * Source also has a single direct observer.
         *
         * Therefore the relationship is represented directly
         * on both nodes.
         */
        if (!hasFlag(source, NodeFlags.OBSERVER_EDGE)) {
            source.observerLink = null;
            return;
        }

        /*
         * Source has multiple observers.
         *
         * The relationship target ← source is represented by
         * an Edge on source's observer list.
         *
         * This is the only slow path.
         */
        const existing = findLink(source, target);

        if (existing !== null && existing !== true) {
            unlinkEdge(existing);
        }
        return;
    }

    /*
     * Edge-backed target.
     *
     * Always remove the head.
     *
     * unlinkEdge() updates target.sourceLink,
     * so no traversal restart is required.
     */
    while (target.sourceLink !== null) {
        unlinkEdge(target.sourceLink as Edge);
    }
}