import { CommandBase } from './commandBase';
import { resolve } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
export class Npm extends CommandBase {
  private pkg: any;
  private pkgPath: string = resolve(process.cwd(), 'package.json');
  public getCommands() {
    const pkg = this.getPackageJson();
    if (pkg.scripts) {
      return Object.keys(pkg.scripts);
    }
    return [];
  }

  public async execute(command: string) {
    await this.exec(`npm run ${command}`);
  }

  public setPackageJson(jsonData) {
    const currentJson = this.getPackageJson();
    const newJson = { ...currentJson, ...jsonData };
    if (existsSync(this.pkgPath)) {
      writeFileSync(this.pkgPath, JSON.stringify(newJson, null, '  '));
      return true;
    } else {
      return false;
    }
  }

  public getPackageJson() {
    if (this.pkg) {
      return this.pkg;
    }

    if (existsSync(this.pkgPath)) {
      try {
        this.pkg = JSON.parse(readFileSync(this.pkgPath).toString());
      } catch (e) {
        this.pkg = {};
      }
    } else {
      this.pkg = {};
    }
    return this.pkg;
  }
}
