import { exec } from 'child_process';
import { homedir } from 'os';
import { resolve } from 'path';
import { existsSync, mkdirSync } from 'fs';
export class CommandBase {
  protected commands: string[];
  protected ctx: any;
  protected home: string = resolve(homedir(), '.devFast');

  constructor(ctx) {
    this.ctx = ctx;
    this.commands = (this.ctx.commands || []).slice(1);
    this._init();
  }

  protected async main() {
    if (!this.commands || !this.commands.length) {
      return;
    }
  }

  protected async exec(cmd: string, options?: any): Promise<string> {
    if (!cmd) {
      return '';
    }
    return new Promise((resolved, rejected) => {
      const execProcess = exec(cmd, (err, result) => {
        if (err) {
          return rejected(err);
        }
        resolved(result.replace(/\n$/, '').replace(/^\s*|\s*$/, ''));
      });
      execProcess.stdout.on('data', (data) => {
        if (!options || !options.slience) {
          console.log(data);
        }
      });
    });
  }

  private _init() {
    if (!existsSync(this.home)) {
      mkdirSync(this.home);
    }
  }
}
