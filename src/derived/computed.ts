import { Node } from "../core/node";

export class ComputedNode<T> extends Node {

    value!: T;
    
    compute: () => T;

    constructor(fn: () => T) {
        super();
        this.compute = fn;
    }
}