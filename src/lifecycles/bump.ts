import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import standardVersion from 'commit-and-tag-version';
import conventionalChangelog from 'conventional-changelog';

import { Lifecycle } from './lifecycle';
import { CommandContext } from '../interface';

export class BumpLifecycle extends Lifecycle {
    async run(context: CommandContext): Promise<void> {
        this.logger.info(`using standardVersion + conventionalChangelog (path filtered)`);

        await this.runLifecycleHook('prebump', context.options, this.getLifecycleHookParams(context));

        const repoRoot = (await context.git.revparse(['--show-toplevel'])).trim();

        const packagePath = context.options.cwd || process.cwd();

        const relativePath = path.relative(repoRoot, packagePath);

        const packageJsonPath = path.join(packagePath, 'package.json');

        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

        /**
         * 当前版本（上一个 release 版本）
         */
        const previousVersion = pkg.version;

        /**
         * 下一版本（外部已计算）
         */
        const nextVersion = context.versions.next;

        this.logger.info(`repoRoot: ${repoRoot}`);
        this.logger.info(`packagePath: ${packagePath}`);
        this.logger.info(`relativePath: ${relativePath}`);
        this.logger.info(`previousVersion: ${previousVersion}`);
        this.logger.info(`nextVersion: ${nextVersion}`);

        const previousCommit = this.findPreviousReleaseCommit(repoRoot, previousVersion, relativePath);

        this.logger.info(`previousCommit: ${previousCommit}`);

        /**
         * ② 两版本之间范围
         */
        const range = previousCommit ? `${previousCommit}..HEAD` : 'HEAD';

        this.logger.info(`git range: ${range}`);

        /**
         * ③ git 层 path 过滤 commit
         */
        const rawGitLog = execSync(`git log ${range} --pretty=format:%H%x00%s%x00%b%x00 -- ${relativePath}`, {
            cwd: repoRoot,
            shell: '/bin/bash',
            maxBuffer: 50 * 1024 * 1024
        })
            .toString('utf-8')
            .trim();

        /**
         * ④ conventionalChangelog 生成标准 changelog
         */
        const changelogStream = conventionalChangelog(
            {
                preset: 'angular',
                releaseCount: 0
            },
            {
                version: nextVersion
            },
            this.toStream(rawGitLog)
        );

        const generated = await this.streamToString(changelogStream);

        /**
         * ⑤ 写 CHANGELOG.md
         */
        const changelogPath = path.join(packagePath, 'CHANGELOG.md');

        const finalContent = this.mergeChangelog(changelogPath, generated);

        fs.writeFileSync(changelogPath, finalContent);

        /**
         * ⑥ 使用 standardVersion：
         * - bump version
         * - git add
         * - git commit
         *
         * changelog 已手动生成
         */
        await standardVersion({
            ...context.options,
            releaseAs: nextVersion,
            skip: {
                ...(context.options.skip || {}),
                changelog: true
            }
        });

        await this.runLifecycleHook('postbump', context.options, this.getLifecycleHookParams(context));
    }

    private findPreviousReleaseCommit(repoRoot: string, previousVersion: string, relativePath: string): string {
        const gitLogCommand =
            `git log --grep="${previousVersion}" --oneline -- ` + `${relativePath}/package.json | head -1 | cut -d' ' -f1`;

        this.logger.info(`Running git command: ${gitLogCommand}`);

        try {
            const previousCommit = execSync(gitLogCommand, {
                cwd: repoRoot.trim(),
                shell: '/bin/bash'
            })
                .toString('utf-8')
                .trim();

            this.logger.info(`Previous commit: ${previousCommit}`);

            return previousCommit;
        } catch {
            return '';
        }
    }

