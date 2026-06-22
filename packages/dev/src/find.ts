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
// ANSI escape codes for highlighting the matched keyword
const HIGHLIGHT_START = '\x1b[1;31m';
const HIGHLIGHT_END = '\x1b[0m';

interface MatchInfo {
  index: number;
  length: number;
}

interface Matcher {
  // whether this matcher is a regex matcher
  isRegex: boolean;
  // original keyword as typed by the user
  raw: string;
  // test if the text contains a match
  test(text: string): boolean;
  // return the first match info, or null if none
  firstMatch(text: string): MatchInfo | null;
  // return the text with all matches wrapped in ANSI highlight codes
  highlight(text: string): string;
}

function highlightLiteral(text: string, keyword: string): string {
  if (!keyword) {
    return text;
  }
  return text.split(keyword).join(HIGHLIGHT_START + keyword + HIGHLIGHT_END);
}

// build a matcher from the user-provided keyword.
// when the keyword is wrapped in forward slashes (e.g. /foo\d+/),
// the inner part is treated as a regular expression.
function createMatcher(keyword: string): Matcher {
  const isRegex = keyword.length >= 2 && keyword.startsWith('/') && keyword.endsWith('/');
  if (isRegex) {
    const source = keyword.slice(1, -1);
    let regex: RegExp;
    try {
      regex = new RegExp(source, 'g');
    } catch (e) {
      // invalid regex, fall back to literal matching
      return {
        isRegex: false,
        raw: keyword,
        test: (text) => text.includes(keyword),
        firstMatch: (text) => {
          const idx = text.indexOf(keyword);
          return idx === -1 ? null : { index: idx, length: keyword.length };
        },
        highlight: (text) => highlightLiteral(text, keyword),
      };
    }
    return {
      isRegex: true,
      raw: keyword,
      test: (text) => {
        regex.lastIndex = 0;
        return regex.test(text);
      },
      firstMatch: (text) => {
        regex.lastIndex = 0;
        const m = regex.exec(text);
        if (!m) {
          return null;
        }
        return { index: m.index, length: m[0].length };
      },
      highlight: (text) => {
        regex.lastIndex = 0;
        return text.replace(regex, (s) => HIGHLIGHT_START + s + HIGHLIGHT_END);
      },
    };
  }
  return {
    isRegex: false,
    raw: keyword,
    test: (text) => text.includes(keyword),
    firstMatch: (text) => {
      const idx = text.indexOf(keyword);
      return idx === -1 ? null : { index: idx, length: keyword.length };
    },
    highlight: (text) => highlightLiteral(text, keyword),
  };
}

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
  private matcher: Matcher | null = null;

  async handleFind() {
    const keyword: string = this.core.coreOptions.commands[1];
    if (!keyword) {
      console.log('Usage: dev find <keyword>');
      console.log('  /pattern/   match by regular expression (wrapped in forward slashes)');
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
    this.matcher = createMatcher(keyword);

    this.walk(cwd, cwd, all, hasLimit, contentLimit, nameLimit);

    this.printResult(contentLimit, nameLimit, hasLimit);
  }

  private walk(
    dir: string,
    cwd: string,
    all: boolean,
    hasLimit: boolean,
    contentLimit: number,
    nameLimit: number,
  ) {
    if (this.stopped || !this.matcher) {
      return;
    }
    const matcher = this.matcher;
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
      if (matcher.test(name)) {
        this.nameTotal++;
        if (this.nameMatches.length < nameLimit) {
          this.nameMatches.push(relative(cwd, fullPath) || name);
        }
        this.checkStop(hasLimit, contentLimit, nameLimit);
      }

      if (stat.isDirectory()) {
        this.walk(fullPath, cwd, all, hasLimit, contentLimit, nameLimit);
      } else if (stat.isFile()) {
        this.searchFileContent(fullPath, cwd, hasLimit, contentLimit, nameLimit);
      }
    }
  }

  private searchFileContent(
    fullPath: string,
    cwd: string,
    hasLimit: boolean,
    contentLimit: number,
    nameLimit: number,
  ) {
    if (this.stopped || !this.matcher) {
      return;
    }
    const matcher = this.matcher;
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
      const match = matcher.firstMatch(line);
      if (!match) {
        continue;
      }
      this.contentTotal++;
      if (this.contentMatches.length < contentLimit) {
        this.contentMatches.push({
          file: relPath,
          line: i + 1,
          content: this.makeSnippet(line, match.index, match.length),
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

  private printResult(contentLimit: number, nameLimit: number, hasLimit: boolean) {
    const matcher = this.matcher;
    if (!matcher) {
      return;
    }
    const label = matcher.isRegex
      ? `Search for /${matcher.raw.slice(1, -1)}/ (regex):`
      : `Search for "${matcher.raw}":`;
    console.log(label);
    console.log('');

    // content matches
    console.log(`[File content] showing ${this.contentMatches.length} of ${this.contentTotal} match(es):`);
    if (this.contentMatches.length === 0) {
      console.log('  (none)');
    } else {
      for (const item of this.contentMatches) {
        console.log(`  ${item.file}:${item.line}: ${matcher.highlight(item.content)}`);
      }
    }
    console.log('');

    // file name matches
    console.log(`[File name] showing ${this.nameMatches.length} of ${this.nameTotal} match(es):`);
    if (this.nameMatches.length === 0) {
      console.log('  (none)');
    } else {
      for (const file of this.nameMatches) {
        console.log(`  ${matcher.highlight(file)}`);
      }
    }
    console.log('');

    console.log(`Total: ${this.contentTotal} file content match(es), ${this.nameTotal} file name match(es).`);
    if (hasLimit && this.stopped) {
      console.log(`(stopped early because --limit ${contentLimit} was reached)`);
    }
  }
}
