import { Node } from "../core/node";

export class EffectNode extends Node {
    
    effect: () => void;

    constructor(fn: () => void) {
        super();
        this.effect = fn;
    }
}