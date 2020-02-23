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
const path_1 = require("path");
const fs_1 = require("fs");
class Git extends commandBase_1.CommandBase {
    constructor() {
        super(...arguments);
        this.gitConfigPath = path_1.resolve(this.home, 'gitConfig.json');
    }
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
            info.name = yield this.exec(`git config --global user.name`);
            info.email = yield this.exec(`git config user.email`);
            info.remoteName = (yield this.exec(`git remote`)).split(/\n/)[0];
            info.remoteUrl = yield this.exec(`git remote get-url ${info.remoteName}`);
            info.currenBranch = (yield this.exec(`git branch`)).replace(/^\*\s*/, '');
            yield this.checkUser(info);
            this.info = info;
            console.log('this.info', this.info);
        });
    }
    checkUser(info) {
        return __awaiter(this, void 0, void 0, function* () {
            const gitConfig = this.getGitConfig();
            if (!gitConfig.user) {
                gitConfig.user = [];
            }
            let user = gitConfig.user.find((userInfo) => {
                return userInfo.name === info.name && userInfo.email === info.email;
            });
            if (!user) {
                console.log(`${info.name}<${info.email}> not exists!`);
                const type = yield enquirer.autocomplete({
                    name: 'matchType',
                    message: 'Select Doing',
                    limit: 10,
                    choices: [
                        { name: 'add', message: 'Add a new user' },
                        { name: 'select', message: 'Select a user' },
                    ],
                });
                if (type === 'add') {
                    user = yield this.userAdd(info);
                }
                else {
                    user = yield this.userSelect(true, info);
                }
            }
            const matches = user.matches.find((match) => {
                return info.remoteUrl.indexOf(match) !== -1;
            });
            if (matches) {
                return;
            }
            console.log(`remote '${info.remoteUrl}' not match any user`);
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
            }
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
                console.log('not set git user');
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
                console.error(`${name}<${email}> exists!`);
                return;
            }
            const newUserInfo = { name, email, matches: [] };
            gitConfig.user.push(newUserInfo);
            this.setGitConfig(gitConfig);
            console.log(`Add ${name}<${email}> success!`);
            return newUserInfo;
        });
    }
    userMatch() {
        return __awaiter(this, void 0, void 0, function* () {
            let type = this.commands[2];
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
                    const removeMatch = yield enquirer.autocomplete({
                        name: 'removeMatch',
                        message: 'Select which match will remove',
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
                        console.log(`  no match`);
                    }
                    return;
            }
            const gitConfig = this.getGitConfig();
            const index = gitConfig.user.findIndex((userInfo) => {
                return userInfo.name === user.name && userInfo.email === user.email;
            });
            console.log('index', index);
            gitConfig.user[index] = user;
            this.setGitConfig(gitConfig);
        });
    }
    userSelect(autoAddNewUser, autoAddNewUserInfo) {
        return __awaiter(this, void 0, void 0, function* () {
            const gitConfig = this.getGitConfig();
            if (!gitConfig || !gitConfig.user || !gitConfig.user.length) {
                console.log(`no user, please add a new user`);
                if (autoAddNewUser) {
                    return this.userAdd(autoAddNewUserInfo);
                }
                return;
            }
            const userSelect = yield enquirer.autocomplete({
                name: 'user',
                message: 'Select Git User',
                limit: 10,
                choices: gitConfig.user.map((userInfo) => {
                    return `${userInfo.name}<${userInfo.email}>`;
                }),
            });
            const userDetail = /^(.*?)<(.*?)>$/.exec(userSelect);
            return gitConfig.user.find((user) => {
                return user.name === userDetail[1] && user.email === userDetail[2];
            });
        });
    }
    getGitConfig() {
        if (this.gitConfig) {
            return this.gitConfig;
        }
        if (fs_1.existsSync(this.gitConfigPath)) {
            this.gitConfig = JSON.parse(fs_1.readFileSync(this.gitConfigPath).toString());
        }
        else {
            this.gitConfig = {};
        }
        return this.gitConfig;
    }
    setGitConfig(gitConfig) {
        this.gitConfig = gitConfig;
        fs_1.writeFileSync(this.gitConfigPath, JSON.stringify(gitConfig));
    }
    ad() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.exec('git add --all');
            console.log(result);
        });
    }
    ci() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.ctx.options.s) {
                yield this.ad();
            }
            const st = yield this.exec(`git status`);
            if (st.indexOf('nothing to commit') !== -1) {
                console.error('nothing to commit');
                process.exit();
            }
            const type = yield enquirer.autocomplete({
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
            const message = yield enquirer.input({
                message: 'Please input message',
            });
            const result = yield this.exec(`git commit -m '${type}: ${message}'`);
            console.log(result);
        });
    }
    ps() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.ctx.options.s) {
                yield this.ci();
            }
            const result = yield this.exec(`git push ${this.info.remoteName} ${this.info.currenBranch}`);
            console.log(result || 'Push success!');
        });
    }
}
exports.Git = Git;
