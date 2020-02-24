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
    try {
      info.name = await this.exec(`git config --global user.name`);
      info.email = await this.exec(`git config user.email`);
      info.remoteName = (await this.exec(`git remote`)).split(/\n/)[0];
      info.remoteUrl = await this.exec(`git remote get-url ${info.remoteName}`);
      info.currenBranch = (await this.exec(`git branch`)).split(/\n/).find((branch) => /^\*\s*/.test(branch)).replace(/^\*\s*/, '');
    } catch (e) { } finally {
      this.info = info;
    }
  }

  private async checkUser() {
    const info = this.info;

    if (!info.remoteName) {
      console.error('[Dev] This is not a git repository');
      process.exit(1);
    }

    const gitConfig: IGitConfig = this.getGitConfig();
    if (!gitConfig.user) {
      gitConfig.user = [];
    }
    let user = gitConfig.user.find((userInfo: IUser) => {
      return userInfo.name === info.name && userInfo.email === info.email;
    });

    if (!user) {
      user = await this.userSelect(true, info);
    }
    const matches = user.matches.find((match: string) => {
      return info.remoteUrl.indexOf(match) !== -1;
    });

    if (matches) {
      return;
    }

    console.log(`[Dev] The remote link '${info.remoteUrl}' cannot match the user.`);
    const newUser = await this.userMatch('add', info.remoteUrl);
    if (newUser.name !== info.name) {
      this.info.name = newUser.name;
      await this.exec(`git config user.name '${newUser.name}'`);
    }
    if (newUser.email !== info.email) {
      this.info.email = newUser.email;
      await this.exec(`git config user.email '${newUser.email}'`);
    }
  }

  private async subCommand() {
    switch (this.commands[0]) {
      case 'user': return this.user();
      case 'match': return this.userMatch();
      case 'ad': return this.ad();
      case 'ci': return this.ci();
      case 'ps': return this.ps();
      case 'pl': return this.pl();
    }
  }

  private async user() {
    switch (this.commands[1]) {
      case 'add':
        return this.userAdd();
    }
    const gitConfig: IGitConfig = this.getGitConfig();
    if (!gitConfig.user) {
      console.log('[Dev] Git user information has not been set!');
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
      console.error(`[Dev] ${name}<${email}> already exists!`);
      return;
    }
    const newUserInfo = { name, email, matches: [] };
    gitConfig.user.push(newUserInfo);
    this.setGitConfig(gitConfig);
    console.log(`[Dev] Add ${name}<${email}> succeeded!`);
    return newUserInfo;
  }

  private async userMatch(type?: string, defaultValue?: string) {
    type = type || this.commands[2];
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
          message: 'Please input matching url/rule',
          initial: defaultValue,
        });
        const exists = user.matches.find((match) => match === matchUrl);
        if (exists) {
          console.log(`[Dev] '${matchUrl}' already exists!`);
          return;
        }
        user.matches.push(matchUrl);
        break;
      case 'remove':
        if (!user.matches.length) {
          console.log('[Dev] No matching rule for current user');
          return;
        }
        const removeMatch = await (enquirer as any).autocomplete({
          name: 'removeMatch',
          message: 'Please select which matching rule to remove?',
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
          console.log(`  no matching rule`);
        }
        return;
    }

    const gitConfig = this.getGitConfig();
    const index = gitConfig.user.findIndex((userInfo: IUser) => {
      return userInfo.name === user.name && userInfo.email === user.email;
    });
    gitConfig.user[index] = user;
    this.setGitConfig(gitConfig);
    return user;
  }

  private async userSelect(autoAddNewUser?, autoAddNewUserInfo?): Promise<IUser> {
    const gitConfig = this.getGitConfig();
    if (!gitConfig || !gitConfig.user || !gitConfig.user.length) {
      console.log('[Dev] Git user information has not been set!');
      console.log(`[Dev] Please add a new user`);
      if (autoAddNewUser) {
        return this.userAdd(autoAddNewUserInfo);
      }
      return;
    }
    const addNewUser = 'Add a new user';
    const userSelect = await (enquirer as any).autocomplete({
      name: 'user',
      message: 'Select Git User',
      limit: 10,
      choices: gitConfig.user.map((userInfo: IUser) => {
        return `${userInfo.name}<${userInfo.email}>`;
      }).concat(addNewUser),
    });

    if (userSelect === addNewUser) {
      return this.userAdd(autoAddNewUserInfo);
    } else {
      const userDetail = /^(.*?)<(.*?)>$/.exec(userSelect);
      return gitConfig.user.find((user: any) => {
        return user.name === userDetail[1] && user.email === userDetail[2];
      });
    }
  }

  private getGitConfig() {
    if (this.gitConfig) {
      return this.gitConfig;
    }
    if (existsSync(this.gitConfigPath)) {
      try {
        this.gitConfig = JSON.parse(readFileSync(this.gitConfigPath).toString());
      } catch (e) {
        this.gitConfig = {};
      }
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
    await this.checkUser();
    const result = await this.exec('git add --all');
    console.log(result);
  }

  private async ci() {
    if (!this.ctx.options.s) {
      await this.ad();
    } else {
      await this.checkUser();
    }
    const st = await this.exec(`git status`);
    if (st.indexOf('nothing to commit') !== -1) {
      console.error('nothing to commit');
      process.exit();
    }
    const type = await (enquirer as any).autocomplete({
      name: 'commitType',
      message: 'Please select the type of this commit',
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
      message: 'Please input commit message',
    });
    const result = await this.exec(`git commit -m '${type}: ${message}'`);
    console.log(result);
  }

  private async ps() {
    if (!this.ctx.options.s) {
      await this.ci();
    } else {
      await this.checkUser();
    }
    const result = await this.exec(`git push ${this.info.remoteName} ${this.info.currenBranch}`);
    console.log(result || 'Push success!');
  }

  private async pl() {
    await this.checkUser();
    const result = await this.exec(`git pull ${this.info.remoteName} ${this.info.currenBranch}`);
    console.log(result || 'Pull success!');
  }
}
