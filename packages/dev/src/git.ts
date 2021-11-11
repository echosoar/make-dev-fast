import { BasePlugin } from '@midwayjs/command-core';
import { exec, getCache, setCache } from './utils';
import * as enquirer from 'enquirer';
export class GitPlugin extends BasePlugin {
  commands = {
    git: {
      usage: 'dev git',
      lifecycleEvents: [ 'do' ],
    },
    clone: {
      usage: 'dev c/clone',
      lifecycleEvents: [ 'do' ],
      passingCommand: true,
      alias: 'c',
    },
    push: {
      usage: 'dev ps/push',
      lifecycleEvents: [ 'do' ],
      alias: 'ps'
    },
    status: {
      usage: 'dev st/status',
      lifecycleEvents: [ 'do' ],
      alias: 'st'
    },
    checkout: {
      usage: 'dev co/checkout',
      lifecycleEvents: [ 'do' ],
      passingCommand: true,
      alias: 'co'
    }
  };

  hooks = {
    'git:do': this.handleGitDo.bind(this),
    'clone:do': this.handleCloneDo.bind(this),
    'push:do': this.handlePushDo.bind(this),
    'status:do': this.handleStatusDo.bind(this),
    'checkout:do': this.handleCheckoutDo.bind(this),
  };

  gitInfo: any = {};

  async handleGitDo() {
    await this.getCurrentGitInfo();
    console.log(JSON.stringify(this.gitInfo, null, 2));
  }

  async handleCloneDo() {
    const { commands } = this.core.coreOptions;
    let gitAddress: string = commands[1];
    gitAddress = gitAddress.replace(/[\?\#].*$/, '');
    let dirName = '';
    let branch = '';
    if (gitAddress.startsWith('http')) {
      gitAddress = gitAddress.replace(/^https?:\/\//i, '');
      const gitAddressSplit = gitAddress.split('/');
      const name = gitAddressSplit[2].replace(/\.git$/i, '');
      dirName = name;
      gitAddress = `git@${gitAddressSplit[0]}:${gitAddressSplit[1]}/${name}.git`
      if (gitAddressSplit[3] === 'tree' || gitAddressSplit[3] === 'blob') {
        branch = gitAddressSplit[4];
        if (['daily', 'feature', 'releases', 'feat', 'test', 'fix', 'doc', 'tags'].includes(branch) && gitAddressSplit[5]) {
          branch += '/' + gitAddressSplit[5];
        }
      }
    } else if (gitAddress.startsWith('git@')) {
      const gitAddressSplit = gitAddress.split('/');
      dirName = gitAddressSplit.pop().replace(/\.git$/i, '');
    }
    console.log(`git repo ${gitAddress} cloning...`);
    await exec(`git clone ${gitAddress}${dirName ? ` ${dirName}` : ''}`);
    if (branch) {
      await exec(`cd ${dirName};git checkout ${branch} --`);
      console.log(`auto change banch to ${branch}`);
    }
    console.log(`git clone ${gitAddress} ${dirName ? `to ${dirName} `:''}success`);
  }

  async checkUser() {
    await this.getCurrentGitInfo();
    const info = this.gitInfo;

    if (!info.remoteName) {
      console.error('[Dev] This is not a git repository');
      process.exit(1);
    }

    const users: any = await getCache('git', 'users') || [];
    // 当前用户
    let user = users.find((userInfo) => {
      return userInfo.name === info.name && userInfo.email === info.email;
    });

    // 选择或新增用户
    if (!user) {
      user = await this.userSelect(info);
    }

    const matches = user.matches.find((match: string) => {
      return info.remoteGitUrl.indexOf(match) !== -1;
    });

    // 匹配上了
    if (matches) {
      return;
    }

    console.log(`[Dev] The remote link '${info.remoteGitUrl}' cannot match the user.`);
    const newUser: any = await this.addGitRepoToUser(info);
    if (newUser.name !== info.name) {
      this.gitInfo.name = newUser.name;
      await exec(`git config user.name '${newUser.name}'`);
    }
    if (newUser.email !== info.email) {
      this.gitInfo.email = newUser.email;
      await exec(`git config user.email '${newUser.email}'`);
    }
  }

  // 
  async userSelect(gitInfo) {
    const users: any = await getCache('git', 'users') || [];
    if (!users.length) {
      return this.userAdd(gitInfo);
    }
    const addNewUser = 'Add a new user';
    const userSelect = await (enquirer as any).autocomplete({
      name: 'user',
      message: 'Select Git User',
      limit: 10,
      choices: users.map((userInfo) => {
        return `${userInfo.name}<${userInfo.email}>`;
      }).concat(addNewUser),
    });

    if (userSelect === addNewUser) {
      return this.userAdd(gitInfo);
    } else {
      const userDetail = /^(.*?)<(.*?)>$/.exec(userSelect);
      return users.find((user: any) => {
        return user.name === userDetail[1] && user.email === userDetail[2];
      });
    }
  }

  private async userAdd(info?): Promise<any> {
    const name = await (enquirer as any).input({
      message: 'Please input name',
      initial: info && info.name || '',
    });
    const email = await (enquirer as any).input({
      message: 'Please input email',
      initial: info && info.email || '',
    });
    const users: any = await getCache('git', 'users') || [];
    const userExists = users.find((user: any) => {
      return user.name === name && user.email === email;
    });
    if (userExists) {
      console.error(`[Dev] ${name}<${email}> already exists!`);
      return;
    }
    const newUserInfo = { name, email, matches: [] };
    users.push(newUserInfo);
    setCache('git', 'users', users);
    console.log(`[Dev] Add ${name}<${email}> succeeded!`);
    return newUserInfo;
  }

  // 
  async addGitRepoToUser(gitInfo) {
    const user: any = await this.userSelect(gitInfo);
    const matchUrl = await (enquirer as any).input({
      message: 'Please input matching url/rule',
      initial: gitInfo.remoteGitUrl,
    });
    const exists = user.matches.find((match) => match === matchUrl);
    if (!exists) {
      const users: any = await getCache('git', 'users') || [];
      const findUser = users.find((userInfo: any) => {
        return user.name === userInfo.name && user.email === userInfo.email;
      });
      if (!findUser.matches) {
        findUser.matches = []
      }
      findUser.matches.push(matchUrl);
      setCache('git', 'users', users);
    }
    return user;


  }

  async handleAddDo() {
    await this.checkUser();
    await exec('git add --all');
  }

  async handleCommitDo() {
    await this.handleAddDo();
    const st = await exec(`git status`);
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
        { name: 'release', message: 'release: 发布新版本' },
      ],
    });
    const message = await (enquirer as any).input({
      message: 'Please input commit message',
    });
    await exec(`git commit -m '${type}: ${message}'`);
  }

