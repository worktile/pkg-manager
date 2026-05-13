/**
 * @license
 * Copyright Worktile Inc All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/worktile/pkg-manager/blob/master/LICENSE
 */

import { Lifecycle } from './lifecycle';
import { CommandContext, Package } from '../interface';
import chalk from 'chalk';
import { resolveFilePath } from '../utils';
import fs from 'fs/promises';

export class BumpLifecycle extends Lifecycle {
    nextVersion!: string;

    packages: Package[] = [];

    async run(context: CommandContext): Promise<void> {
        await this.runLifecycleHook('prebump', context.options, this.getLifecycleHookParams(context));
        this.nextVersion = context.versions.next;
        this.packages = context.options?.packages || [];

        const cwd = context.options?.cwd || process.cwd();

        // 收集所有要 bump 的文件（root + packages）
        const allFiles = this.collectAllBumpFiles(context, cwd);

        if (context.options?.dryRun) {
            this.logger.info('[dry-run]', allFiles);
            return;
        }

        for (const file of allFiles) {
            await this.bumpFileVersion(file, this.nextVersion);
        }

        await this.runLifecycleHook('postbump', context.options, this.getLifecycleHookParams(context));
    }

    /**
     * 统一收集所有 bumpFiles
     */
    private collectAllBumpFiles(context: CommandContext, cwd: string): string[] {
        const options = context.options || {};
        const files: string[] = [];

        // root bumpFiles
        files.push(...this.normalizeBumpFiles(options.bumpFiles, cwd));

        // packages bumpFiles（如果存在）
        if (this.packages.length > 0) {
            for (const pkg of this.packages) {
                const pkgRoot = resolveFilePath(pkg.path, cwd);
                const bumpFiles = this.normalizeBumpFiles(pkg.bumpFiles || options.bumpFiles, pkgRoot);

                files.push(...bumpFiles);
            }
        }

        return files;
    }

    private normalizeBumpFiles(bumpFiles: any, basePath: string): string[] {
        if (!bumpFiles) return [];

        return bumpFiles.map((file: any) =>
            typeof file === 'string' ? resolveFilePath(file, basePath) : resolveFilePath(file.filename, basePath)
        );
    }

    private async bumpFileVersion(filePath: string, nextVersion: string) {
        const content = await fs.readFile(filePath, 'utf-8').catch(() => {
            throw new Error(`Cannot read file: ${filePath}`);
        });

        const json = JSON.parse(content);
        if (!json?.version) {
            console.warn(chalk.yellow(`Skip (no version): ${filePath}`));
            return;
        }

        json.version = nextVersion;

        await fs.writeFile(filePath, JSON.stringify(json, null, 2) + '\n', 'utf-8');
    }
}
