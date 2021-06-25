/**
 * @license
 * Copyright Worktile Inc All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/worktile/pkg-manager/blob/master/LICENSE
 */
import shell from 'shelljs';
import fs from 'fs';
import path from 'path';

export interface FixtureOptions {
    workspace: string;
    version: string;
    name: string;
    repository?: {
        type: string;
        url: string;
    };
}

export class Fixture {
    constructor(protected options: FixtureOptions) {}

    initializeWorkspace() {
        shell.rm('-rf', this.options.workspace);
        shell.config.silent = true;
        shell.mkdir(this.options.workspace);
        shell.cd(this.options.workspace);
        shell.exec('git init');
        shell.exec('git config commit.gpgSign false');
        this.commit('root-commit');
        this.writePackageJson();
    }

    commit(msg: string) {
        shell.exec(`git commit --allow-empty -m "${msg}"`);
    }

    tag(version: string, msg: string) {
        shell.exec(`git tag -a v${version} -m "${msg}"`);
    }

    writePackageJson(options: any = {}) {
        const pkg = Object.assign(options, {
            version: this.options.version,
            name: this.options.name,
            repository: this.options.repository
        });
        fs.writeFileSync('package.json', JSON.stringify(pkg), 'utf-8');
    }

    destroy() {
        shell.cd('../');
        shell.rm('-rf', this.options.workspace);
    }

    readFile(filePath: string) {
        const fullPath = path.resolve(filePath);
        return fs.readFileSync(fullPath, 'utf-8');
    }

    readChangelog(changelog = 'CHANGELOG.md') {
        return this.readFile(changelog);
    }
}
