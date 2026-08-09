import { findLink, link } from "../graph/link";
import { Node } from "./node";


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


export function track(source: Node): void {
    const observer = activeObserver;
    if (observer === null) return;

    const epoch = observer.trackingEpoch;

    // duplicate in same effect run
    if (
        source.lastLinkedEpoch === epoch &&
        source.lastLinkedObserver === observer
    ) {
        return;
    }

    // cache-hit
    if (source.lastLinkedObserver === observer) {
        const edge = source.lastLinkedEdge;

        source.lastLinkedEpoch = epoch;

        if (edge !== null) {
            edge.seenEpoch = epoch;
        }

        return;
    }

    // cache-miss
    const existing = findLink(source, observer);

    if (existing !== null) {
        source.lastLinkedObserver = observer;
        source.lastLinkedEpoch = epoch;

        if (existing !== true) {
            source.lastLinkedEdge = existing;
            existing.seenEpoch = epoch;
        } else {
            source.lastLinkedEdge = null;
        }

        return;
    }

    //new dep
    const edge = link(source, observer);
    source.lastLinkedObserver = observer;
    source.lastLinkedEpoch = epoch;
    source.lastLinkedEdge = edge;

    if (edge !== null) {
        edge.seenEpoch = epoch;
    }
}
