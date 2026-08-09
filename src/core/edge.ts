import type { Node } from "./node";

export class Edge {

    // dependency
    source: Node | null = null;

    // observer!!!
    target: Node | null = null;

    // linked list inside source
    nextSource: Edge | null = null;
    prevSource: Edge | null = null;

    // linked list inside target
    nextTarget: Edge | null = null;
    prevTarget: Edge | null = null;

    // version observed by target
    seenVersion = 0;

    seenEpoch = 0;

    reset(): void {

        this.source = null;
        this.target = null;

        this.nextSource = null;
        this.prevSource = null;

        this.nextTarget = null;
        this.prevTarget = null;

        this.seenVersion = 0;
        this.seenEpoch = 0;
    }

}

export class EdgePool {

    private readonly free: Edge[] = [];

    acquire(): Edge {
        return this.free.pop() ?? new Edge();
    }

    release(edge: Edge): void {
        edge.reset();
        this.free.push(edge);
    }
}

export const globalEdgePool = new EdgePool();