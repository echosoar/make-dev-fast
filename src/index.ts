import * as minimist from 'minimist';
import * as enquirer from 'enquirer';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { Git } from './git';
import { Npm } from './npm';
class MDF {
  public options: any;
  public commands: string[];
  private git: any;
  private npm: any;

  constructor(argv) {
    this.options = minimist(argv.slice(2));
    this.commands = this.options._ || [];

    this.git = new Git(this);
    this.npm = new Npm(this);
    this.main();
  }

  private async main() {
    if (!this.commands || !this.commands.length) {
      const typeCmd = await this.checkType();
      let commands: string[] = [];
      if (typeCmd && typeCmd.client.getCommands) {
        commands = typeCmd.client.getCommands().map((cmd: string) => {
          return `${typeCmd.type}: ${cmd}`;
        });
      }

      if (commands && commands.length) {
        const command = await (enquirer as any).autocomplete({
          name: 'command',
          message: 'Select Command',
          limit: 10,
          choices: commands,
        });
        const commandValue = command.split(': ')[1];
        if (typeCmd.client && typeCmd.client.execute) {
          await typeCmd.client.execute(commandValue);
        }
        console.log(`[dev] command '${command}' execute succeed!`);
      }
      return;
    }
    switch (this.commands[0]) {
      case 'git':
        return this.git.main();
    }
  }

  private async checkType(): Promise<any> {
    if (existsSync(resolve(process.cwd(), 'package.json'))) {
      return { type: 'npm', client: this.npm };
    }
    return '';
  }
}

export = MDF;
