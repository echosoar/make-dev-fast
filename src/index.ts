import * as minimist from 'minimist';
import * as configstore from 'configstore';
import { Git } from './git';
import { Npm } from './npm';
import { Cmd } from './cmd';
import { CmdManager } from './cmdManager';
class MDF {
  public options: any;
  public commands: string[];
  private git: any;
  private cmd: any;
  private config: any;
  private cmdManager: any;

  constructor(argv) {
    this.options = minimist(argv.slice(2));
    this.commands = this.options._ || [];
    this.config = new configstore('make-dev-fast');
    Object.assign(this, {
      npm: new Npm(this),
    });
    this.git = new Git(this);
    this.cmd = new Cmd(this);
    this.cmdManager = new CmdManager(this);
    this.main().catch((e) => {});
  }

  public getStore(key) {
    return this.config.get(key);
  }

  private async main() {
    if (!this.commands || !this.commands.length || this.commands[0] === 'run') {
      await this.cmd.execute();
      return;
    }
    switch (this.commands[0]) {
      case 'git':
      case 'g':
        return this.git.main();
      case 'command':
        return this.cmdManager.main();
    }
  }
}

export = MDF;
