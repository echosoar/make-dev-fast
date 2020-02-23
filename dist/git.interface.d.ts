export interface IUser {
    name: string;
    email: string;
    matches: string[];
}
export interface IGitConfig {
    user: IUser[];
}
