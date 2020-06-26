import { readdirSync, existsSync, statSync } from 'fs';
import { resolve, relative } from 'path';
const getDirList = (dirName, matches) => {
  if (!existsSync(dirName)) {
    return {};
  }

  const stat = statSync(dirName);
  if (!stat.isDirectory()) {
    return {};
  }
  const matchResultList = [];
  const dirList = readdirSync(dirName);
  return {
    list: dirList.map((name: string) => {
      const absolutePath = resolve(dirName, name);
      const isDir = statSync(absolutePath).isDirectory();
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

export const find = (matchPattern, baseDir?: string) => {
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
  } else {
    const childIsMatch = (matchRes.list || []).find((item) => {
      return find(matchPattern, item.absolutePath);
    });

    if (!childIsMatch && !baseDir) {
      console.log(`[dev] not match ' ${matchPattern} '`);
    }
    return !!childIsMatch;
  }
};

const onMatches = (result) => {
  const { isDir, absolutePath } = result;
  const relativePath = relative(process.cwd(), absolutePath);
  console.log(`[dev] match ${isDir ? 'dir' : 'file'}:\t' ${relativePath} '`);
};
