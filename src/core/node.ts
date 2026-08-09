import type { Edge } from "./edge.js";
import { NodeFlags, NodeKind } from "./flags.js";

/**
 * Represent a reactive Node in the dependency graph.
 */
export abstract class Node {

    flags: number = NodeFlags.CLEAN;
    kind: NodeKind;

    version = 0;
    lastCheckedVersion = 0;

    sourceLink: Node | Edge | null = null;
    observerLink: Node | Edge | null = null;

    trackingEpoch = 0;

    lastLinkedEpoch = 0;
    lastLinkedObserver: Node | null = null;
    lastLinkedEdge: Edge | null = null;

    constructor(kind: NodeKind = NodeKind.SIGNAL) {
        this.kind = kind;
    }
}