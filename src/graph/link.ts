import { globalEdgePool } from "../core/edge";
import type { Node } from "../core/node";

export function link(source: Node, target: Node) {

    const edge = globalEdgePool.acquire();
    edge.source = source;
    edge.target = target;
    edge.seenVersion = source.version;

    //complex nexts and prevs, I won't touch this ever again. Done by gemini so it may be correct.
    edge.nextSource = source.observerHead;
    if (source.observerHead !== null) {
        source.observerHead.prevSource = edge;
    }
    source.observerHead = edge;

    edge.nextTarget = target.sourceHead;
    if (target.sourceHead !== null) {
        target.sourceHead.prevTarget = edge;
    }
    target.sourceHead = edge;
}