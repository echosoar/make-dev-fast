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
const path_1 = require("path");
const fs_1 = require("fs");
const enquirer = require("enquirer");
const ora = require("ora");
class Cmd extends commandBase_1.CommandBase {
    execute() {
        return __awaiter(this, void 0, void 0, function* () {
            const start = Date.now();
            const typeCmd = yield this.checkType();
            const cmdCount = this.getCmdCount();
            const commandList = [];
            if (typeCmd && typeCmd.client && typeCmd.client.getCommands) {
                typeCmd.client.getCommands().forEach((commandName) => {
                    const title = `${typeCmd.type}: ${commandName}`;
                    commandList.push({
                        title,
                        command: commandName,
                        type: typeCmd.type,
                        count: cmdCount[title] || 0,
                    });
                });
            }
            const userCommand = this.ctx.cmdManager.getCommandList();
            if (userCommand && userCommand.length) {
                userCommand.forEach((userCmd) => {
                    const title = `user: ${userCmd.title}`;
                    commandList.push({
                        title,
                        command: userCmd.cmd,
                        type: 'user',
                        count: cmdCount[title] || 0,
                    });
                });
            }
            if (!commandList.length) {
                console.log(`[dev] no command to execute!`);
                return;
            }
            let command = '';
            if (this.commands[0]) {
                command = `${typeCmd.type}: ${this.commands[0]}`;
            }
            else {
                command = yield enquirer.autocomplete({
                    name: 'command',
                    message: 'Select Command',
                    limit: 10,
                    choices: commandList.sort((a, b) => {
                        return b.count - a.count;
                    }).map((cmd) => cmd.title),
                });
            }
            const commandItem = commandList.find((cmd) => (cmd.title === command));
            if (!commandItem) {
                console.log(`[dev] command '${commandItem.command}' not found!`);
                return;
            }
            if (!cmdCount[command]) {
                cmdCount[command] = 0;
            }
            cmdCount[command]++;
            this.setCmdCount(cmdCount);
            const spinner = ora(' executing...').start();
            try {
                if (typeCmd.type === commandItem.type) {
                    yield typeCmd.client.execute(commandItem.command);
                }
                else if (commandItem.type === 'user') {
                    yield this.exec(commandItem.command);
                }
            }
            catch (e) {
                spinner.stop();
                console.error(`[dev] '${commandItem.command}' error, message:`);
                console.error();
                console.error(e.message);
                console.error(e.trace);
                return;
            }
            spinner.stop();
            console.log(`[dev] '${commandItem.command}' succeed! (${Number((Date.now() - start) / 1000).toFixed(2)}s, ${cmdCount[command]}times)`);
        });
    }
    checkType() {
        return __awaiter(this, void 0, void 0, function* () {
            if (fs_1.existsSync(path_1.resolve(process.cwd(), 'package.json'))) {
                return { type: 'npm', client: this.ctx.npm };
            }
            return '';
        });
    }
    getCmdCount() {
        return this.ctx.config.get(`cmd_${process.cwd()}`) || {};
    }
    setCmdCount(cmdCount) {
        return this.ctx.config.set(`cmd_${process.cwd()}`, cmdCount || {});
    }
}
exports.Cmd = Cmd;
