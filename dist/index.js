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
const minimist = require("minimist");
const enquirer = require("enquirer");
const path_1 = require("path");
const fs_1 = require("fs");
const git_1 = require("./git");
const npm_1 = require("./npm");
class MDF {
    constructor(argv) {
        this.options = minimist(argv.slice(2));
        this.commands = this.options._ || [];
        this.git = new git_1.Git(this);
        this.npm = new npm_1.Npm(this);
        this.main().catch(e => { });
    }
    main() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.commands || !this.commands.length) {
                const typeCmd = yield this.checkType();
                let commands = [];
                if (typeCmd && typeCmd.client.getCommands) {
                    commands = typeCmd.client.getCommands().map((cmd) => {
                        return `${typeCmd.type}: ${cmd}`;
                    });
                }
                if (commands && commands.length) {
                    const command = yield enquirer.autocomplete({
                        name: 'command',
                        message: 'Select Command',
                        limit: 10,
                        choices: commands,
                    });
                    const commandValue = command.split(': ')[1];
                    if (typeCmd.client && typeCmd.client.execute) {
                        yield typeCmd.client.execute(commandValue);
                    }
                    console.log(`[dev] command '${command}' execute succeed!`);
                }
                return;
            }
            switch (this.commands[0]) {
                case 'git':
                    return this.git.main();
            }
        });
    }
    checkType() {
        return __awaiter(this, void 0, void 0, function* () {
            if (fs_1.existsSync(path_1.resolve(process.cwd(), 'package.json'))) {
                return { type: 'npm', client: this.npm };
            }
            return '';
        });
    }
}
module.exports = MDF;
