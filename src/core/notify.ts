import { hasFlag, NodeFlags } from "../core/flags";
import type { Edge } from "../core/edge";
import type { Node } from "../core/node";
import { markDirty } from "./dirty";

export function notify(source: Node): void {
    const link = source.observerLink;

    if (link === null) {
        return;
    }

    const version = source.version;

    if (!hasFlag(source, NodeFlags.OBSERVER_EDGE)) {
        markDirty(link as Node);
        return;
    }

    let edge = link as Edge | null;

    while (edge !== null) {
        const next = edge.nextSource;

        if (edge.seenVersion !== version) {
            edge.seenVersion = version;
            markDirty(edge.target);
        }

        edge = next;
    }
}