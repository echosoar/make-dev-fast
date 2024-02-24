import { BasePlugin } from '@midwayjs/command-core';
import { exec, formatVersion, getCache, getVersion, setCache, getGlobalCache, sleep, exists } from './utils';
import * as enquirer from 'enquirer';
import Spin from 'light-spinner';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import {  readFile } from 'fs-extra';
import fetch from 'node-fetch';
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
    },
    reset: {
      usage: 'dev reset',
      lifecycleEvents: [ 'do' ],
      passingCommand: true,
    },
    release: {
      usage: 'dev release',
      lifecycleEvents: [ 'do' ],
      passingCommand: true,
      alias: 'r'
    },
    info: {
      usage: 'dev info',
      lifecycleEvents: [ 'do' ],
      passingCommand: true,
      alias: 'i'
    }
  };

  hooks = {
    'git:do': this.handleGitDo.bind(this),
    'clone:do': this.handleCloneDo.bind(this),
    'push:do': this.handlePushDo.bind(this),
    'status:do': this.handleStatusDo.bind(this),
    'checkout:do': this.handleCheckoutDo.bind(this),
    'reset:do': this.handleResetDo.bind(this),
    'release:do': this.handleReleaseDo.bind(this),
    'info:do': this.handleInfoDo.bind(this),
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

    if (gitAddress.startsWith('https://code.')) {
      gitAddress = gitAddress.replace('https://code.', 'https://gitlab.');
    }

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
    const spin = new Spin({
      text: 'Cloning...',
    });
    spin.start();
    await exec(`git clone ${gitAddress}${dirName ? ` ${dirName}` : ''}`);
    spin.stop();
    if (branch) {
      await exec(`cd ${dirName};git checkout ${branch} --`);
      console.log(`auto change banch to ${branch}`);
    }
    console.log(`git clone ${gitAddress} ${dirName ? `to ${dirName} `:''}success`);
    console.log(`You can use the following command to enter the project directory:`);
    console.log('');
    console.log(`cd ${dirName}`);
    console.log('');
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

    if (['main', 'master'].includes(this.gitInfo.currenBranch)) {
      console.warn(``);
      console.warn(`>> Committing to the '${this.gitInfo.currenBranch}' branch is risky! <<`);
      console.warn(``);
      await this.needConfirm();
    }
    // auto check ignore
    await this.checkIgnoreFile();
    await exec('git add --all');
  }

  async needConfirm() {
    const message = await (enquirer as any).input({
      message: 'Please input y/yes/ok to continue',
    });
    if (!['y', 'yes', 'ok'].includes(message.toLowerCase())) {
      console.log(`Operation blocked! (input ${message || 'nothing'})`);
      process.exit();
    }
  }

  async handleCommitDo() {
    await this.handleAddDo();
    const st = await exec(`git status`);
    if (st.indexOf('nothing to commit') !== -1) {
      console.warn('nothing to commit');
      return;
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
    let cmd = `git commit -m '${type}: ${message}'`;
    if (this.options['no-verify'] || this.options['pass']) {
      cmd += ' --no-verify'
    }
    await exec(cmd);
    try {
      const preCommitId = await exec(`git rev-parse HEAD`);
      const currentCommitId = await exec(`git rev-parse HEAD`);
      const lines = await exec(`git log ${preCommitId}..${currentCommitId} --numstat`);
      await this.report(lines);
    } catch {}
  }

  async handlePushDo() {
    
    await this.handleCommitDo();
    const spin = new Spin({
      text: 'Pushing...',
    });
    spin.start();
    await exec(`git push ${this.gitInfo.remoteName} ${this.gitInfo.currenBranch}`);
    spin.stop();
    console.log('Push success');
  }

  async handleStatusDo() {
    await exec('git status', { slience: false });
  }

  async handleResetDo() {
    await exec('git checkout .', { slience: false });
  }

  async handleCheckoutDo() {
    const allBranches = await exec('git branch -a');
    let isNew = false;
    let newBranch: string = this.core.coreOptions.commands[1];
    const allBrancheList = [];
    allBranches.split("\n").forEach(branch => {
      branch = branch.replace(/^\s*\*?\s*|\s*$/g, '');
      branch = branch.replace(/^remotes\/origin\//, '');
      allBrancheList.push(branch);
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

  private async checkIgnoreFile() {
    // TODO: 找到当前git项目根目录
    const ignoreFile = join(this.core.cwd, '.gitignore');
    const isExists = await exists(ignoreFile);
    if (!isExists) {
      console.warn(``);
      console.warn(`>> Missing .gitignore file in ${this.core.cwd} <<`);
      console.warn(``);
      await this.needConfirm();
      return;
    }
    const ignoreFileCode = await readFile(ignoreFile, 'utf-8');
    await this.checkFileInIgnore(ignoreFileCode, 'node_modules');
    await this.checkFileInIgnore(ignoreFileCode, 'dist');
    await this.checkFileInIgnore(ignoreFileCode, 'coverage');
  }

  private async checkFileInIgnore(code: string, fileName: string) {
    const file = join(this.core.cwd, fileName);
    const isExists = await exists(file);
    if (!isExists) {
      return;
    }
    const find = code.split('\n').find(line => line.includes(fileName));
    if (find) {
      return;
    }
    console.warn(``);
    console.warn(`>> ${ fileName} not in .gitignore file <<`);
    console.warn(``);
    await this.needConfirm();
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
      info.currenBranch = (await exec(`git branch`)).split(/\n/).find((branch) => /^\*\s*/.test(branch))?.replace(/^\*\s*/, '');
      if (!info.currentBranch) {
        const gitHeadFile = join(process.cwd(), '.git/HEAD');
        if (existsSync(gitHeadFile)) {
          const headFileContentLines = readFileSync(gitHeadFile).toString().split('\n');
          const ref = headFileContentLines.find(line => line.startsWith('ref: refs/heads/'));
          if (ref) {
            info.currenBranch = ref.replace('ref: refs/heads/', '');
          }
        }
      }
      if (!info.currenBranch) {
        info.currenBranch = 'master';
      }
      const log = await exec(`git log`);
      const commitIdReg = /commit\s+([\w]{40})/;
      if (commitIdReg.test(log)) {
        info.lastCommitId= commitIdReg.exec(log)[1];
        const merged = await exec(`git log master | grep ${info.lastCommitId}`);
        info.mergedMaster = !!merged;
      }
      
    } catch (e) { } finally {
      this.gitInfo = info;
    }
  }

  // release tag
  async handleReleaseDo() {
    // 获取 tag 版本
    const tagList = (await exec(`git tag`)).split('\n');
    let curVersion = 0;
    for(const tag of tagList) {
      const versionNumber = getVersion(tag);
      if (versionNumber > curVersion) {
        curVersion = versionNumber;
      }
    }
    const curVersionList = formatVersion(curVersion);
    const patch = `v${[curVersionList[0], curVersionList[1], curVersionList[2] + 1].join('.')}`;
    const minor = `v${[curVersionList[0], curVersionList[1] + 1, 0].join('.')}`;
    const major = `v${[curVersionList[0] + 1, 0, 0].join('.')}`;
    const newVersion = await (enquirer as any).autocomplete({
      name: 'version',
      message: `Please select the tag version(curren: v${curVersionList.join('.')})`,
      limit: 10,
      choices: [
        { name: 'patch', message: `patch-${patch}` },
        { name: 'minor', message: `minor-${minor}` },
        { name: 'major', message: `major-${major}` },
        { name: 'other', message: '其他版本' },
      ],
    });

    
    let tag = '';
    if (newVersion === 'other') {
      const inputVersion = await (enquirer as any).input({
        message: 'Please input tag version',
      });
      tag = `v${formatVersion(getVersion(inputVersion)).join('.')}`;
    } else if (newVersion === 'patch') {
      tag = patch;
    } else if (newVersion === 'minor') {
      tag = minor;
    } else if (newVersion === 'major') {
      tag = major;
    }
    // 获取 release 信息
    // 打 tag
    await exec(`git tag -a ${tag} -m "release: ${tag}"`);
    await exec(`git push origin ${tag}`);
    console.log(`success tag ${tag}`);
  }

  async todayInfo() {
    const now = new Date();
    const today = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    const info = await exec(`git log --since=${today}-T00:00:00 --until=${today}-T23:59:59 --numstat`);
    console.log('info', info);
  }

  async report(lines) {
    let result = {
      lang: {},
      add: 0,
      del: 0,
    }
    lines.split('\n').forEach(line => {
      const reg = /^(\d+)\s+(\d+)\s+.*?\.(\w+)$/;
      const match = reg.exec(line);
      if (!match) {
        return;
      }
      const [_, add, del, lang] = match;
      if (!result.lang[lang]) {
        result.lang[lang] = {
          add: 0,
          del: 0,
        }
      }
      result.lang[lang].add += (+add);
      result.lang[lang].del += (+del);
      result.add += (+add);
      result.del += (+del);
    });
    const reportApi = await getCache('reportApi');

    let repo = this.gitInfo.remoteGitUrl;
    if (!repo.includes('github.com') && !repo.includes('gitlab.com')) {
      repo = 'private:' + this.gitInfo.remoteGitUrl.replace(/(\.git|\/)$/i, '').split('/').pop();
    }
    if (typeof reportApi === 'string') {
      const body = {
        ...result,
        repo,
      };

      fetch(reportApi, {
        method: 'post',
        body:    JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      }).catch((e) => {
        console.log('report error', reportApi, e.message);
      });
      await sleep(100);
    }
    console.log(`+${result.add} / -${result.del}`);
    return result;
  }

  async handleInfoDo() {
    console.log('version:', require('../package.json').version);
    console.log('install-at:', __dirname);
    console.log('cache-file:', getGlobalCache());
  }
}
