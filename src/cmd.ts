import { CommandBase } from './commandBase';
import { resolve } from 'path';
import { existsSync } from 'fs';
import * as enquirer from 'enquirer';
import * as ora from 'ora';

export class Cmd extends CommandBase {
  public async execute() {
    const start = Date.now();
    const typeCmd = await this.checkType();
    const cmdCount = this.getCmdCount();

    const commandList: Array<{
      title: string;
      type: string;
      command: string;
      count: number;
    }> = [];

    if (typeCmd && typeCmd.client && typeCmd.client.getCommands) {
      typeCmd.client.getCommands().forEach((commandName: string) => {
        const title = `${typeCmd.type}: ${commandName}`;
        commandList.push({
          title,
          command: commandName,
          type: typeCmd.type,
          count: cmdCount[title] || 0,
        });
      });
    }

    const userCommand = this.ctx.cmdManager.getCommandList();
    if (userCommand && userCommand.length) {
      userCommand.forEach((userCmd) => {
        const title = `user: ${userCmd.title}`;
        commandList.push({
          title,
          command: userCmd.cmd,
          type: 'user',
          count: cmdCount[title] || 0,
        });
      });
    }

    if (!commandList.length) {
      console.log(`[dev] no command to execute!`);
      return;
    }

    let command = '';
    if (this.commands[0]) {
      command = `${typeCmd.type}: ${this.commands[0]}`;
    } else {
      command = await (enquirer as any).autocomplete({
        name: 'command',
        message: 'Select Command',
        limit: 10,
        choices: commandList.sort((a, b) => {
          return b.count - a.count;
        }).map((cmd) => cmd.title),
      });
    }
    const commandItem = commandList.find((cmd) => (cmd.title === command));
    if (!commandItem) {
      console.log(`[dev] command '${commandItem.command}' not found!`);
      return;
    }
    if (!cmdCount[command]) {
      cmdCount[command] = 0;
    }
    // x
    cmdCount[command] ++;
    this.setCmdCount(cmdCount);
    const spinner = ora(' executing...').start();
    try {
      if (typeCmd.type === commandItem.type) {
        await typeCmd.client.execute(commandItem.command);
      } else if (commandItem.type === 'user') {
        await this.exec(commandItem.command);
      }
    } catch (e) {
      spinner.stop();
      console.error(`[dev] '${commandItem.command}' error, message:`);
      console.error();
      console.error(e.message);
      console.error(e.trace);
      return;
    }
    spinner.stop();
    console.log(`[dev] '${commandItem.command}' succeed! (${Number((Date.now() - start) / 1000).toFixed(2)}s, ${cmdCount[command]}times)`);
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
