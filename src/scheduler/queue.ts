import { NodeFlags } from "../core/flags.js";
import type { Node } from "../core/node.js";
import { scheduleMicrotask } from "./microtask.js";

const effectQueue: Node[] = [];
let isFlushing = false;

/**
 * Enqueues an Effect node into the batch queue and schedules a microtask flush.
 */
export function queueEffect(effect: Node): void {
    if ((effect.flags & NodeFlags.QUEUED) !== 0) {
        return;
    }

    effect.flags |= NodeFlags.QUEUED;
    effectQueue.push(effect);

    scheduleMicrotask(flushQueue);
}

/**
 * Flushes all queued effect observers in FIFO order.
 */
export function flushQueue(): void {
    if (isFlushing) return;
    isFlushing = true;

    try {
        let i = 0;
        while (i < effectQueue.length) {
            const effect = effectQueue[i++];
            if (effect === undefined) break;

            effect.flags &= ~NodeFlags.QUEUED;

            // Skip disposed nodes
            if ((effect.flags & NodeFlags.DISPOSED) !== 0) {
                continue;
            }

            // Only run if still DIRTY
            if ((effect.flags & NodeFlags.DIRTY) !== 0) {
                if ((effect as any).run) {
                    (effect as any).run();
                }
            }
        }
    } finally {
        effectQueue.length = 0;
        isFlushing = false;
    }
}

/**
 * Executes a batch closure, ensuring effects are flushed atomically at the end.
 */
export function batch<T>(fn: () => T): T {
    const wasFlushing = isFlushing;
    isFlushing = true;
    try {
        return fn();
    } finally {
        isFlushing = wasFlushing;
        if (!isFlushing) {
            flushQueue();
        }
    }
}
