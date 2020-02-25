import { CommandBase } from './commandBase';
import { resolve } from 'path';
import { existsSync } from 'fs';
import * as enquirer from 'enquirer';

export class Cmd extends CommandBase {
  public async execute() {
    const typeCmd = await this.checkType();
    const cmdCount = this.getCmdCount();
    let commands: string[] = [];
    if (typeCmd && typeCmd.client.getCommands) {
      commands = typeCmd.client.getCommands().map((cmd: string) => {
        return `${typeCmd.type}: ${cmd}`;
      }).sort((cmdA, cmdB) => {
        return (cmdCount[cmdB] || 0) - (cmdCount[cmdA] || 0);
      });
    }

    if (commands && commands.length) {
      const command = await (enquirer as any).autocomplete({
        name: 'command',
        message: 'Select Command',
        limit: 10,
        choices: commands,
      });
      if (!cmdCount[command]) {
        cmdCount[command] = 0;
      }
      cmdCount[command] ++;
      this.setCmdCount(cmdCount);
      const commandValue = command.split(': ')[1];
      if (typeCmd.client && typeCmd.client.execute) {
        await typeCmd.client.execute(commandValue);
      }
      console.log(`[dev] command '${command}' execute succeed!`);
    }
  }
  private async checkType(): Promise<any> {
    if (existsSync(resolve(process.cwd(), 'package.json'))) {
      return { type: 'npm', client: this.ctx.npm };
    }
    return '';
  }

  private getCmdCount() {
    return this.ctx.config.get(`cmd_${process.cwd()}`) || {};
  }

  private setCmdCount(cmdCount) {
    return this.ctx.config.set(`cmd_${process.cwd()}`, cmdCount || {});
  }
}
