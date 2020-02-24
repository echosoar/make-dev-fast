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
class Npm extends commandBase_1.CommandBase {
    constructor() {
        super(...arguments);
        this.pkgPath = path_1.resolve(process.cwd(), 'package.json');
    }
    getCommands() {
        const pkg = this.getPackageJson();
        if (pkg.scripts) {
            return Object.keys(pkg.scripts);
        }
        return [];
    }
    execute(command) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.exec(`npm run ${command}`);
        });
    }
    getPackageJson() {
        if (this.pkg) {
            return this.pkg;
        }
        if (fs_1.existsSync(this.pkgPath)) {
            try {
                this.pkg = JSON.parse(fs_1.readFileSync(this.pkgPath).toString());
            }
            catch (e) {
                this.pkg = {};
            }
        }
        else {
            this.pkg = {};
        }
        return this.pkg;
    }
}
exports.Npm = Npm;
