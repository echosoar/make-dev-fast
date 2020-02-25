declare class MDF {
    options: any;
    commands: string[];
    private git;
    private npm;
    private config;
    constructor(argv: any);
    getStore(key: any): any;
    private main;
    private checkType;
}
export = MDF;
