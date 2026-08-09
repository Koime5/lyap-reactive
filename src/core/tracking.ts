import { findLink, link } from "../graph/link.js";
import { Node } from "./node.js";
import type { Edge } from "./edge.js";
import { hasFlag, NodeFlags } from "./flags.js";
import { unlinkDirect, unlinkEdge } from "../graph/unlink.js";

export let activeObserver: Node | null = null;

let epochCounter = 0;

export function beginTracking(observer: Node): Node | null {
    const previous = activeObserver;

    observer.trackingEpoch = ++epochCounter;
    activeObserver = observer;

    return previous;
}

export function endTracking(previous: Node | null): void {
    activeObserver = previous;
}

/**
 * Executes a function without tracking any signals or computeds read within its scope.
 */
export function untrack<T>(fn: () => T): T {
    const previous = activeObserver;
    activeObserver = null;
    try {
        return fn();
    } finally {
        activeObserver = previous;
    }
}

export function track(source: Node): void {
    const observer = activeObserver;
    if (observer === null) return;

    const epoch = observer.trackingEpoch;

    // 1. O(1) single integer compare duplicate guard (epoch is globally unique)
    if (source.lastLinkedEpoch === epoch) {
        return;
    }

    // 2. Cache-hit for repeated passes of same observer
    if (source.lastLinkedObserver === observer) {
        const edge = source.lastLinkedEdge;
        source.lastLinkedEpoch = epoch;
        if (edge !== null) {
            edge.seenVersion = source.version;
            edge.seenEpoch = epoch;
        } else {
            observer.lastCheckedVersion = source.version;
        }
        return;
    }

    // 3. Cache-miss: lookup existing link
    const existing = findLink(source, observer);

    if (existing !== null) {
        source.lastLinkedObserver = observer;
        source.lastLinkedEpoch = epoch;

        if (existing !== true) {
            source.lastLinkedEdge = existing;
            existing.seenVersion = source.version;
            existing.seenEpoch = epoch;
        } else {
            source.lastLinkedEdge = null;
            observer.lastCheckedVersion = source.version;
        }

        return;
    }

    // 4. New dependency link
    const edge = link(source, observer);
    source.lastLinkedObserver = observer;
    source.lastLinkedEpoch = epoch;
    source.lastLinkedEdge = edge;

    if (edge !== null) {
        edge.seenVersion = source.version;
        edge.seenEpoch = epoch;
    } else {
        observer.lastCheckedVersion = source.version;
    }
}

/**
 * Prunes unseen dependency edges at the end of a tracking pass.
 */
export function reconcile(target: Node): void {
    const link = target.sourceLink;
    if (link === null) return;

    const epoch = target.trackingEpoch;

    if (!hasFlag(target, NodeFlags.SOURCE_EDGE)) {
        const source = link as Node;
        if (source.lastLinkedEpoch !== epoch || source.lastLinkedObserver !== target) {
            unlinkDirect(target, source);
        }
        return;
    }

    let edge = link as Edge | null;
    while (edge !== null) {
        const next = edge.nextTarget;
        if (edge.seenEpoch !== epoch) {
            unlinkEdge(edge);
        }
        edge = next;
    }
}
