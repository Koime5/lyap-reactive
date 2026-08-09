import { Node } from "../core/node.js";
import { notify } from "../core/notify.js";
import { track } from "../core/tracking.js";

export class Signal<T> extends Node {
    _value: T;

    constructor(v: T) {
        super();
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
        if (Object.is(this._value, nv)) return;

        this._value = nv;
        this.version++;
        notify(this);
    }
}

export function signal<T>(v: T): Signal<T> {
    return new Signal(v);
}