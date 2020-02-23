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

  protected async exec(cmd: string): Promise<string> {
    if (!cmd) {
      return '';
    }
    return new Promise((resolved, rejected) => {
      exec(cmd, (err, result) => {
        if (err) {
          console.log('err', err);
          return rejected(err);
        }
        resolved(result.replace(/\n$/, '').replace(/^\s*|\s*$/, ''));
      });
    });
  }

  private _init() {
    if (!existsSync(this.home)) {
      mkdirSync(this.home);
    }
  }
}
