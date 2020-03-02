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
class CmdManager extends commandBase_1.CommandBase {
    getCommandList() {
        return this.ctx.config.get(`user_cmd_${process.cwd()}`) || [];
    }
    putCommandList(title, cmd) {
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
    removeCommand(title) {
        const list = this.getCommandList();
        const result = list.filter((item) => item.title !== title);
        return this.ctx.config.set(`user_cmd_${process.cwd()}`, result);
    }
    main() {
        return __awaiter(this, void 0, void 0, function* () {
            switch (this.commands[0]) {
                case 'add': return this.add();
                case 'list': return this.displayList();
                case 'remove': return this.remove();
            }
        });
    }
    add() {
        return __awaiter(this, void 0, void 0, function* () {
            const title = yield enquirer.input({
                message: 'Please input command title',
                initial: '',
            });
            const cmd = yield enquirer.input({
                message: 'Please input command',
                initial: '',
            });
            this.putCommandList(title, cmd);
            console.log(`[Dev] Add user command '${title}' success!`);
        });
    }
    displayList() {
        return __awaiter(this, void 0, void 0, function* () {
            const list = this.getCommandList();
            if (!list || !list.length) {
                console.log('[Dev] User command has not been set!');
                return;
            }
            list.forEach((cmd) => {
                console.log(`${cmd.title}(${cmd.cmd})`);
            });
        });
    }
    remove() {
        return __awaiter(this, void 0, void 0, function* () {
            const list = this.getCommandList();
            if (!list || !list.length) {
                console.log('[Dev] User command has not been set!');
                return;
            }
            const cmdSelect = yield enquirer.autocomplete({
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
        });
    }
}
exports.CmdManager = CmdManager;
