/**
 * @license
 * Copyright Worktile Inc All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/worktile/pkg-manager/blob/master/LICENSE
 */

import { Lifecycle } from './lifecycle';
import { CommandContext, Package, BumpFile } from '../interface';
import chalk from 'chalk';
import { resolveFilePath } from '../utils';
import fs from 'fs/promises';
import { JsonUpdater, PlainTextUpdater, TypeScriptUpdater, VersionUpdater } from '../updaters';

export class BumpLifecycle extends Lifecycle {
    nextVersion!: string;

    packages: Package[] = [];

    async run(context: CommandContext): Promise<void> {
        await this.runLifecycleHook('prebump', context.options, this.getLifecycleHookParams(context));
        this.nextVersion = context.versions.next;
        this.packages = context.options?.packages || [];

        const cwd = context.options?.cwd || process.cwd();

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
     * 收集所有 bumpFiles：root + packages
     */
    private collectAllBumpFiles(context: CommandContext, cwd: string): BumpFile[] {
        const options = context.options || {};
        const files: BumpFile[] = [];

        files.push(...this.normalizeBumpFiles(options.bumpFiles, cwd));

        if (!this.packages.length) return files;

        for (const pkg of this.packages) {
            const pkgRoot = resolveFilePath(pkg.path, cwd);
            const bumpFiles = this.normalizeBumpFiles(pkg.bumpFiles || options.bumpFiles, pkgRoot);

            files.push(...bumpFiles);
        }

        return files;
    }

    /**
     * 标准化 bumpFiles 格式
     * 1. 字符串直接返回
     * 2. 对象根据 type 来判断，code 类型的需要添加 updater
     * 3. 其他情况添加处理后的 filename 字段
     */
    private normalizeBumpFiles(bumpFiles: any, basePath: string): BumpFile[] {
        if (!bumpFiles) return [];

        return bumpFiles.map((file: any): BumpFile => {
            if (typeof file === 'string') {
                return file;
            }
            if (file.type === 'code') {
                return {
                    filename: resolveFilePath(file.filename, basePath),
                    updater: require.resolve('../updaters/code-updater')
                };
            }
            return {
                ...file,
                filename: resolveFilePath(file.filename, basePath)
            };
        });
    }

    private getUpdater(type?: string, updaterPath?: string): VersionUpdater {
        if (updaterPath) {
            const mod = require(updaterPath);
            const customUpdater = mod.default || mod;

            return {
                async read(filename: string, contents: string): Promise<string> {
                    return customUpdater.readVersion(contents);
                },
                async write(filename: string, contents: string, newVersion: string): Promise<void | string> {
                    return customUpdater.writeVersion(contents, newVersion);
                }
            };
        }

        switch (type) {
            case 'plain-text':
                return new PlainTextUpdater();
            case 'ts':
                return new TypeScriptUpdater();
            default:
                return new JsonUpdater();
        }
    }

    /**
     * 更新文件版本号
     * bumpFile 是 string 默认 json updater
     * bumpFile 是对象 根据 type 和 updater 来更新
     */
    private async bumpFileVersion(bumpFile: BumpFile, nextVersion: string) {
        const filePath = typeof bumpFile === 'string' ? bumpFile : bumpFile.filename;

        const type = typeof bumpFile === 'string' ? 'json' : bumpFile?.type;

        const updaterPath = typeof bumpFile === 'string' ? undefined : bumpFile?.updater;

        let content: string;

        try {
            content = await fs.readFile(filePath, 'utf-8');
        } catch {
            this.logger.warn(chalk.yellow(`Skip (file not found): ${filePath}`));
            return;
        }

        const updater = this.getUpdater(type, updaterPath);

        const currentVersion = await updater.read(filePath, content);

        if (!currentVersion) {
            this.logger.warn(chalk.yellow(`Skip (no version): ${filePath}`));
            return;
        }

        const result = await updater.write(filePath, content, nextVersion);

        if (result !== undefined) {
            await fs.writeFile(filePath, result as string, 'utf-8');
        }
    }
}
