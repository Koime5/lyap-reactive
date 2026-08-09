import type { Owner } from "../scope/owner.js";
import type { Edge } from "./edge.js";
import { NodeFlags } from "./flags.js";

/**
 * Represent a reactive Node in the dependency graph.
 *
 * Graph Invariants:
 * 1. If NodeFlags.SOURCE_EDGE is set, `sourceLink` is an Edge representing the head of
 *    a doubly-linked list of dependencies (source nodes). Otherwise, `sourceLink` is
 *    either a single Node or null.
 * 2. If NodeFlags.OBSERVER_EDGE is set, `observerLink` is an Edge representing the head of
 *    a doubly-linked list of observers (target nodes). Otherwise, `observerLink` is
 *    either a single Node or null.
 */
export abstract class Node {

    flags = NodeFlags.CLEAN;

    version = 0;
    lastCheckedVersion = 0;

    sourceLink: Node | Edge | null = null;
    observerLink: Node | Edge | null = null;

    /**
     * Monotonically-increasing epoch assigned at the start of a tracking pass.
     * Used by {@link track} to detect duplicate links in O(1) per call.
     */
    trackingEpoch = 0;

    /**
     * The epoch in which this node was most recently linked as a source.
     * Compared against `activeObserver.trackingEpoch` to skip re-linking
     * during the same tracking pass.
     */
    lastLinkedEpoch = 0;

    owner: Owner | null = null;
}