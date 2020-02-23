import { CommandBase } from './commandBase';
export declare class Git extends CommandBase {
    private info;
    protected main(): Promise<void>;
    private getCurrentGitInfo;
    private subCommand;
    private ad;
    private ci;
    private ps;
}
