import { CommandBase } from './commandBase';
import * as enquirer from 'enquirer';
export class CmdManager extends CommandBase {
  public getCommandList() {
    return this.ctx.config.get(`user_cmd_${process.cwd()}`) || [];
  }

  public putCommandList(title, cmd) {
    const list = this.getCommandList();
    const find = list.find((item) => item.title === title);
    if (find) {
      return;
    }
    list.push({
      title,
      cmd,
    });
    return this.ctx.config.set(`user_cmd_${process.cwd()}`, list);
  }

  public removeCommand(title) {
    const list = this.getCommandList();
    const result = list.filter((item) => item.title !== title);
    return this.ctx.config.set(`user_cmd_${process.cwd()}`, result);
  }

  public async main() {
    switch (this.commands[0]) {
      case 'add': return this.add();
      case 'list': return this.displayList();
      case 'remove': return this.remove();
    }
  }

  private async add() {
    const title = await (enquirer as any).input({
      message: 'Please input command title',
      initial: '',
    });
    const cmd = await (enquirer as any).input({
      message: 'Please input command',
      initial: '',
    });
    this.putCommandList(title, cmd);
    console.log(`[Dev] Add user command '${title}' success!`);
  }

  private async displayList() {
    const list = this.getCommandList();
    if (!list || !list.length) {
      console.log('[Dev] User command has not been set!');
      return;
    }
    list.forEach((cmd) => {
      console.log(`${cmd.title}(${cmd.cmd})`);
    });
  }

  private async remove() {
    const list = this.getCommandList();
    if (!list || !list.length) {
      console.log('[Dev] User command has not been set!');
      return;
    }
    const cmdSelect = await (enquirer as any).autocomplete({
      name: 'cmd',
      message: 'Select command to remove',
      limit: 10,
      choices: list.map((cmd) => {
        return `${cmd.title}(${cmd.cmd})`;
      }),
    });

    const cmdInfo = /^(.*?)\(.*$/.exec(cmdSelect);
    this.removeCommand(cmdInfo[1]);
    console.log(`[Dev] Remove user command '${cmdInfo[1]}' success!`);
  }
}