  async handlePushDo() {
    await this.handleCommitDo();
    await exec(`git push ${this.gitInfo.remoteName} ${this.gitInfo.currenBranch}`);
    console.log('Push success');
  }

  async handleStatusDo() {
    await exec('git status', { slience: false });
  }

  async handleCheckoutDo() {
    const allBranches = await exec('git branch -a');
    let isNew = false;
    let newBranch: string = this.core.coreOptions.commands[1];
    const allBrancheList = [];
    allBranches.split("\n").forEach(branch => {
      allBrancheList.push(branch.replace(/^\s*\*?\s*|\s*$/g, ''));
    });

    if (!newBranch) {
      const newBranchType = '+ New Branch';
      const newBranchName = await (enquirer as any).autocomplete({
        name: 'selectBranch',
        message: 'Please select branch',
        limit: 10,
        choices: [
          { name: newBranchType, message: newBranchType },
          ...allBrancheList.map(branch => {
            return { name: branch, message: branch };
          }),
        ],
      });

      if (newBranchName === newBranchType) {
        newBranch = await (enquirer as any).input({
          message: 'Please input new branch name',
        });
      } else {
        newBranch = newBranchName;
      }
    }
    
    await this.getCurrentGitInfo();

    if (this.gitInfo.currenBranch === newBranch) {
      console.log('Current branch is ' + newBranch);
      return;
    }

    if (!allBranches.includes(newBranch)) {
      isNew = true;
    }
    await exec(`git checkout ${isNew? '-b ': ''}${newBranch}`);
    console.log(`Change branch from ${this.gitInfo.currenBranch} to ${newBranch}${isNew ? ' [New]': ''}`);
  }

  private async getCurrentGitInfo() {
    const info: any = {};
    try {
      info.name = await exec(`git config user.name`);
      info.email = await exec(`git config user.email`);
      info.remoteName = (await exec(`git remote`)).split(/\n/)[0];
      info.remoteGitUrl = await exec(`git remote get-url ${info.remoteName}`);
      if (/^git@/i.test(info.remoteGitUrl)) {
        info.remoteUrl = info.remoteGitUrl.replace(':', '/').replace('git@', 'https://').replace(/\.git$/, '');
      } else {
        info.remoteUrl = info.remoteGitUrl.replace(/\.git$/, '');
      }
      info.currenBranch = (await exec(`git branch`)).split(/\n/).find((branch) => /^\*\s*/.test(branch)).replace(/^\*\s*/, '');
    } catch (e) { } finally {
      this.gitInfo = info;
    }
  }
}
