"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const commandBase_1 = require("./commandBase");
const enquirer = require("enquirer");
const ora = require("ora");
class Git extends commandBase_1.CommandBase {
    main() {
        const _super = Object.create(null, {
            main: { get: () => super.main }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super.main.call(this);
            yield this.getCurrentGitInfo();
            yield this.subCommand();
        });
    }
    getCurrentGitInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            const info = {};
            try {
                info.name = yield this.exec(`git config user.name`, { slience: true });
                info.email = yield this.exec(`git config user.email`, { slience: true });
                info.remoteName = (yield this.exec(`git remote`, { slience: true })).split(/\n/)[0];
                info.remoteGitUrl = yield this.exec(`git remote get-url ${info.remoteName}`, { slience: true });
                if (/^git@/i.test(info.remoteGitUrl)) {
                    info.remoteUrl = info.remoteGitUrl.replace(':', '/').replace('git@', 'https://').replace(/\.git$/, '');
                }
                else {
                    info.remoteUrl = info.remoteGitUrl.replace(/\.git$/, '');
                }
                info.currenBranch = (yield this.exec(`git branch`, { slience: true })).split(/\n/).find((branch) => /^\*\s*/.test(branch)).replace(/^\*\s*/, '');
            }
            catch (e) { }
            finally {
                this.info = info;
            }
        });
    }
    checkUser() {
        return __awaiter(this, void 0, void 0, function* () {
            const info = this.info;
            if (!info.remoteName) {
                console.error('[Dev] This is not a git repository');
                process.exit(1);
            }
            const gitConfig = this.getGitConfig();
            if (!gitConfig.user) {
                gitConfig.user = [];
            }
            let user = gitConfig.user.find((userInfo) => {
                return userInfo.name === info.name && userInfo.email === info.email;
            });
            if (!user) {
                user = yield this.userSelect(true, info);
            }
            const matches = user.matches.find((match) => {
                return info.remoteGitUrl.indexOf(match) !== -1;
            });
            if (matches) {
                return;
            }
            console.log(`[Dev] The remote link '${info.remoteGitUrl}' cannot match the user.`);
            const newUser = yield this.userMatch('add', info.remoteGitUrl);
            if (newUser.name !== info.name) {
                this.info.name = newUser.name;
                yield this.exec(`git config user.name '${newUser.name}'`, { slience: true });
            }
            if (newUser.email !== info.email) {
                this.info.email = newUser.email;
                yield this.exec(`git config user.email '${newUser.email}'`, { slience: true });
            }
        });
    }
    subCommand() {
        return __awaiter(this, void 0, void 0, function* () {
            switch (this.commands[0]) {
                case 'user': return this.user();
                case 'match': return this.userMatch();
                case 'ad': return this.ad();
                case 'ci': return this.ci();
                case 'ps': return this.ps();
                case 'pl': return this.pl();
            }
            return this.displayGitInfo();
        });
    }
    displayGitInfo() {
        Object.keys(this.info).forEach((info) => {
            console.log(`${(info.replace(/([A-Z])/g, ' $1').replace(/^(.)/, (match) => match.toUpperCase()) + ':').padEnd(20)}${this.info[info]}`);
        });
    }
    user() {
        return __awaiter(this, void 0, void 0, function* () {
            switch (this.commands[1]) {
                case 'add':
                    return this.userAdd();
            }
            const gitConfig = this.getGitConfig();
            if (!gitConfig.user) {
                console.log('[Dev] Git user information has not been set!');
                return;
            }
            gitConfig.user.forEach((userInfo) => {
                console.log(`${userInfo.name}<${userInfo.email}>`);
                if (userInfo.matches && userInfo.matches.length) {
                    userInfo.matches.forEach((match) => {
                        console.log(`  - ${match}`);
                    });
                }
            });
        });
    }
    userAdd(info) {
        return __awaiter(this, void 0, void 0, function* () {
            const name = yield enquirer.input({
                message: 'Please input name',
                initial: info && info.name || '',
            });
            const email = yield enquirer.input({
                message: 'Please input email',
                initial: info && info.email || '',
            });
            const gitConfig = this.getGitConfig();
            if (!gitConfig.user) {
                gitConfig.user = [];
            }
            const userExists = gitConfig.user.find((user) => {
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
        });
    }
    userMatch(type, defaultValue) {
        return __awaiter(this, void 0, void 0, function* () {
            type = type || this.commands[2];
            if (type !== 'add' && type !== 'remove' && type !== 'list') {
                type = yield enquirer.autocomplete({
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
            const user = yield this.userSelect(true);
            if (!user.matches) {
                user.matches = [];
            }
            switch (type) {
                case 'add':
                    const matchUrl = yield enquirer.input({
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
                    const removeMatch = yield enquirer.autocomplete({
                        name: 'removeMatch',
                        message: 'Please select which matching rule to remove?',
                        limit: 10,
                        choices: user.matches,
                    });
                    user.matches = user.matches.filter((match) => match === removeMatch);
                    console.log(`${removeMatch} removed!`);
                case 'list':
                    console.log(`${user.name}<${user.email}>`);
                    if (user.matches && user.matches.length) {
                        user.matches.forEach((match) => {
                            console.log(`  - ${match}`);
                        });
                    }
                    else {
                        console.log(`  no matching rule`);
                    }
                    return;
            }
            const gitConfig = this.getGitConfig();
            const index = gitConfig.user.findIndex((userInfo) => {
                return userInfo.name === user.name && userInfo.email === user.email;
            });
            gitConfig.user[index] = user;
            this.setGitConfig(gitConfig);
            return user;
        });
    }
    userSelect(autoAddNewUser, autoAddNewUserInfo) {
        return __awaiter(this, void 0, void 0, function* () {
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
            const userSelect = yield enquirer.autocomplete({
                name: 'user',
                message: 'Select Git User',
                limit: 10,
                choices: gitConfig.user.map((userInfo) => {
                    return `${userInfo.name}<${userInfo.email}>`;
                }).concat(addNewUser),
            });
            if (userSelect === addNewUser) {
                return this.userAdd(autoAddNewUserInfo);
            }
            else {
                const userDetail = /^(.*?)<(.*?)>$/.exec(userSelect);
                return gitConfig.user.find((user) => {
                    return user.name === userDetail[1] && user.email === userDetail[2];
                });
            }
        });
    }
    getGitConfig() {
        if (this.gitConfig) {
            return this.gitConfig;
        }
        this.gitConfig = this.ctx.config.get('gitConfig') || {};
        return this.gitConfig;
    }
    setGitConfig(gitConfig) {
        this.gitConfig = gitConfig;
        this.ctx.config.set('gitConfig', gitConfig);
    }
    ad() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.checkUser();
            const result = yield this.exec('git add --all');
            console.log(result);
        });
    }
    ci() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.ctx.options.s) {
                yield this.ad();
            }
            else {
                yield this.checkUser();
            }
            const st = yield this.exec(`git status`, { slience: true });
            if (st.indexOf('nothing to commit') !== -1) {
                console.error('nothing to commit');
                process.exit();
            }
            const type = yield enquirer.autocomplete({
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
            const message = yield enquirer.input({
                message: 'Please input commit message',
            });
            const spinner = ora(' commit...').start();
            const result = yield this.exec(`git commit -m '${type}: ${message}'`);
            spinner.stop();
            console.log(result);
        });
    }
    ps() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.ctx.options.s) {
                yield this.ci();
            }
            else {
                yield this.checkUser();
            }
            const spinner = ora(' pushing...').start();
            const result = yield this.exec(`git push ${this.info.remoteName} ${this.info.currenBranch}`);
            spinner.stop();
            console.log(result || 'Push success!');
        });
    }
    pl() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.checkUser();
            const spinner = ora(' pulling...').start();
            const result = yield this.exec(`git pull ${this.info.remoteName} ${this.info.currenBranch}`);
            spinner.stop();
            console.log(result || 'Pull success!');
        });
    }
}
exports.Git = Git;
