import { BasePlugin } from '@midwayjs/command-core';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import * as enquirer from 'enquirer';
import { exec } from './utils';

interface CmdItem {
  name: string;
  cmd: string;
}

export class CmdPlugin extends BasePlugin {
  commands = {
    cmd: {
      usage: 'dev cmd',
      lifecycleEvents: ['do'],
    },
  };

  hooks = {
    'cmd:do': this.handleCmd.bind(this),
  };

  async handleCmd() {
    const cwd = process.cwd();
    const cmdList: CmdItem[] = [];

    // 1. Read package.json scripts
    const pkgPath = join(cwd, 'package.json');
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath).toString());
        const scripts = pkg.scripts || {};
        for (const [scriptName] of Object.entries(scripts)) {
          cmdList.push({ name: `${scriptName}`, cmd: `npm run ${scriptName}` as string });
        }
      } catch (e) {
        // ignore parse errors
      }
    }

    // 2. Read Cargo.toml
    const cargoPath = join(cwd, 'Cargo.toml');
    if (existsSync(cargoPath)) {
      try {
        const content = readFileSync(cargoPath).toString();
        const match = /^name\s*=\s*"(.+)"/m.exec(content);
        if (match) {
          const projectName = match[1];
          cmdList.push({ name: 'cargo-build', cmd: `cargo build --release -p ${projectName}` });
        }
      } catch (e) {
        // ignore read errors
      }
    }

    // 3. Check for Xcode project (*.xcodeproj folder containing project.pbxproj)
    try {
      const files = readdirSync(cwd);
      for (const file of files) {
        const fullPath = join(cwd, file);
        if (file.endsWith('.xcodeproj') && statSync(fullPath).isDirectory()) {
          const pbxprojPath = join(fullPath, 'project.pbxproj');
          if (existsSync(pbxprojPath)) {
            cmdList.push({ name: 'xcode-build', cmd: `xcodebuild -project ${file}` });
            break;
          }
        }
      }
    } catch (e) {
      // ignore read errors
    }

    // 4. Parse README files for bash/sh/shell code blocks
    const readmeFiles = ['README.md', 'readme.md', 'Readme.md', 'README.MD'];
    for (const readmeFile of readmeFiles) {
      const readmePath = join(cwd, readmeFile);
      if (existsSync(readmePath)) {
        try {
          const readmeCmds = this.parseReadme(readFileSync(readmePath).toString());
          cmdList.push(...readmeCmds);
        } catch (e) {
          // ignore read/parse errors
        }
        break;
      }
    }

    // Display the list
    if (cmdList.length === 0) {
      console.log('No commands found.');
      return;
    }

    // Use enquirer to select a command
    const selectedCmd = await (enquirer as any).autocomplete({
      name: 'command',
      message: 'Please select a command to run',
      limit: 10,
      choices: cmdList.map((item) => {
        return { name: item.cmd, message: `${item.name}: ${item.cmd}` };
      }),
    });

    if (!selectedCmd) {
      console.log('No command selected, exit');
      return;
    }

    // Execute the selected command
    console.log(`Executing: ${selectedCmd}`);
    await exec(selectedCmd, { slience: false });
  }

  parseReadme(content: string): CmdItem[] {
    const cmdList: CmdItem[] = [];
    const lines = content.split(/\r?\n/);
    let lineIndex = 0;
    while (lineIndex < lines.length) {
      const line = lines[lineIndex].trim();
      // Check for code block starting with ```bash, ```sh, or ```shell
      if (/^```(bash|sh|shell)(\s|$)/.test(line)) {
        // Look for a # comment above (skip blank lines)
        let commentName = '';
        let commentLineIndex = lineIndex - 1;
        while (commentLineIndex >= 0 && lines[commentLineIndex].trim() === '') {
          commentLineIndex--;
        }
        if (commentLineIndex >= 0) {
          const commentMatch = /^#+\s*(.+)/.exec(lines[commentLineIndex].trim());
          if (commentMatch) {
            commentName = commentMatch[1].trim();
          }
        }

        // Collect commands inside the block
        lineIndex++;
        while (lineIndex < lines.length && !lines[lineIndex].trim().startsWith('```')) {
          const command = lines[lineIndex].trim();
          if (command && !command.startsWith('#')) {
            const name = commentName || command;
            const cmd = command.replace(/^\$\s*/, ''); // Remove leading $ if present
            cmdList.push({ name, cmd });
          }
          lineIndex++;
        }
      }
      lineIndex++;
    }
    return cmdList;
  }
}
