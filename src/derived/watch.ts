import { effect, type CleanupFn } from "./effect.js";
import type { ReadonlySignal } from "./computed.js";
import type { Signal } from "../sources/signal.js";
import { untrack } from "../core/tracking.js";

export type WatchSource<T> = (() => T) | ReadonlySignal<T> | Signal<T>;
export type WatchCallback<T> = (
    newValue: T,
    oldValue: T | undefined,
    onCleanup: (fn: CleanupFn) => void
) => void;

export interface WatchOptions {
    immediate?: boolean;
}

/**
 * Watches a reactive source and invokes a callback when the value changes.
 * Returns a disposer function to stop watching.
 */
export function watch<T>(
    source: WatchSource<T>,
    callback: WatchCallback<T>,
    options?: WatchOptions
): () => void {
    const getter: () => T =
        typeof source === "function" ? source : () => (source as Signal<T>).value;

    let oldValue: T | undefined = undefined;
    let isFirstRun = true;

    const stop = effect((onCleanup) => {
        const newValue = getter();

        if (isFirstRun) {
            isFirstRun = false;
            oldValue = newValue;

            if (options?.immediate) {
                untrack(() => callback(newValue, undefined, onCleanup));
            }
            return;
        }

        const prevValue = oldValue;
        oldValue = newValue;

        untrack(() => callback(newValue, prevValue, onCleanup));
    });

    return stop;
}
