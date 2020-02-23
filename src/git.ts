import { CommandBase } from './commandBase';
import * as enquirer from 'enquirer';
export class Git extends CommandBase {
  private info: any;
  protected async main() {
    await super.main();
    await this.getCurrentGitInfo();
    await this.subCommand();
  }

  private async getCurrentGitInfo() {
    const info: any = {};
    info.user = await this.exec(`git config --global user.name`);
    info.email = await this.exec(`git config user.email`);
    info.remoteName = (await this.exec(`git remote`)).split(/\n/)[0];
    info.remoteUrl = await this.exec(`git remote get-url ${info.remoteName}`);
    const remoteHostMatch = /git@(.*?):|\/\/(.*?)\//.exec(info.remoteUrl);
    if (remoteHostMatch) {
      info.remoteHost = remoteHostMatch[1] || remoteHostMatch[2];
    }
    info.currenBranch = (await this.exec(`git branch`)).replace(/^\*\s*/, '');
    this.info = info;
    console.log('this.info', this.info);
  }

  private async subCommand() {
    switch (this.commands[0]) {
      case 'ad': return this.ad();
      case 'ci': return this.ci();
      case 'ps': return this.ps();
    }
  }

  private async ad() {
    const result = await this.exec('git add --all');
    console.log(result);
  }

  private async ci() {
    if (this.ctx.options.a) {
      await this.ad();
    }
    console.log(this.st());
    const type = await (enquirer as any).autocomplete({
      name: 'commitType',
      message: 'Select Commit Type',
      limit: 10,
      choices: [
        { name: 'feat', message: 'feat: 新增功能' },
        { name: 'fix', message: 'fix: 修复bug' },
        { name: 'docs', message: 'docs: 修改文档' },
        { name: 'refactor', message: 'refactor: 代码重构，未新增任何功能和修复任何bug' },
        { name: 'build', message: 'build: 改变构建流程，新增依赖库、工具等（例如webpack修改）' },
        { name: 'style', message: 'style: 仅仅修改了空格、缩进等，不改变代码逻辑' },
        { name: 'perf', message: 'perf: 改善性能和体现的修改' },
        { name: 'chore', message: 'chore: 非src和test的修改' },
        { name: 'test', message: 'test: 测试用例的修改' },
        { name: 'ci', message: 'ci: 自动化流程配置修改' },
        { name: 'revert', message: 'revert: 回滚到上一个版本' },
      ],
    });
    const message = await (enquirer as any).input({
      message: 'Please input message',
    });
    const result = await this.exec(`git commit -m '${type}: ${message}'`);
    console.log(result);
  }

  private async ps() {
    if (this.ctx.options.a) {
      await this.ci();
    }
    const result = await this.exec(`git push ${this.info.remoteName} ${this.info.currenBranch}`);
    console.log(result);
  }

  private async st() {
    console.log('st');
  }
}
