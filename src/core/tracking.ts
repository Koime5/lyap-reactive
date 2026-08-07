import { link } from "../graph/link";
import { Node } from "./node";

export let activeObserver: Node | null = null;

export function track(source: Node) {

    if (activeObserver === null) return;

    link(source, activeObserver);
}