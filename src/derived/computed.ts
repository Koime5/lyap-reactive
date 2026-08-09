import { Node } from "../core/node.js";
import { NodeFlags, NodeKind } from "../core/flags.js";
import { beginTracking, endTracking, reconcile, track } from "../core/tracking.js";
import { unlink } from "../graph/unlink.js";
import { checkDependencies } from "../core/dirty.js";

export type ComputedGetter<T> = () => T;

export class ComputedNode<T> extends Node {
    fn: ComputedGetter<T>;
    _value: T = undefined as unknown as T;

    constructor(fn: ComputedGetter<T>) {
        super(NodeKind.COMPUTED);
        this.fn = fn;
        // Initially marked DIRTY so first read evaluates
        this.flags |= NodeFlags.DIRTY;
    }

    get value(): T {
        // 1. Evaluate if DIRTY or PENDING FIRST so version is up-to-date
        if ((this.flags & (NodeFlags.DIRTY | NodeFlags.PENDING)) !== 0) {
            this.update();
        }

        // 2. Track this computed inside active observer context
        track(this);

        return this._value;
    }

    update(): void {
        // Skip if disposed
        if ((this.flags & NodeFlags.DISPOSED) !== 0) {
            return;
        }

        // If PENDING (and not DIRTY), check if dependencies actually changed
        if ((this.flags & NodeFlags.DIRTY) === 0 && (this.flags & NodeFlags.PENDING) !== 0) {
            if (!checkDependencies(this)) {
                // Dependencies did not change: clear PENDING and keep cached value
                this.flags &= ~NodeFlags.PENDING;
                return;
            }
        }

        // Clear DIRTY & PENDING flags before evaluating
        this.flags &= ~(NodeFlags.DIRTY | NodeFlags.PENDING);

        // Prevent recursive cycle
        if ((this.flags & NodeFlags.RUNNING) !== 0) {
            return;
        }

        this.flags |= NodeFlags.RUNNING;

        const prev = beginTracking(this);
        let newValue: T;
        try {
            newValue = this.fn();
        } finally {
            endTracking(prev);
            reconcile(this);
            this.flags &= ~NodeFlags.RUNNING;
        }

        // Equality check: only increment version if value actually changed
        if (this._value === newValue) {
            if (newValue === 0 && 1 / (newValue as number) !== 1 / (this._value as number)) {
                this._value = newValue;
                this.version++;
            }
        } else if (!Object.is(this._value, newValue)) {
            this._value = newValue;
            this.version++;
        }
    }

    dispose(): void {
        if ((this.flags & NodeFlags.DISPOSED) !== 0) {
            return;
        }

        this.flags |= NodeFlags.DISPOSED;
        unlink(this);
    }
}

export interface ReadonlySignal<T> {
    readonly value: T;
}

/**
 * Creates a lazy computed signal that updates when its tracked dependencies change.
 */
export function computed<T>(fn: ComputedGetter<T>): ReadonlySignal<T> {
    return new ComputedNode(fn);
}