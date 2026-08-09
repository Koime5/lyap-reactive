import {
    addFlag,
    hasFlag,
    NodeFlags,
} from "../core/flags";

import type { Node } from "../core/node";

export function markDirty(node: Node | null): void {
    if (node === null) return;
    
    if (hasFlag(node, NodeFlags.DIRTY)) {
        return;
    }

    addFlag(node, NodeFlags.DIRTY);

    /*
     * For now, don't schedule anything yet.
     */
}