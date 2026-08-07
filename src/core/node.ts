import type { Owner } from "../scope/owner.js";
import type { Edge } from "./edge.js";
import { NodeFlags } from "./flags.js";

export abstract class Node {

    flags = NodeFlags.CLEAN;

    version = 0;

    sourceHead: Edge | null = null;
    observerHead: Edge | null = null;

    owner: Owner | null = null;
}