import { Node } from "../core/node.js";
import { NodeFlags, NodeKind } from "../core/flags.js";
import { notify } from "../core/notify.js";
import { track } from "../core/tracking.js";

export class Signal<T> extends Node {
    _value: T;

    constructor(v: T) {
        super(NodeKind.SIGNAL);
        this._value = v;
    }

    get value(): T {
        track(this);
        return this._value;
    }

    set value(nv: T) {
        this.set(nv);
    }

    set(nv: T): void {
        // Ultra-fast IEEE 754 & Object.is compliant equality guard
        if (this._value === nv) {
            if (nv !== 0 || 1 / (nv as number) === 1 / (this._value as number)) return;
        } else if (Object.is(this._value, nv)) {
            return;
        }

        this._value = nv;
        this.version++;
        notify(this, NodeFlags.DIRTY);
    }
}

export function signal<T>(v: T): Signal<T> {
    return new Signal(v);
}