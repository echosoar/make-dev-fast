export declare class CommandBase {
    protected commands: string[];
    protected ctx: any;
    constructor(ctx: any);
    protected main(): Promise<void>;
    protected exec(cmd: string): Promise<string>;
}
