import { IArg } from "./interface";

export class CLI {
    constructor(private args: IArg) {}
    async run() {
        console.log('args', this.args);
    }
}