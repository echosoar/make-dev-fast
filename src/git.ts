import { CommandBase } from './commandBase';
import * as enquirer from 'enquirer';
import { resolve } from 'path';
import { existsSync, writeFileSync, readFileSync } from 'fs';
import { IGitConfig, IUser } from './git.interface';
export class Git extends CommandBase {
  private info: any;
  private gitConfigPath: string = resolve(this.home, 'gitConfig.json');
  private gitConfig: any;
  protected async main() {
    await super.main();
    await this.getCurrentGitInfo();
    await this.subCommand();
  }

  private async getCurrentGitInfo() {
    const info: any = {};
    info.name = await this.exec(`git config --global user.name`);
    info.email = await this.exec(`git config user.email`);
    info.remoteName = (await this.exec(`git remote`)).split(/\n/)[0];
    info.remoteUrl = await this.exec(`git remote get-url ${info.remoteName}`);
    info.currenBranch = (await this.exec(`git branch`)).replace(/^\*\s*/, '');
    await this.checkUser(info);
    this.info = info;
    console.log('this.info', this.info);
  }

  private async checkUser(info) {
    /*
    user: [
      { user, email, matches: ['github.com'] }
    ]
    */

    const gitConfig: IGitConfig = this.getGitConfig();
    if (!gitConfig.user) {
      gitConfig.user = [];
    }
    let user = gitConfig.user.find((userInfo: IUser) => {
      return userInfo.name === info.name && userInfo.email === info.email;
    });

    if (!user) {
      console.log(`${info.name}<${info.email}> not exists!`);
      const type = await (enquirer as any).autocomplete({
        name: 'matchType',
        message: 'Select Doing',
        limit: 10,
        choices: [
          { name: 'add', message: 'Add a new user' },
          { name: 'select', message: 'Select a user' },
        ],
      });

      if (type === 'add') {
        user = await this.userAdd(info);
      } else {
        user = await this.userSelect(true, info);
      }
    }
    const matches = user.matches.find((match: string) => {
      return info.remoteUrl.indexOf(match) !== -1;
    });

    if (matches) {
      return;
    }

    console.log(`remote '${info.remoteUrl}' not match any user`);
  }

  private async subCommand() {
    switch (this.commands[0]) {
      case 'user': return this.user();
      case 'match': return this.userMatch();
      case 'ad': return this.ad();
      case 'ci': return this.ci();
      case 'ps': return this.ps();
    }
  }

  private async user() {
    switch (this.commands[1]) {
      case 'add':
        return this.userAdd();
    }
    const gitConfig: IGitConfig = this.getGitConfig();
    if (!gitConfig.user) {
      console.log('not set git user');
      return;
    }
    gitConfig.user.forEach((userInfo: IUser) => {
      console.log(`${userInfo.name}<${userInfo.email}>`);
      if (userInfo.matches && userInfo.matches.length) {
        userInfo.matches.forEach((match: string) => {
          console.log(`  - ${match}`);
        });
      }
    });
  }

  private async userAdd(info?): Promise<IUser> {
    const name = await (enquirer as any).input({
      message: 'Please input name',
      initial: info && info.name || '',
    });
    const email = await (enquirer as any).input({
      message: 'Please input email',
      initial: info && info.email || '',
    });
    const gitConfig: IGitConfig = this.getGitConfig();
    if (!gitConfig.user) {
      gitConfig.user = [];
    }
    const userExists = gitConfig.user.find((user: IUser) => {
      return user.name === name && user.email === email;
    });
    if (userExists) {
      console.error(`${name}<${email}> exists!`);
      return;
    }
    const newUserInfo = { name, email, matches: [] };
    gitConfig.user.push(newUserInfo);
    this.setGitConfig(gitConfig);
    console.log(`Add ${name}<${email}> success!`);
    return newUserInfo;
  }

  private async userMatch() {
    let type: string = this.commands[2];
    if (type !== 'add' && type !== 'remove' && type !== 'list') {
      type = await (enquirer as any).autocomplete({
        name: 'matchType',
        message: 'Select Doing',
        limit: 10,
        choices: [
          { name: 'add', message: 'Add a new match to user' },
          { name: 'remove', message: 'Remove match from user' },
          { name: 'list', message: 'List user matches' },
        ],
      });
    }
    const user: any = await this.userSelect(true);
    if (!user.matches) {
      user.matches = [];
    }
    switch (type) {
      case 'add':
        const matchUrl = await (enquirer as any).input({
          message: 'Please input match url',
        });
        const exists = user.matches.find((match) => match === matchUrl);
        if (exists) {
          console.log(`'${matchUrl}' existed!`);
          return;
        }
        user.matches.push(matchUrl);
        break;
      case 'remove':
        if (!user.matches.length) {
          console.log('no match');
          return;
        }
        const removeMatch = await (enquirer as any).autocomplete({
          name: 'removeMatch',
          message: 'Select which match will remove',
          limit: 10,
          choices: user.matches,
        });
        user.matches = user.matches.filter((match: string) => match === removeMatch);
        console.log(`${removeMatch} removed!`);
      case 'list':
        console.log(`${user.name}<${user.email}>`);
        if (user.matches && user.matches.length) {
          user.matches.forEach((match: string) => {
            console.log(`  - ${match}`);
          });
        } else {
          console.log(`  no match`);
        }
        return;
    }

    const gitConfig = this.getGitConfig();
    const index = gitConfig.user.findIndex((userInfo: IUser) => {
      return userInfo.name === user.name && userInfo.email === user.email;
    });
    console.log('index', index);
    gitConfig.user[index] = user;
    this.setGitConfig(gitConfig);
  }

  private async userSelect(autoAddNewUser?, autoAddNewUserInfo?): Promise<IUser> {
    const gitConfig = this.getGitConfig();
    if (!gitConfig || !gitConfig.user || !gitConfig.user.length) {
      console.log(`no user, please add a new user`);
      if (autoAddNewUser) {
        return this.userAdd(autoAddNewUserInfo);
      }
      return;
    }
    const userSelect = await (enquirer as any).autocomplete({
      name: 'user',
      message: 'Select Git User',
      limit: 10,
      choices: gitConfig.user.map((userInfo: IUser) => {
        return `${userInfo.name}<${userInfo.email}>`;
      }),
    });

    const userDetail = /^(.*?)<(.*?)>$/.exec(userSelect);
    return gitConfig.user.find((user: any) => {
      return user.name === userDetail[1] && user.email === userDetail[2];
    });
  }

  private getGitConfig() {
    if (this.gitConfig) {
      return this.gitConfig;
    }
    if (existsSync(this.gitConfigPath)) {
      this.gitConfig = JSON.parse(readFileSync(this.gitConfigPath).toString());
    } else {
      this.gitConfig = {};
    }
    return this.gitConfig;
  }

  private setGitConfig(gitConfig) {
    this.gitConfig = gitConfig;
    writeFileSync(this.gitConfigPath, JSON.stringify(gitConfig));
  }

  private async ad() {
    const result = await this.exec('git add --all');
    console.log(result);
  }

  private async ci() {
    if (!this.ctx.options.s) {
      await this.ad();
    }
    const st = await this.exec(`git status`);
    if (st.indexOf('nothing to commit') !== -1) {
      console.error('nothing to commit');
      process.exit();
    }
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
    if (!this.ctx.options.s) {
      await this.ci();
    }
    const result = await this.exec(`git push ${this.info.remoteName} ${this.info.currenBranch}`);
    console.log(result || 'Push success!');
  }
}
