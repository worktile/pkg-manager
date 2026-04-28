/**
 * @license
 * Copyright Worktile Inc All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/worktile/pkg-manager/blob/master/LICENSE
 */

import { Lifecycle } from './lifecycle';
import { CommandContext } from '../interface';
import path from 'path';
import { execSync } from 'child_process';

export class BumpLifecycle extends Lifecycle {
    async run(context: CommandContext): Promise<void> {
        this.logger.info(`using manual version bumping and changelog generation`);
        this.logger.info(`Context options: ${JSON.stringify(context.options)}`);
        await this.runLifecycleHook('prebump', context.options, this.getLifecycleHookParams(context));

        // Calculate relative path from repository root to package directory
        const repoRoot = await context.git.revparse(['--show-toplevel']);
        const packagePath = context.options.cwd || process.cwd();
        const relativePath = path.relative(repoRoot.trim(), packagePath);

        this.logger.info(`Repository root: ${repoRoot.trim()}`);
        this.logger.info(`Package path: ${packagePath}`);
        this.logger.info(`Relative path: ${relativePath}`);

        // 1. Read package.json and get previous version
        const fs = require('fs');
        const packageJsonPath = path.join(packagePath, 'package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        const previousVersion = packageJson.version;
        this.logger.info(`Previous version: ${previousVersion}`);

        // 2. Bump version manually
        packageJson.version = context.versions.next;
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
        this.logger.info(`Version bumped to ${context.versions.next}`);

        // 3. Generate changelog manually using git log with path filter
        this.logger.info(`generating changelog for path: ${relativePath}`);

        // Get the commit hash for the previous version
        let previousCommit = '';
        try {
            // Try to find the previous release commit by searching for commits that modified package.json
            // and contain the previous version number
            const gitLogCommand = `git log --grep="${previousVersion}" --oneline -- ${relativePath}/package.json | head -1 | cut -d' ' -f1`;
            this.logger.info(`Running git command: ${gitLogCommand}`);
            previousCommit = execSync(gitLogCommand, { cwd: repoRoot.trim() }).toString('utf-8').trim();
            this.logger.info(`Previous commit: ${previousCommit}`);
        } catch (error) {
            this.logger.info(`No previous release commit found, using all commits`);
        }

        // Get commits that touch the specified path since the previous version
        let gitLogCommand = '';
        if (previousCommit) {
            gitLogCommand = `git log ${previousCommit}..HEAD --oneline -- ${relativePath}`;
        } else {
            gitLogCommand = `git log --oneline -- ${relativePath}`;
        }
        this.logger.info(`Running git command: ${gitLogCommand}`);
        const commits = execSync(gitLogCommand, { cwd: repoRoot.trim() }).toString('utf-8').trim().split('\n');
        this.logger.info(`Commits found: ${JSON.stringify(commits)}`);

        // Generate changelog content
        let changelogContent = `# Changelog\n\n`;
        changelogContent += `## ${context.versions.next} (${new Date().toISOString().split('T')[0]})\n\n`;

        if (commits.length > 0 && commits[0] !== '') {
            // Separate commits into features and bug fixes
            const features = [];
            const bugFixes = [];

            for (const commit of commits) {
                const [hash, ...messageParts] = commit.split(' ');
                const message = messageParts.join(' ');

                if (message.startsWith('feat(') || message.startsWith('feat:')) {
                    features.push({ hash, message });
                } else if (message.startsWith('fix(') || message.startsWith('fix:')) {
                    bugFixes.push({ hash, message });
                }
            }

            // Add features section
            if (features.length > 0) {
                changelogContent += `### Features\n\n`;
                for (const { hash, message } of features) {
                    changelogContent += `* ${message} ${hash}\n`;
                }
                changelogContent += `\n`;
            }

            // Add bug fixes section
            if (bugFixes.length > 0) {
                changelogContent += `### Bug Fixes\n\n`;
                for (const { hash, message } of bugFixes) {
                    changelogContent += `* ${message} ${hash}\n`;
                }
                changelogContent += `\n`;
            }

            // If no features or bug fixes, add no changes section
            if (features.length === 0 && bugFixes.length === 0) {
                changelogContent += `### No changes\n\n`;
            }
        } else {
            changelogContent += `### No changes\n\n`;
        }

        this.logger.info(`Generated changelog: ${changelogContent}`);

        // Write changelog to file
        const changelogPath = path.join(packagePath, 'CHANGELOG.md');
        if (fs.existsSync(changelogPath)) {
            // Read existing changelog
            const existingChangelog = fs.readFileSync(changelogPath, 'utf-8');
            // Insert new changelog at the beginning, after the header
            const headerEndIndex = existingChangelog.indexOf('\n\n');
            if (headerEndIndex !== -1) {
                changelogContent =
                    existingChangelog.substring(0, headerEndIndex + 2) + changelogContent + existingChangelog.substring(headerEndIndex + 2);
            }
        }
        fs.writeFileSync(changelogPath, changelogContent);
        this.logger.info(`Changelog written to ${changelogPath}`);

        // 3. Git commit
        // Since we're already in the package directory, we don't need to include the relative path
        await context.git.add(['package.json', 'CHANGELOG.md']);

        // Generate commit message using releaseCommitMessageFormat
        let commitMessage = context.options.releaseCommitMessageFormat || 'chore(release): {{version}}';
        commitMessage = commitMessage.replace('{{version}}', context.versions.next);
        commitMessage = commitMessage.replace('{{currentTag}}', context.versions.next);

        await context.git.commit(commitMessage);
        this.logger.info(`Git commit done with message: ${commitMessage}`);

        await this.runLifecycleHook('postbump', context.options, this.getLifecycleHookParams(context));
    }
}
