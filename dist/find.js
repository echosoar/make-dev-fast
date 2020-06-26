"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const getDirList = (dirName, matches) => {
    if (!fs_1.existsSync(dirName)) {
        return {};
    }
    const stat = fs_1.statSync(dirName);
    if (!stat.isDirectory()) {
        return {};
    }
    const matchResultList = [];
    const dirList = fs_1.readdirSync(dirName);
    return {
        list: dirList.map((name) => {
            const absolutePath = path_1.resolve(dirName, name);
            const isDir = fs_1.statSync(absolutePath).isDirectory();
            const result = {
                absolutePath,
                name,
                dirName,
                isDir,
            };
            if (['node_modules', '.git'].indexOf(name) !== -1) {
                return;
            }
            if (name.indexOf(matches) !== -1) {
                matchResultList.push(result);
            }
            if (isDir) {
                return result;
            }
        }).filter((v) => !!v),
        matchResultList,
    };
};
exports.find = (matchPattern, baseDir) => {
    if (!matchPattern) {
        return;
    }
    const dir = baseDir || process.cwd();
    const matchRes = getDirList(dir, matchPattern);
    if (matchRes.matchResultList && matchRes.matchResultList.length) {
        matchRes.matchResultList.forEach((item) => {
            onMatches(item);
        });
        return true;
    }
    else {
        const childIsMatch = (matchRes.list || []).find((item) => {
            return exports.find(matchPattern, item.absolutePath);
        });
        if (!childIsMatch && !baseDir) {
            console.log(`[dev] not match ' ${matchPattern} '`);
        }
        return !!childIsMatch;
    }
};
const onMatches = (result) => {
    const { isDir, absolutePath } = result;
    const relativePath = path_1.relative(process.cwd(), absolutePath);
    console.log(`[dev] match ${isDir ? 'dir' : 'file'}:\t' ${relativePath} '`);
};
