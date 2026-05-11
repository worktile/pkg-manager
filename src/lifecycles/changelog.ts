/**
 * @license
 * Copyright Worktile Inc All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/worktile/pkg-manager/blob/master/LICENSE
 */
import { Lifecycle } from './lifecycle';
import { CommandContext, Package } from '../interface';
import conventionalChangelog from 'conventional-changelog';
import * as fs from 'fs';
import { defaults } from '../defaults';
import { exec } from 'child_process';
import path from 'path';

export class ChangelogLifecycle extends Lifecycle {
    currentVersion!: string;

    nextVersion!: string;

    readonly defaultInfile = defaults.infile;

    packages: Package[] = [];

    async run(context: CommandContext): Promise<void> {
        if (context.options.skip?.changelog || context.options?.packages?.length === 0) {
            return;
        }

        await this.runLifecycleHook('prechangelog', context.options, this.getLifecycleHookParams(context));

        this.currentVersion = context.versions.current;
        this.nextVersion = context.versions.next;
        this.packages = context.options?.packages || [];

        const { options } = context;
        const projectRoot = options.cwd || process.cwd();

        if (this.packages.length > 0) {
            for (const pkg of this.packages) {
                if (pkg.infile !== '') {
                    await this.generateChangelog(
                        this.resolveFilePath(pkg.infile, this.resolveFilePath(pkg.path, projectRoot)),
                        [pkg.path],
                        projectRoot
                    );
                }
            }

            if (options.infile !== '') {
                await this.generateChangelog(
                    this.resolveFilePath(options.infile as string, projectRoot),
                    this.packages.map((pkg) => pkg.path),
                    projectRoot
                );
            }
        }

        await this.runLifecycleHook('postchangelog', context.options, this.getLifecycleHookParams(context));
    }

    private async generateChangelog(infilePath: string, pkgPaths: string[], cwd?: string): Promise<void> {
        this.logger.info(`Generating changelog at ${infilePath}: ${this.currentVersion} -> ${this.nextVersion}`);
        const commitWithVersion = await this.findVersionCommit(this.currentVersion, pkgPaths, cwd);
        const generated = await this.buildChangelogContent(commitWithVersion, pkgPaths);

        if (!generated.trim()) {
            this.logger.warn(`No changelog content generated for ${pkgPaths.join(', ')}`);
            return;
        }

        fs.writeFileSync(infilePath, this.mergeChangelog(infilePath, generated));
    }

    private async buildChangelogContent(commitWithVersion: string | undefined, paths: string[]): Promise<string> {
        if (paths.length === 1) return this.getChangelogForPath(commitWithVersion, paths[0]);
        const contents = await Promise.all(paths.map((path) => this.getChangelogForPath(commitWithVersion, path)));
        return this.mergeChangelogContents(contents);
    }

    private async getChangelogForPath(commitWithVersion: string | undefined, path: string): Promise<string> {
        const gitOptions: any = {
            merges: null,
            showSignature: false,
            to: 'HEAD',
            path
        };

        if (commitWithVersion) {
            gitOptions.from = commitWithVersion;
        }
        const changelogStream = conventionalChangelog(
            { preset: 'angular', releaseCount: 1, outputUnreleased: true },
            { version: this.nextVersion },
            {
                ...gitOptions
            }
        );
        return this.streamToString(changelogStream);
    }

    private mergeChangelogContents(contents: string[]): string {
        const sections = new Map<string, Set<string>>();
        let versionHeader = '';

        for (const content of contents) {
            let currentSection = '';

            for (const line of content.split('\n')) {
                const trimmed = line.trimRight();
                if (!trimmed) continue;

                if (trimmed.startsWith('## ') && !versionHeader) {
                    versionHeader = trimmed;
                } else if (trimmed.startsWith('### ')) {
                    currentSection = trimmed;

                    if (!sections.has(currentSection)) {
                        sections.set(currentSection, new Set());
                    }
                } else if (currentSection) {
                    sections.get(currentSection)!.add(trimmed);
                }
            }
        }

        let result = versionHeader + '\n\n';
        for (const [section, items] of sections) {
            if (items.size) {
                result += `${section}\n\n${Array.from(items).join('\n')}\n\n`;
            }
        }
        return result.trim();
    }

    private mergeChangelog(changelogPath: string, generated: string): string {
        const header = '# Changelog\n\n' + 'All notable changes to this project will be documented in this file.\n\n';

        if (!fs.existsSync(changelogPath)) {
            return header + generated;
        }

        const old = fs.readFileSync(changelogPath, 'utf-8');

        if (old.startsWith(header)) {
            return header + generated + '\n' + old.substring(header.length);
        } else {
            return header + generated + '\n' + old;
        }
    }

    private streamToString(stream: any) {
        return new Promise<string>((resolve, reject) => {
            let data = '';

            stream.on('data', (chunk: any) => (data += chunk));

            stream.on('end', () => resolve(data));

            stream.on('error', reject);
        });
    }

    private async findVersionCommit(version: string | undefined, pkgPaths: string[], cwd?: string): Promise<string | undefined> {
        if (!version) return undefined;
        const cmd = `git log --grep="${version}" --grep="release" --all-match --pretty=format:"%H" -- ${pkgPaths
            .map((p) => `"${p}"`)
            .join(' ')}`;
        return new Promise<string | undefined>((resolve) => {
            exec(cmd, { cwd: cwd || process.cwd() }, (error, stdout) => {
                if (error) return resolve(undefined);
                const lines = stdout.trim().split('\n');
                resolve(lines.length > 0 ? lines[0].split(' ')[0] : undefined);
            });
        });
    }

    private resolveFilePath(file: string, basePath: string): string {
        return path.isAbsolute(file) ? file : path.resolve(basePath, file);
    }
}
