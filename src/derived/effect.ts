import { Node } from "../core/node.js";
import { NodeFlags, NodeKind } from "../core/flags.js";
import { beginTracking, endTracking, reconcile } from "../core/tracking.js";
import { unlink } from "../graph/unlink.js";
import { markDirty, checkDependencies } from "../core/dirty.js";
import { activeScope } from "../scope/scope.js";

export type EffectFn = (onCleanup: (cleanupFn: () => void) => void) => void;
export type CleanupFn = () => void;

export let activeEffect: EffectNode | null = null;

/**
 * Registers a cleanup callback for the currently executing effect.
 */
export function onCleanup(fn: CleanupFn): void {
    if (activeEffect === null) return;

    const prevCleanup = activeEffect.cleanup;
    if (prevCleanup === null) {
        activeEffect.cleanup = fn;
    } else {
        activeEffect.cleanup = () => {
            try {
                prevCleanup();
            } finally {
                fn();
            }
        };
    }
}

export class EffectNode extends Node {
    fn: EffectFn;
    cleanup: CleanupFn | null = null;

    constructor(fn: EffectFn) {
        super(NodeKind.EFFECT);
        this.fn = fn;
    }

    registerCleanup(cleanupFn: () => void): void {
        this.cleanup = cleanupFn;
    }

    run(): void {
        // Skip if disposed
        if ((this.flags & NodeFlags.DISPOSED) !== 0) {
            return;
        }

        // Prevent recursive execution
        if ((this.flags & NodeFlags.RUNNING) !== 0) {
            return;
        }

        // If PENDING (and not DIRTY), verify if dependencies actually changed
        if ((this.flags & NodeFlags.DIRTY) === 0 && (this.flags & NodeFlags.PENDING) !== 0) {
            if (!checkDependencies(this)) {
                this.flags &= ~NodeFlags.PENDING;
                return;
            }
        }

        this.flags |= NodeFlags.RUNNING;

        // Execute previous cleanup if registered
        if (this.cleanup !== null) {
            try {
                this.cleanup();
            } finally {
                this.cleanup = null;
            }
        }

        // Clear DIRTY & PENDING flags
        this.flags &= ~(NodeFlags.DIRTY | NodeFlags.PENDING);

        const prevTracking = beginTracking(this);
        const prevEffect = activeEffect;
        activeEffect = this;

        try {
            this.fn((fn) => this.registerCleanup(fn));
        } finally {
            activeEffect = prevEffect;
            endTracking(prevTracking);
            reconcile(this);
            this.flags &= ~NodeFlags.RUNNING;
        }
    }

    dispose(): void {
        if ((this.flags & NodeFlags.DISPOSED) !== 0) {
            return;
        }

        this.flags |= NodeFlags.DISPOSED;

        // Run user cleanup if registered
        if (this.cleanup !== null) {
            try {
                this.cleanup();
            } finally {
                this.cleanup = null;
            }
        }

        // Unlink all graph dependency edges
        unlink(this);
    }
}

export interface EffectOptions {
    defer?: boolean;
}

/**
 * Creates a reactive side effect that re-runs when its tracked dependencies change.
 * Returns a disposer function to tear down the effect.
 */
export function effect(fn: EffectFn, options?: EffectOptions): () => void {
    const node = new EffectNode(fn);

    if (options?.defer) {
        markDirty(node, NodeFlags.DIRTY);
    } else {
        node.run();
    }

    const dispose = () => node.dispose();

    if (activeScope !== null) {
        activeScope.add(dispose);
    }

    return dispose;
}