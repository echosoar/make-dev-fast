import { BasePlugin } from '@midwayjs/command-core';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

interface ContentMatch {
  file: string;
  line: number;
  content: string;
}

// default display limits
const DEFAULT_CONTENT_LIMIT = 50;
const DEFAULT_NAME_LIMIT = 50;
// number of surrounding characters to keep around a match
const CONTEXT_CHARS = 30;

export class FindPlugin extends BasePlugin {
  commands = {
    find: {
      usage: 'dev find <keyword>',
      lifecycleEvents: ['do'],
      passingCommand: true,
      alias: 'f',
    },
  };

  hooks = {
    'find:do': this.handleFind.bind(this),
  };

  private contentMatches: ContentMatch[] = [];
  private nameMatches: string[] = [];
  private contentTotal = 0;
  private nameTotal = 0;
  private stopped = false;

  async handleFind() {
    const keyword: string = this.core.coreOptions.commands[1];
    if (!keyword) {
      console.log('Usage: dev find <keyword>');
      console.log('  --limit <n>  limit the number of matches per type (and stop searching once reached)');
      console.log('  --all        also search ignored dirs/files (node_modules and dot-prefixed)');
      return;
    }

    const cwd = process.cwd();
    const all = !!this.options.all;
    // --limit overrides the default display caps and enables early stop
    const rawLimit = this.options.limit;
    const hasLimit = rawLimit !== undefined && rawLimit !== '' && !isNaN(Number(rawLimit));
    const contentLimit = hasLimit ? Number(rawLimit) : DEFAULT_CONTENT_LIMIT;
    const nameLimit = hasLimit ? Number(rawLimit) : DEFAULT_NAME_LIMIT;

    // reset state (instance may be reused)
    this.contentMatches = [];
    this.nameMatches = [];
    this.contentTotal = 0;
    this.nameTotal = 0;
    this.stopped = false;

    this.walk(cwd, cwd, keyword, all, hasLimit, contentLimit, nameLimit);

    this.printResult(keyword, contentLimit, nameLimit, hasLimit);
  }

  private walk(
    dir: string,
    cwd: string,
    keyword: string,
    all: boolean,
    hasLimit: boolean,
    contentLimit: number,
    nameLimit: number,
  ) {
    if (this.stopped) {
      return;
    }
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch (e) {
      return;
    }

    for (const name of entries) {
      if (this.stopped) {
        return;
      }
      // default ignore: node_modules and dot-prefixed files/dirs
      if (!all && (name === 'node_modules' || name.startsWith('.'))) {
        continue;
      }

      const fullPath = join(dir, name);
      let stat;
      try {
        stat = statSync(fullPath);
      } catch (e) {
        continue;
      }

      // match against the file / dir name itself
      if (name.indexOf(keyword) !== -1) {
        this.nameTotal++;
        if (this.nameMatches.length < nameLimit) {
          this.nameMatches.push(relative(cwd, fullPath) || name);
        }
        this.checkStop(hasLimit, contentLimit, nameLimit);
      }

      if (stat.isDirectory()) {
        this.walk(fullPath, cwd, keyword, all, hasLimit, contentLimit, nameLimit);
      } else if (stat.isFile()) {
        this.searchFileContent(fullPath, cwd, keyword, hasLimit, contentLimit, nameLimit);
      }
    }
  }

  private searchFileContent(
    fullPath: string,
    cwd: string,
    keyword: string,
    hasLimit: boolean,
    contentLimit: number,
    nameLimit: number,
  ) {
    if (this.stopped) {
      return;
    }
    let buffer: Buffer;
    try {
      buffer = readFileSync(fullPath);
    } catch (e) {
      return;
    }
    // skip binary files (presence of a null byte is a good heuristic)
    if (buffer.includes(0)) {
      return;
    }
    const content = buffer.toString('utf-8');
    const lines = content.split(/\r?\n/);
    const relPath = relative(cwd, fullPath) || fullPath;
    for (let i = 0; i < lines.length; i++) {
      if (this.stopped) {
        return;
      }
      const line = lines[i];
      const idx = line.indexOf(keyword);
      if (idx === -1) {
        continue;
      }
      this.contentTotal++;
      if (this.contentMatches.length < contentLimit) {
        this.contentMatches.push({
          file: relPath,
          line: i + 1,
          content: this.makeSnippet(line, idx, keyword.length),
        });
      }
      this.checkStop(hasLimit, contentLimit, nameLimit);
    }
  }

  // keep surrounding characters around the matched keyword
  private makeSnippet(line: string, idx: number, keywordLength: number): string {
    const start = Math.max(0, idx - CONTEXT_CHARS);
    const end = Math.min(line.length, idx + keywordLength + CONTEXT_CHARS);
    let snippet = line.slice(start, end).replace(/\t/g, ' ');
    if (start > 0) {
      snippet = '...' + snippet;
    }
    if (end < line.length) {
      snippet = snippet + '...';
    }
    return snippet.trim();
  }

  // when --limit is set, stop searching once both caps are reached
  private checkStop(hasLimit: boolean, contentLimit: number, nameLimit: number) {
    if (!hasLimit) {
      return;
    }
    if (this.contentMatches.length >= contentLimit && this.nameMatches.length >= nameLimit) {
      this.stopped = true;
    }
  }

  private printResult(keyword: string, contentLimit: number, nameLimit: number, hasLimit: boolean) {
    console.log(`Search for "${keyword}":`);
    console.log('');

    // content matches
    console.log(`[File content] showing ${this.contentMatches.length} of ${this.contentTotal} match(es):`);
    if (this.contentMatches.length === 0) {
      console.log('  (none)');
    } else {
      for (const item of this.contentMatches) {
        console.log(`  ${item.file}:${item.line}: ${item.content}`);
      }
    }
    console.log('');

    // file name matches
    console.log(`[File name] showing ${this.nameMatches.length} of ${this.nameTotal} match(es):`);
    if (this.nameMatches.length === 0) {
      console.log('  (none)');
    } else {
      for (const file of this.nameMatches) {
        console.log(`  ${file}`);
      }
    }
    console.log('');

    console.log(`Total: ${this.contentTotal} file content match(es), ${this.nameTotal} file name match(es).`);
    if (hasLimit && this.stopped) {
      console.log(`(stopped early because --limit ${contentLimit} was reached)`);
    }
  }
}
