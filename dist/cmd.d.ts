import { CommandBase } from './commandBase';
export declare class Cmd extends CommandBase {
    execute(): Promise<void>;
    private checkType;
    private getCmdCount;
    private setCmdCount;
}
