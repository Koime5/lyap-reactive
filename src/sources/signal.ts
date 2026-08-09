import { Node } from "../core/node";
import { notify } from "../core/notify";
import { track } from "../core/tracking";

export class SignalNode<T> extends Node {
    constructor(
        public value: T
    ) {
        super();
    }
}

export interface Signal<T> {
    readonly value: T;
    set(value: T): void;
}

export function signal<T>(v: T): Signal<T> {
    const node = new SignalNode(v);

    return {
        get value() {

            track(node);
            return node.value;
        },
        
        set(nv: T) {

            setSignal(node, nv);
        }
    }
}

function setSignal<T>(node: SignalNode<T>, value: T) {

    if (Object.is(node.value, value)) return;

    node.value = value;
    node.version++;
    notify(node);
}