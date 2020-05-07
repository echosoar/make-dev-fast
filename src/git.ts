import { CommandBase } from './commandBase';
import * as enquirer from 'enquirer';
import { IGitConfig, IUser, IGitOptions } from './git.interface';
export class Git extends CommandBase {
  private info: any;
  private gitConfig: any;
  protected async main() {
    await super.main();
    await this.getCurrentGitInfo();
    await this.subCommand();
  }

  private async getCurrentGitInfo() {
    const info: any = {};
    try {
      info.name = await this.exec(`git config user.name`, { slience: true });
      info.email = await this.exec(`git config user.email`, { slience: true });
      info.remoteName = (await this.exec(`git remote`, { slience: true })).split(/\n/)[0];
      info.remoteGitUrl = await this.exec(`git remote get-url ${info.remoteName}`, { slience: true });
      if (/^git@/i.test(info.remoteGitUrl)) {
        info.remoteUrl = info.remoteGitUrl.replace(':', '/').replace('git@', 'https://').replace(/\.git$/, '');
      } else {
        info.remoteUrl = info.remoteGitUrl.replace(/\.git$/, '');
      }
      info.currenBranch = (await this.exec(`git branch`, { slience: true })).split(/\n/).find((branch) => /^\*\s*/.test(branch)).replace(/^\*\s*/, '');
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
      return info.remoteGitUrl.indexOf(match) !== -1;
    });

    if (matches) {
      return;
    }

    console.log(`[Dev] The remote link '${info.remoteGitUrl}' cannot match the user.`);
    const newUser = await this.userMatch('add', info.remoteGitUrl);
    if (newUser.name !== info.name) {
      this.info.name = newUser.name;
      await this.exec(`git config user.name '${newUser.name}'`, { slience: true });
    }
    if (newUser.email !== info.email) {
      this.info.email = newUser.email;
      await this.exec(`git config user.email '${newUser.email}'`, { slience: true });
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
      case 'release': return this.release();
    }
    return this.displayGitInfo();
  }

  private displayGitInfo() {
    Object.keys(this.info).forEach((info: string) => {
      console.log(`${(info.replace(/([A-Z])/g, ' $1').replace(/^(.)/, (match: string) => match.toUpperCase()) + ':').padEnd(20)}${this.info[info]}`);
    });
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
    this.gitConfig = this.ctx.config.get('gitConfig') || {};
    return this.gitConfig;
  }

  private setGitConfig(gitConfig) {
    this.gitConfig = gitConfig;
    this.ctx.config.set('gitConfig', gitConfig);
  }

  private async ad() {
    await this.checkUser();
    await this.exec('git add --all');
    console.log('Add success');
  }

  private async ci(options?: IGitOptions) {
    if (!this.ctx.options.s) {
      await this.ad();
    } else {
      await this.checkUser();
    }
    const st = await this.exec(`git status`, { slience: true });
    if (st.indexOf('nothing to commit') !== -1) {
      console.error('nothing to commit');
      process.exit();
    }
    const type = options.commitType || await (enquirer as any).autocomplete({
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
    const message = options.message || await (enquirer as any).input({
      message: 'Please input commit message',
    });
    await this.exec(`git commit -m '${type}: ${message}'`);
    console.log('Commit success');
  }

  private async ps(options?: IGitOptions) {
    if (!this.ctx.options.s) {
      await this.ci(options);
    } else {
      await this.checkUser();
    }
    await this.exec(`git push ${this.info.remoteName} ${this.info.currenBranch}`);
    console.log('Push success');
  }

  private async pl() {
    await this.checkUser();
    await this.exec(`git pull ${this.info.remoteName} ${this.info.currenBranch}`);
    console.log('Pull success');
  }

  private async release() {
    await this.checkUser();
    const tag = await this.getNewTag();
    if (!tag) {
      console.log('Release Error');
      return;
    }
    await this.exec(`git tag v${tag}`);
    await this.exec(`git push ${this.info.remoteName} v${tag}`);
  }

  // 获取新的tag
  private async getNewTag() {
    let currentVersion = this.commands[1];
    let versionFrom = `command`;
    let versionOrigin = currentVersion;
    if (this.ctx.npm) {
      const pkg = this.ctx.npm.getPackageJson();
      versionOrigin = pkg.version;
      versionFrom = 'package.json';
    }
    if (!currentVersion) {
      currentVersion = versionOrigin;
    }
    const vtype = await (enquirer as any).autocomplete({
      name: 'releaseVersion',
      message: 'Release version',
      choices: [
        { name: 'current', message: `Current ${versionFrom} ${currentVersion}` },
        { name: 'new', message: 'Input a new version' },
      ],
    });
    if (vtype === 'new') {
      currentVersion = await (enquirer as any).input({
        message: 'Please input new version (e.g. 0.0.1)',
        initial: currentVersion,
      });
    }
    if (versionOrigin !== currentVersion) {
      if ( this.ctx.npm) {
        const setResult = this.ctx.npm.setPackageJson({ version: currentVersion });
        if (setResult) {
          await this.ps({
            commitType: 'release',
            message: `v${currentVersion}`,
          });
        } else {
          console.log(`Set version ${currentVersion} to ${versionFrom} error`);
          return;
        }
      }
    }
    return currentVersion;
  }
}
