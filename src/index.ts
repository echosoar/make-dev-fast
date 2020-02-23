import * as minimist from 'minimist';
import { Git } from './git';
class MDF {
  public options: any;
  public commands: string[];
  private git: any;

  constructor(argv) {
    this.options = minimist(argv.slice(2));
    this.commands = this.options._ || [];

    this.git = new Git(this);
    this.main();
  }

  private async main() {

    if (!this.commands || !this.commands.length) {
      return;
    }
    switch (this.commands[0]) {
      case 'git':
        return this.git.main();
    }
  }
}

export = MDF;
