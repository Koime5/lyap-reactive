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
    const last = source.lastLinkedEpoch;

    if (last === epoch) {
        return; // already linked during this pass
    }

    if (last > epoch) {
        if (findLink(source, observer) !== null) {

            source.lastLinkedEpoch = epoch;
            return;
        }
    }
    source.lastLinkedEpoch = epoch;
    link(source, observer);
}
