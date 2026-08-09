export class Scope {
    parent: Scope | null = null;
    disposers: Array<() => void> | null = null;
    isDisposed = false;

    add(disposer: () => void): void {
        if (this.isDisposed) {
            disposer();
            return;
        }
        if (this.disposers === null) {
            this.disposers = [disposer];
        } else {
            this.disposers.push(disposer);
        }
    }

    dispose(): void {
        if (this.isDisposed) return;
        this.isDisposed = true;

        if (this.disposers !== null) {
            for (let i = 0; i < this.disposers.length; i++) {
                try {
                    this.disposers[i]!();
                } catch (e) {
                    console.error("Error during scope disposal:", e);
                }
            }
            this.disposers = null;
        }
    }
}

export let activeScope: Scope | null = null;

/**
 * Creates an owner scope that tracks and automatically disposes all child effects created within its execution.
 */
export function createScope<T>(fn: (scope: Scope) => T): { result: T; scope: Scope } {
    const scope = new Scope();
    const prevScope = activeScope;

    if (prevScope !== null) {
        scope.parent = prevScope;
        prevScope.add(() => scope.dispose());
    }

    activeScope = scope;
    try {
        const result = fn(scope);
        return { result, scope };
    } finally {
        activeScope = prevScope;
    }
}
