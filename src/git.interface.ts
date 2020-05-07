export interface IUser {
  name: string;
  email: string;
  matches: string[];
}
export interface IGitConfig {
  user: IUser[];
}

export interface IGitOptions {
  commitType?: string;
  message?: string;
}