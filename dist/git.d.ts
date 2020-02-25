import { CommandBase } from './commandBase';
export declare class Git extends CommandBase {
    private info;
    private gitConfig;
    protected main(): Promise<void>;
    private getCurrentGitInfo;
    private checkUser;
    private subCommand;
    private displayGitInfo;
    private user;
    private userAdd;
    private userMatch;
    private userSelect;
    private getGitConfig;
    private setGitConfig;
    private ad;
    private ci;
    private ps;
    private pl;
}
