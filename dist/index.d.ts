declare class MDF {
    options: any;
    commands: string[];
    private git;
    private npm;
    constructor(argv: any);
    private main;
    private checkType;
}
export = MDF;
