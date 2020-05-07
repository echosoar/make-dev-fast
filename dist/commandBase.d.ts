export declare class CommandBase {
    protected commands: string[];
    protected ctx: any;
    protected home: string;
    constructor(ctx: any);
    protected main(): Promise<void>;
    protected exec(cmd: string, options?: any): Promise<string>;
    private _init;
}
