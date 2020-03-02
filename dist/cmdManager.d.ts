import { CommandBase } from './commandBase';
export declare class CmdManager extends CommandBase {
    getCommandList(): any;
    putCommandList(title: any, cmd: any): any;
    removeCommand(title: any): any;
    main(): Promise<void>;
    private add;
    private displayList;
    private remove;
}
