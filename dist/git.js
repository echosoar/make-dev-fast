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
            info.user = yield this.exec(`git config --global user.name`);
            info.email = yield this.exec(`git config user.email`);
            info.remoteName = (yield this.exec(`git remote`)).split(/\n/)[0];
            info.remoteUrl = yield this.exec(`git remote get-url ${info.remoteName}`);
            const remoteHostMatch = /git@(.*?):|\/\/(.*?)\//.exec(info.remoteUrl);
            if (remoteHostMatch) {
                info.remoteHost = remoteHostMatch[1] || remoteHostMatch[2];
            }
            info.currenBranch = (yield this.exec(`git branch`)).replace(/^\*\s*/, '');
            this.info = info;
            console.log('this.info', this.info);
        });
    }
    subCommand() {
        return __awaiter(this, void 0, void 0, function* () {
            switch (this.commands[0]) {
                case 'ad': return this.ad();
                case 'ci': return this.ci();
                case 'ps': return this.ps();
            }
        });
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
                console.log('nothing to commit');
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
