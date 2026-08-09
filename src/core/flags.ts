export const enum NodeFlags {
    //scheduler flags
    CLEAN = 0,
    DIRTY = 1 << 0,
    RUNNING = 1 << 1,
    QUEUED = 1 << 2,

    //lifecycle flags
    DISPOSED = 1 << 3,

    /**
     * When set, `sourceLink` is an Edge (head of a doubly-linked list of
     * dependency nodes). When absent, `sourceLink` is either a single Node
     * or null.
     */
    SOURCE_EDGE = 1 << 4,

    /**
     * When set, `observerLink` is an Edge (head of a doubly-linked list of
     * observer nodes). When absent, `observerLink` is either a single Node
     * or null.
     */
    OBSERVER_EDGE = 1 << 5,

    /**
     * Set on an observer when a upstream computed dependency is marked dirty.
     * Indicates that dependencies MAY have changed, but computed evaluation is required.
     */
    PENDING = 1 << 6,
}

export interface Flagged {
    flags: number;
}


export function addFlag(obj: Flagged, flag: NodeFlags): void {
    obj.flags |= flag;
}


export function removeFlag(obj: Flagged, flag: NodeFlags): void {
    obj.flags &= ~flag;
}


export function hasFlag(obj: Flagged, flag: NodeFlags): boolean {
    return (obj.flags & flag) !== 0;
}

export const enum NodeKind {
    SIGNAL,
    COMPUTED,
    EFFECT,
}