import { exec } from 'child_process';
export class CommandBase {
  protected commands: string[];
  protected ctx: any;

  constructor(ctx) {
    this.ctx = ctx;
    this.commands = (this.ctx.commands || []).slice(1);
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
    return new Promise((resolve, reject) => {
      exec(cmd, (err, result) => {
        if (err) {
          console.log('err', err);
          return reject(err);
        }
        resolve(result.replace(/\n$/, '').replace(/^\s*|\s*$/, ''));
      });
    });
  }
}
