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
const configstore = require("configstore");
const git_1 = require("./git");
const npm_1 = require("./npm");
const cmd_1 = require("./cmd");
const cmdManager_1 = require("./cmdManager");
const find_1 = require("./find");
class MDF {
    constructor(argv) {
        this.options = minimist(argv.slice(2));
        this.commands = this.options._ || [];
        this.config = new configstore('make-dev-fast');
        Object.assign(this, {
            npm: new npm_1.Npm(this),
        });
        this.git = new git_1.Git(this);
        this.cmd = new cmd_1.Cmd(this);
        this.cmdManager = new cmdManager_1.CmdManager(this);
        this.main().catch((e) => { });
    }
    getStore(key) {
        return this.config.get(key);
    }
    main() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.commands || !this.commands.length || this.commands[0] === 'run') {
                yield this.cmd.execute();
                return;
            }
            switch (this.commands[0]) {
                case 'git':
                case 'g':
                    return this.git.main();
                case 'command':
                    return this.cmdManager.main();
                case 'find':
                case 'f':
                    return find_1.find(this.commands[1]);
            }
        });
    }
}
module.exports = MDF;