    /**
     * changelog 插到顶部
     */
    private mergeChangelog(changelogPath: string, generated: string): string {
        const header = '# Changelog\n\n' + 'All notable changes to this project will be documented in this file.\n\n';

        if (!fs.existsSync(changelogPath)) {
            return header + generated;
        }

        const old = fs.readFileSync(changelogPath, 'utf-8');

        if (old.startsWith('# Changelog')) {
            const body = old.replace(/^# Changelog\s*/m, '# Changelog\n\n');

            return body + '\n' + generated;
        }

        return header + generated + '\n' + old;
    }

    private toStream(raw: string) {
        const { Readable } = require('stream');
        return Readable.from(raw);
    }

    private streamToString(stream: any) {
        return new Promise<string>((resolve, reject) => {
            let data = '';

            stream.on('data', (chunk: any) => (data += chunk));

            stream.on('end', () => resolve(data));

            stream.on('error', reject);
        });
    }
}

// import path from 'path';
// import fs from 'fs';
// import { execSync } from 'child_process';
// import conventionalChangelog from 'conventional-changelog';
// import { Lifecycle } from './lifecycle';
// import { CommandContext } from '../interface';

// export class BumpLifecycle extends Lifecycle {
//     async run(context: CommandContext) {
//         const repoRoot = (await context.git.revparse(['--show-toplevel'])).trim();

//         const packagePath = context.options.cwd || process.cwd();

//         const relativePath = path.relative(repoRoot, packagePath);

//         const pkg = JSON.parse(fs.readFileSync(path.join(packagePath, 'package.json'), 'utf-8'));

//         const nextVersion = context.versions.next;

//         const previousVersion = context.versions.current;

//         /**
//          * ① 找上一条 release commit
//          */
//         const fromCommit = this.findPreviousReleaseCommit(repoRoot, previousVersion);
//         this.logger.info(`fromCommit: ${fromCommit}`);

//         /**
//          * 这里才是真正的 range 使用点
//          */
//         const gitRange = fromCommit ? `${fromCommit}..HEAD` : 'HEAD';

//         this.logger.info(`gitRange: ${gitRange}`);

//         /**
//          * ② ⭐关键：range + path 在 git 层过滤
//          */
//         const gitLog = execSync(`git log ${gitRange} --pretty=format:%H%x00%s%x00%b%x00 -- ${relativePath}`, {
//             cwd: repoRoot,
//             maxBuffer: 50 * 1024 * 1024
//         }).toString();

//         /**
//          * ③ feed 给 conventional-changelog
//          */
//         const stream = conventionalChangelog(
//             {
//                 preset: 'angular',
//                 releaseCount: 0
//             },
//             {
//                 version: nextVersion
//             },
//             this.toStream(gitLog)
//         );

//         const changelog = await this.streamToString(stream);

//         /**
//          * ④ 写 changelog
//          */
//         const changelogPath = path.join(packagePath, 'CHANGELOG.md');

//         fs.writeFileSync(changelogPath, `# Changelog\n\n## ${nextVersion}\n\n${changelog}\n`);

//         /**
//          * ⑤ bump version
//          */
//         pkg.version = nextVersion;

//         fs.writeFileSync(path.join(packagePath, 'package.json'), JSON.stringify(pkg, null, 2));

//         /**
//          * ⑥ commit（保证 main / release 有 diff）
//          */
//         await context.git.add(['package.json', 'CHANGELOG.md']);

//         await context.git.commit(context.options.releaseCommitMessageFormat || `build: release ${pkg.name} to ${nextVersion}`);

//         await this.runLifecycleHook('postbump', context.options, this.getLifecycleHookParams(context));
//     }

//     /**
//      * 找上一条 release commit
//      */
//     private findPreviousReleaseCommit(repoRoot: string, previousVersion: string): string {
//         this.logger.info(`repoRoot: ${repoRoot}`);
//         this.logger.info(`previousVersion: ${previousVersion}`);
//         try {
//             const out = execSync(`git log --grep="${previousVersion}" --oneline`, { cwd: repoRoot }).toString().trim().split('\n');

//             this.logger.info(`out: ${out}`);
//             this.logger.info(`out[1]: ${out[1]}`);
//             this.logger.info(`out[1]?.split(' ')[0]: ${out[1]?.split(' ')[0]}`);
//             debugger;

//             return out[1]?.split(' ')[0] || '';
//         } catch {
//             return '';
//         }
//     }

//     private toStream(raw: string) {
//         const { Readable } = require('stream');
//         return Readable.from(raw);
//     }

//     private streamToString(stream: any) {
//         return new Promise<string>((resolve, reject) => {
//             let data = '';
//             stream.on('data', (c: any) => (data += c));
//             stream.on('end', () => resolve(data));
//             stream.on('error', reject);
//         });
//     }
// }

// import path from 'path';
// import { execSync } from 'child_process';
// import standardVersion from 'commit-and-tag-version';
// import { Lifecycle } from './lifecycle';
// import { CommandContext } from '../interface';

// export class BumpLifecycle extends Lifecycle {
//     async run(context: CommandContext): Promise<void> {
//         this.logger.info(`using commit-and-tag-version + path filtered changelog`);

//         await this.runLifecycleHook('prebump', context.options, this.getLifecycleHookParams(context));

//         const repoRoot = (await context.git.revparse(['--show-toplevel'])).trim();

//         const packagePath = context.options.cwd || process.cwd();

//         const relativePath = path.relative(repoRoot, packagePath);

//         this.logger.info(`repoRoot: ${repoRoot}`);
//         this.logger.info(`packagePath: ${packagePath}`);
//         this.logger.info(`relativePath: ${relativePath}`);

//         /**
//          * 修复点 1：
//          * 使用 releaseCommitMessageFormat + previousVersion
//          * 精确找上一版 release commit
//          */
//         const commits = this.getPathCommits(context, repoRoot, relativePath, packagePath);

//         /**
//          * 修复点 2：
//          * commit 自动带 github/gitlab url
//          */
//         this.writeChangelog(repoRoot, packagePath, context.versions.next, commits);

//         await context.git.add(['CHANGELOG.md']);

//         await standardVersion({
//             ...context.options,
//             releaseAs: context.versions.next,
//             skip: {
//                 ...(context.options.skip || {}),
//                 changelog: true,
//                 tag: true
//             }
//         });

//         await this.runLifecycleHook('postbump', context.options, this.getLifecycleHookParams(context));
//     }

//     /**
//      * 修复点 1：过滤条件
//      *
//      * 原来：
//      * git log --grep="release"
//      *
//      * 改成：
//      * releaseCommitMessageFormat + previousVersion
//      */
//     private getPathCommits(context: CommandContext, repoRoot: string, relativePath: string, packagePath: string): string[] {
//         let command = '';

//         try {
//             const pkg = this.readPackageJson(packagePath);
//             const previousVersion = pkg.version;

//             const releaseFormat = context.options.releaseCommitMessageFormat || 'chore(release): {{version}}';

//             const releaseMessage = releaseFormat.replace('{{version}}', previousVersion).replace('{{currentTag}}', previousVersion).trim();

//             const grepCmd = `git log --grep="${releaseMessage}" --oneline -1`;

//             this.logger.info(`find previous release: ${grepCmd}`);

//             const previousCommit = execSync(grepCmd, {
//                 cwd: repoRoot
//             })
//                 .toString()
//                 .trim()
//                 .split(' ')[0];

//             if (previousCommit) {
//                 command = `git log ${previousCommit}..HEAD --oneline -- ${relativePath}`;
//             }
//         } catch (e) {
//             this.logger.info(`previous release commit not found`);
//         }

//         if (!command) {
//             command = `git log --oneline -- ${relativePath}`;
//         }

//         this.logger.info(`git command: ${command}`);

//         try {
//             return execSync(command, {
//                 cwd: repoRoot
//             })
//                 .toString()
//                 .trim()
//                 .split('\n')
//                 .filter(Boolean);
//         } catch {
//             return [];
//         }
//     }

//     /**
//      * 修复点 2：commit url
//      */
//     private writeChangelog(repoRoot: string, packagePath: string, version: string, commits: string[]) {
//         const fs = require('fs');

//         const changelogPath = path.join(packagePath, 'CHANGELOG.md');

//         const repoUrl = this.getRepositoryUrl(repoRoot, packagePath);

//         let output = `## ${version} (${this.today()})\n\n`;

//         const feats: any[] = [];
//         const fixes: any[] = [];

//         for (const row of commits) {
//             const [hash, ...rest] = row.split(' ');
//             const msg = rest.join(' ');

//             if (msg.startsWith('feat')) {
//                 feats.push({ hash, msg });
//             } else if (msg.startsWith('fix')) {
//                 fixes.push({ hash, msg });
//             }
//         }

//         if (feats.length) {
//             output += `### Features\n\n`;

//             feats.forEach(({ hash, msg }) => {
//                 output += this.renderCommitLine(repoUrl, msg, hash);
//             });

//             output += `\n`;
//         }

//         if (fixes.length) {
//             output += `### Bug Fixes\n\n`;

//             fixes.forEach(({ hash, msg }) => {
//                 output += this.renderCommitLine(repoUrl, msg, hash);
//             });

//             output += `\n`;
//         }

//         if (!feats.length && !fixes.length) {
//             output += `### No changes\n\n`;
//         }

//         const header = '# Changelog\n\n';

//         if (!fs.existsSync(changelogPath)) {
//             fs.writeFileSync(changelogPath, header + output);
//             return;
//         }

//         const old = fs.readFileSync(changelogPath, 'utf-8');

//         const body = old.startsWith(header) ? old.slice(header.length) : old;

//         fs.writeFileSync(changelogPath, header + output + body);
//     }

//     private renderCommitLine(repoUrl: string, msg: string, hash: string): string {
//         const shortHash = hash.substring(0, 7);

//         if (!repoUrl) {
//             return `- ${msg} (${shortHash})\n`;
//         }

//         return `- ${msg} ([${shortHash}](${repoUrl}/commit/${hash}))\n`;
//     }

//     /**
//      * 优先 package.json repository
//      * fallback git remote origin
//      */
//     private getRepositoryUrl(repoRoot: string, packagePath: string): string {
//         try {
//             const pkg = this.readPackageJson(packagePath);

//             if (pkg.repository && pkg.repository.url) {
//                 return this.normalizeGitUrl(pkg.repository.url);
//             }
//         } catch {}

//         try {
//             const remote = execSync('git remote get-url origin', { cwd: repoRoot }).toString().trim();

//             return this.normalizeGitUrl(remote);
//         } catch {}

//         return '';
//     }

//     private normalizeGitUrl(url: string): string {
//         if (url.startsWith('git+https://')) {
//             return url.replace('git+https://', 'https://').replace('.git', '');
//         }

//         if (url.startsWith('https://')) {
//             return url.replace('.git', '');
//         }

//         if (url.startsWith('git@')) {
//             const m = url.match(/git@([^:]+):(.+)/);

//             if (m) {
//                 return `https://${m[1]}/${m[2].replace('.git', '')}`;
//             }
//         }

//         return url;
//     }

//     private readPackageJson(packagePath: string): any {
//         const fs = require('fs');

//         return JSON.parse(fs.readFileSync(path.join(packagePath, 'package.json'), 'utf-8'));
//     }

//     private today(): string {
//         return new Date().toISOString().split('T')[0];
//     }
// }

// /**
//  * @license
//  * Copyright Worktile Inc All Rights Reserved.
//  *
//  * Use of this source code is governed by an MIT-style license that can be
//  * found in the LICENSE file at https://github.com/worktile/pkg-manager/blob/master/LICENSE
//  */

// import { Lifecycle } from './lifecycle';
// import { CommandContext } from '../interface';
// import path from 'path';
// import { execSync } from 'child_process';

// export class BumpLifecycle extends Lifecycle {
//     async run(context: CommandContext): Promise<void> {
//         this.logger.info(`using manual version bumping and changelog generation`);
//         this.logger.info(`Context options: ${JSON.stringify(context.options)}`);
//         await this.runLifecycleHook('prebump', context.options, this.getLifecycleHookParams(context));

//         // Calculate relative path from repository root to package directory
//         const repoRoot = await context.git.revparse(['--show-toplevel']);
//         const packagePath = context.options.cwd || process.cwd();
//         const relativePath = path.relative(repoRoot.trim(), packagePath);

//         this.logger.info(`Repository root: ${repoRoot.trim()}`);
//         this.logger.info(`Package path: ${packagePath}`);
//         this.logger.info(`Relative path: ${relativePath}`);

//         // 1. Read package.json and get previous version
//         const fs = require('fs');
//         const packageJsonPath = path.join(packagePath, 'package.json');
//         const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
//         const previousVersion = packageJson.version;
//         this.logger.info(`Previous version: ${previousVersion}`);

//         // 2. Bump version manually
//         packageJson.version = context.versions.next;
//         fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
//         this.logger.info(`Version bumped to ${context.versions.next}`);

//         // 3. Generate changelog manually using git log with path filter
//         this.logger.info(`generating changelog for path: ${relativePath}`);

//         // Get the commit hash for the previous version
//         let previousCommit = '';
//         try {
//             // Try to find the previous release commit by searching for commits that modified package.json
//             // and contain the previous version number
//             const gitLogCommand = `git log --grep="${previousVersion}" --oneline -- ${relativePath}/package.json | head -1 | cut -d' ' -f1`;
//             this.logger.info(`Running git command: ${gitLogCommand}`);
//             previousCommit = execSync(gitLogCommand, { cwd: repoRoot.trim() }).toString('utf-8').trim();
//             this.logger.info(`Previous commit: ${previousCommit}`);
//         } catch (error) {
//             this.logger.info(`No previous release commit found, using all commits`);
//         }

//         // Get commits that touch the specified path since the previous version
//         let gitLogCommand = '';
//         if (previousCommit) {
//             gitLogCommand = `git log ${previousCommit}..HEAD --oneline -- ${relativePath}`;
//         } else {
//             gitLogCommand = `git log --oneline -- ${relativePath}`;
//         }
//         this.logger.info(`Running git command: ${gitLogCommand}`);
//         const commits = execSync(gitLogCommand, { cwd: repoRoot.trim() }).toString('utf-8').trim().split('\n');
//         this.logger.info(`Commits found: ${JSON.stringify(commits)}`);

//         // Generate changelog content
//         let changelogContent = `# Changelog\n\n`;
//         changelogContent += `## ${context.versions.next} (${new Date().toISOString().split('T')[0]})\n\n`;

//         if (commits.length > 0 && commits[0] !== '') {
//             // Separate commits into features and bug fixes
//             const features = [];
//             const bugFixes = [];

//             for (const commit of commits) {
//                 const [hash, ...messageParts] = commit.split(' ');
//                 const message = messageParts.join(' ');

//                 if (message.startsWith('feat(') || message.startsWith('feat:')) {
//                     features.push({ hash, message });
//                 } else if (message.startsWith('fix(') || message.startsWith('fix:')) {
//                     bugFixes.push({ hash, message });
//                 }
//             }

//             // Add features section
//             if (features.length > 0) {
//                 changelogContent += `### Features\n\n`;
//                 for (const { hash, message } of features) {
//                     changelogContent += `* ${message} ${hash}\n`;
//                 }
//                 changelogContent += `\n`;
//             }

//             // Add bug fixes section
//             if (bugFixes.length > 0) {
//                 changelogContent += `### Bug Fixes\n\n`;
//                 for (const { hash, message } of bugFixes) {
//                     changelogContent += `* ${message} ${hash}\n`;
//                 }
//                 changelogContent += `\n`;
//             }

//             // If no features or bug fixes, add no changes section
//             if (features.length === 0 && bugFixes.length === 0) {
//                 changelogContent += `### No changes\n\n`;
//             }
//         } else {
//             changelogContent += `### No changes\n\n`;
//         }

//         this.logger.info(`Generated changelog: ${changelogContent}`);

//         // Write changelog to file
//         const changelogPath = path.join(packagePath, 'CHANGELOG.md');
//         if (fs.existsSync(changelogPath)) {
//             // Read existing changelog
//             const existingChangelog = fs.readFileSync(changelogPath, 'utf-8');
//             // Insert new changelog at the beginning, after the header
//             const headerEndIndex = existingChangelog.indexOf('\n\n');
//             if (headerEndIndex !== -1) {
//                 changelogContent =
//                     existingChangelog.substring(0, headerEndIndex + 2) + changelogContent + existingChangelog.substring(headerEndIndex + 2);
//             }
//         }
//         fs.writeFileSync(changelogPath, changelogContent);
//         this.logger.info(`Changelog written to ${changelogPath}`);

//         // 3. Git commit
//         // Since we're already in the package directory, we don't need to include the relative path
//         await context.git.add(['package.json', 'CHANGELOG.md']);

//         // Generate commit message using releaseCommitMessageFormat
//         let commitMessage = context.options.releaseCommitMessageFormat || 'chore(release): {{version}}';
//         commitMessage = commitMessage.replace('{{version}}', context.versions.next);
//         commitMessage = commitMessage.replace('{{currentTag}}', context.versions.next);

//         await context.git.commit(commitMessage);
//         this.logger.info(`Git commit done with message: ${commitMessage}`);

//         await this.runLifecycleHook('postbump', context.options, this.getLifecycleHookParams(context));
//     }
// }
