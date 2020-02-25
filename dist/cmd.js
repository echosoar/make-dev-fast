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
class Cmd extends commandBase_1.CommandBase {
    execute() {
        return __awaiter(this, void 0, void 0, function* () {
            const typeCmd = yield this.checkType();
            const cmdCount = this.getCmdCount();
            let commands = [];
            if (typeCmd && typeCmd.client.getCommands) {
                commands = typeCmd.client.getCommands().map((cmd) => {
                    return `${typeCmd.type}: ${cmd}`;
                }).sort((cmdA, cmdB) => {
                    return (cmdCount[cmdB] || 0) - (cmdCount[cmdA] || 0);
                });
            }
            if (commands && commands.length) {
                const command = yield enquirer.autocomplete({
                    name: 'command',
                    message: 'Select Command',
                    limit: 10,
                    choices: commands,
                });
                if (!cmdCount[command]) {
                    cmdCount[command] = 0;
                }
                cmdCount[command]++;
                this.setCmdCount(cmdCount);
                const commandValue = command.split(': ')[1];
                if (typeCmd.client && typeCmd.client.execute) {
                    yield typeCmd.client.execute(commandValue);
                }
                console.log(`[dev] command '${command}' execute succeed!`);
            }
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
