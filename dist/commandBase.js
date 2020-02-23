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
const child_process_1 = require("child_process");
const os_1 = require("os");
const path_1 = require("path");
const fs_1 = require("fs");
class CommandBase {
    constructor(ctx) {
        this.home = path_1.resolve(os_1.homedir(), '.devFast');
        this.ctx = ctx;
        this.commands = (this.ctx.commands || []).slice(1);
        this._init();
    }
    main() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.commands || !this.commands.length) {
                return;
            }
        });
    }
    exec(cmd) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!cmd) {
                return '';
            }
            return new Promise((resolved, rejected) => {
                child_process_1.exec(cmd, (err, result) => {
                    if (err) {
                        console.log('err', err);
                        return rejected(err);
                    }
                    resolved(result.replace(/\n$/, '').replace(/^\s*|\s*$/, ''));
                });
            });
        });
    }
    _init() {
        if (!fs_1.existsSync(this.home)) {
            fs_1.mkdirSync(this.home);
        }
    }
}
exports.CommandBase = CommandBase;
