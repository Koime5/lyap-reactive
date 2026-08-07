import { globalEdgePool, type Edge } from "../core/edge";
import { Node } from "../core/node";

// another function that destroyed my brain cells
// observer/target like effect, computed run again. It will remove edges
export function unlink(target: Node) {
    let edge = target.sourceHead;
    target.sourceHead = null;

    while (edge !== null) {
        const next = edge.nextTarget;
        const source = edge.source;
        if (source !== null) {
            if (edge.prevSource !== null) {
                edge.prevSource.nextSource = edge.nextSource;
            } else {
                source.observerHead = edge.nextSource;
            }

            if (edge.nextSource !== null) {
                edge.nextSource.prevSource = edge.prevSource;
            }
        }

        globalEdgePool.release(edge);
        edge = next;
    }
}