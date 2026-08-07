export const enum NodeFlags {
    CLEAN = 0,
    DIRTY = 1 << 0,
    RUNNING = 1 << 1,
    QUEUED = 1 << 2,
    DISPOSED = 1 << 3,
}