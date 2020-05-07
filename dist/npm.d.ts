import { CommandBase } from './commandBase';
export declare class Npm extends CommandBase {
    private pkg;
    private pkgPath;
    getCommands(): string[];
    execute(command: string): Promise<void>;
    setPackageJson(jsonData: any): boolean;
    getPackageJson(): any;
}
