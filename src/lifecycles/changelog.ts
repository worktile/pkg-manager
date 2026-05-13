/**
 * @license
 * Copyright Worktile Inc All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/worktile/pkg-manager/blob/master/LICENSE
 */
import { Lifecycle } from './lifecycle';
import { CommandContext, Package } from '../interface';
import * as fs from 'fs';
import { defaults } from '../defaults';
import { exec } from 'child_process';
import path from 'path';
import { resolveFilePath } from '../utils';

export class ChangelogLifecycle extends Lifecycle {
    currentVersion!: string;
    nextVersion!: string;
    readonly defaultInfile = defaults.infile;
    packages: Package[] = [];
    context!: CommandContext;

    async run(context: CommandContext): Promise<void> {
        const { options, versions } = context;

        if (options.skip?.changelog) return;

        await this.runLifecycleHook('prechangelog', options, this.getLifecycleHookParams(context));

        this.context = context;
        this.currentVersion = versions.current;
        this.nextVersion = versions.next;
        this.packages = options?.packages || [];

        const cwd = options.cwd || process.cwd();

        // 1. 生成每个包的 changelog
        // 2. 生成 .wpmrc.ts 所在路径的根层 changelog
        // 3. 单独包 和 根层 若设置 infile 为空，意味着不生成 changelog
        if (this.packages.length) {
            for (const pkg of this.packages) {
                if (!pkg.infile || pkg.infile === '') continue;

                await this.generateChangelog(resolveFilePath(pkg.infile, path.resolve(cwd, pkg.path)), [pkg.path], cwd);
            }
        }

        if (options.infile !== '') {
            await this.generateChangelog(
                resolveFilePath(options.infile as string, cwd),
                this.packages.map((p) => p.path),
                cwd
            );
        }

        await this.runLifecycleHook('postchangelog', options, this.getLifecycleHookParams(context));
    }

    private async generateChangelog(infilePath: string, pkgPaths: string[], cwd?: string): Promise<void> {
        this.logger.info(`Generating changelog: ${this.currentVersion} -> ${this.nextVersion}`);

        const commit = await this.findVersionCommit(this.currentVersion, pkgPaths, cwd);
        const generated = await this.getChangelogForPath(commit, pkgPaths, cwd);

        if (!generated.trim()) {
            this.logger.warn(`No changelog generated for ${pkgPaths.join(', ')}`);
            return;
        }

        fs.writeFileSync(infilePath, this.mergeChangelog(infilePath, generated));
    }

    private async getChangelogForPath(commit: string | undefined, pkgPath: string[], cwd?: string): Promise<string> {
        const { ConventionalChangelog } = await import('conventional-changelog');

        const generator = new ConventionalChangelog(cwd || process.cwd())
            .loadPreset(this.context.options.preset || defaults.preset)
            .readPackage()
            .readRepository()
            .commits({
                to: 'HEAD',
                path: pkgPath,
                ...(commit && { from: commit })
            })
            .context({ version: this.nextVersion })
            .options({ outputUnreleased: true });

        let content = '';
        for await (const chunk of generator.write()) {
            content += chunk;
        }

        return content;
    }

    private mergeChangelog(file: string, generated: string): string {
        const header = defaults.header;

        if (!fs.existsSync(file)) return header + generated;

        const content = fs.readFileSync(file, 'utf-8');

        if (content.startsWith(header)) {
            return `${header}${generated}\n${content.slice(header.length)}`;
        }

        const idx = content.indexOf('\n## [');
        if (idx !== -1) {
            return content.slice(0, idx + 1) + generated + '\n' + content.slice(idx + 1);
        }

        return header + generated + '\n' + content;
    }

    private async findVersionCommit(version: string | undefined, pkgPaths: string[], cwd?: string): Promise<string | undefined> {
        if (!version) return;

        const cmd = `git log --grep="${version}" --grep="release" --all-match --pretty=format:"%H" -- ${pkgPaths
            .map((p) => `"${p}"`)
            .join(' ')}`;

        return new Promise((resolve) => {
            exec(cmd, { cwd: cwd || process.cwd() }, (_, stdout) => {
                resolve(stdout.trim().split('\n')[0] || undefined);
            });
        });
    }
}
