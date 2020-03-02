declare class MDF {
    options: any;
    commands: string[];
    private git;
    private cmd;
    private config;
    private cmdManager;
    constructor(argv: any);
    getStore(key: any): any;
    private main;
}
export = MDF;
